import hmac
import hashlib
import json
import pytest
from starlette.testclient import TestClient

from app.main import app
from app.config import settings
from app.database import CANONICAL_ORDERS

client = TestClient(app)

@pytest.fixture(autouse=True, scope="module")
def clean_orders_state():
    CANONICAL_ORDERS.clear()

def test_health_check():
    """Verify health and 19/19 security checklist posture."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["architecture"] == "Python FastAPI Modular Architecture"
    assert data["security_posture"]["never_trust_frontend_prices"] is True
    assert data["security_posture"]["cors_locked"] is True

def test_menu_catalog():
    """Verify canonical menu items are returned with prices."""
    response = client.get("/api/menu")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["count"] >= 23
    assert any(item["name"] == "Mysore Masala Dosa" for item in data["items"])

def test_staff_login_and_auth_flow():
    """Verify admin login generates valid JWT and grants access to protected routes."""
    # 1. Invalid login
    res_bad = client.post("/api/auth/login", json={"username": "admin", "password": "wrongpassword"})
    assert res_bad.status_code == 401

    # 2. Valid login
    res_ok = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res_ok.status_code == 200
    data = res_ok.json()
    assert "token" in data
    assert data["user"]["role"] == "Admin"
    token = data["token"]

    # 3. Access protected route with Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    res_me = client.get("/api/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["username"] == "admin"

    # 4. Access audit logs (Admin only)
    res_audit = client.get("/api/audit-logs", headers=headers)
    assert res_audit.status_code == 200
    assert "logs" in res_audit.json()

def test_table_creation_with_qr():
    """Verify adding table with dynamic QR code generation."""
    # Login as admin
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add Table T99
    new_table_payload = {"number": "T99", "capacity": 6, "zone": "Patio Garden"}
    res = client.post("/api/tables", json=new_table_payload, headers=headers)
    assert res.status_code == 201
    tbl = res.json()
    assert tbl["number"] == "T99"
    assert tbl["capacity"] == 6
    assert "qr_url" in tbl
    assert "?table=T99" in tbl["qr_url"]

    # Test QR metadata route
    qr_res = client.get("/api/qr/T99")
    assert qr_res.status_code == 200
    assert qr_res.json()["table_number"] == "T99"

    # Test QR PNG generation route
    qr_img = client.get("/api/qr/T99/image")
    assert qr_img.status_code == 200
    assert qr_img.headers["content-type"] == "image/png"
    assert len(qr_img.content) > 100

def test_guest_order_authoritative_pricing():
    """
    Test Never Trust Frontend rule:
    Submits order without price fields. Server must authoritatively
    calculate subtotal, 5% GST, and verify discount coupon.
    """
    payload = {
        "table_number": "T05",
        "customer_name": "Test Guest",
        "items": [
            {"id": "item_atmiya_01", "qty": 2},  # Mysore Masala: 130 * 2 = 260
            {"id": "item_atmiya_22", "qty": 1}   # Cold Drink: 40 * 1 = 40
        ],
        "coupon_code": "WELCOME50",  # Flat 50 off on orders >= 250
        "payment_mode": "UPI"
    }

    res = client.post("/api/orders/guest", json=payload)
    assert res.status_code == 201
    order = res.json()
    
    # Subtotal: 260 + 40 = 300
    assert order["subtotal"] == 300.0
    # Discount: 50
    assert order["discount"] == 50.0
    # Taxable: 250, GST 5%: 12.50
    assert order["tax"] == 12.5
    # Total: 250 + 12.50 = 262.50
    assert order["total_amount"] == 262.5
    assert order["table_number"] == "T05"

def test_guest_order_addon_merging_into_existing_bill():
    """
    Verify that when items are added after an order has already been placed,
    they merge directly into the existing running bill for that table,
    recalculating cumulative total without creating a duplicate order or amount conflict.
    """
    initial_order_id = CANONICAL_ORDERS[0]["id"] if CANONICAL_ORDERS else None

    addon_payload = {
        "table_number": "T05",
        "customer_name": "Test Guest",
        "items": [
            {"id": "item_atmiya_02", "qty": 1}  # Paneer Mysore: 150 * 1 = 150
        ],
        "is_addon": True,
        "payment_mode": "Cash"
    }

    res = client.post("/api/orders/guest", json=addon_payload)
    assert res.status_code == 201
    merged = res.json()

    # Must preserve the same existing bill ID!
    if initial_order_id:
        assert merged["id"] == initial_order_id

    # Previous subtotal 300 + 150 = 450
    assert merged["subtotal"] == 450.0
    # Discount remains 50
    assert merged["discount"] == 50.0
    # Taxable: 400, 5% GST = 20.0
    assert merged["tax"] == 20.0
    # Total: 420.0
    assert merged["total_amount"] == 420.0
    # Items now include all 3 items
    assert len(merged["items"]) == 3

def test_service_calls_flow():
    """Verify guest table assistance requests."""
    # Place service call for waiter
    res_call = client.post("/api/service-calls", json={"table_number": "T03", "request_type": "water"})
    assert res_call.status_code == 201
    call_id = res_call.json()["id"]

    # Login to view and resolve
    login_res = client.post("/api/auth/login", json={"username": "waiter", "password": "admin123"})
    headers = {"Authorization": f"Bearer {login_res.json()['token']}"}

    # Resolve call
    res_res = client.put(f"/api/service-calls/{call_id}/resolve", headers=headers)
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "resolved"

def test_petpooja_webhook_hmac():
    """Verify Petpooja webhook rejects forged payload and accepts valid HMAC signature."""
    payload = json.dumps({"order_id": "PP_99182", "amount": 450}).encode("utf-8")

    # 1. Missing signature -> 401
    res_no_sig = client.post("/api/webhooks/petpooja", content=payload)
    assert res_no_sig.status_code == 401

    # 2. Forged signature -> 403
    res_bad_sig = client.post("/api/webhooks/petpooja", content=payload, headers={"x-petpooja-signature": "invalid_sig"})
    assert res_bad_sig.status_code == 403

    # 3. Valid HMAC signature -> 200
    valid_sig = hmac.new(settings.PETPOOJA_WEBHOOK_SECRET.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    res_ok = client.post("/api/webhooks/petpooja", content=payload, headers={"x-petpooja-signature": valid_sig})
    assert res_ok.status_code == 200
    assert res_ok.json()["success"] is True

def test_auth_by_email_and_owner_security():
    """Verify login with email, PIN, and primary admin security enforcement."""
    # 1. Login with primary owner email
    res_owner = client.post("/api/auth/login", json={
        "username": "ranadarshit99@gmail.com",
        "password": "admin2026",
        "role": "admin"
    })
    assert res_owner.status_code == 200
    data = res_owner.json()
    assert data["user"]["is_primary_owner"] is True
    assert data["user"]["role"] == "Admin"
    token = data["token"]

    # 2. Verify token endpoint
    res_verify = client.get("/api/auth/verify", headers={"Authorization": f"Bearer {token}"})
    assert res_verify.status_code == 200
    assert res_verify.json()["valid"] is True

    # 3. Security test: Non-owner cannot claim Admin role
    res_fake_admin = client.post("/api/auth/login", json={
        "username": "waiter@atmiyadosa.com",
        "password": "waiter123",
        "role": "admin"
    })
    assert res_fake_admin.status_code == 403

def test_payment_intent_and_verification():
    """Verify dynamic UPI payment intent and server-side payment verification."""
    # 1. Create UPI Payment Intent
    intent_payload = {
        "amount": 315.0,
        "table_number": "T04",
        "order_id": "#ORD1048",
        "customer_name": "Rahul Sharma"
    }
    res_intent = client.post("/api/payments/create-intent", json=intent_payload)
    assert res_intent.status_code == 200
    intent_data = res_intent.json()
    assert intent_data["success"] is True
    assert "upi://pay?" in intent_data["upi_intent_url"]
    assert "ranadarshit99@okicici" in intent_data["upi_intent_url"]
    assert "data:image/png;base64," in intent_data["qr_data_url"]
    ref_id = intent_data["payment_reference"]

    # 2. Verify payment
    verify_payload = {
        "payment_reference": ref_id,
        "table_number": "T04",
        "order_id": "#ORD1048",
        "method": "UPI",
        "transaction_id": "UPI-BANK-UTR-998822"
    }
    res_verify = client.post("/api/payments/verify", json=verify_payload)
    assert res_verify.status_code == 200
    assert res_verify.json()["verified"] is True
    assert res_verify.json()["payment_status"] == "PAID"

def test_table_bill_settle_and_session_termination():
    """Verify table bill settlement and automatic session termination."""
    # Login as admin to obtain token
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Settle Table T04
    settle_payload = {
        "payment_method": "Cash",
        "amount_collected": 315.0,
        "change_due": 0.0,
        "settled_by": "Darshit Rana"
    }
    res_settle = client.post("/api/tables/T04/settle", json=settle_payload, headers=headers)
    assert res_settle.status_code == 200
    data = res_settle.json()
    assert data["success"] is True
    assert data["table_number"] == "T04"
    assert data["session_terminated"] is True
    assert data["vacated"] is True
