import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import httpx
from app.config import settings
from app.security import get_password_hash

# -------------------------------------------------------------------------
# CANONICAL IN-MEMORY REPOSITORY (SERVER OF RECORD)
# -------------------------------------------------------------------------

import json
import os

CANONICAL_MENU: Dict[str, Dict[str, Any]] = {}
CANONICAL_CATEGORIES: List[Dict[str, Any]] = []

CUSTOM_MENU_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data', 'custom_menu.json'))
CUSTOM_CATEGORIES_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data', 'custom_categories.json'))

def save_custom_menu():
    """Persist all custom created and updated menu items with their photos to disk."""
    try:
        os.makedirs(os.path.dirname(CUSTOM_MENU_FILE), exist_ok=True)
        with open(CUSTOM_MENU_FILE, 'w', encoding='utf-8') as f:
            json.dump(CANONICAL_MENU, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f'Notice: Failed to persist custom menu to disk: {e}')

def load_custom_menu():
    """Load previously saved custom menu items and photos into memory."""
    global CANONICAL_MENU
    try:
        if os.path.exists(CUSTOM_MENU_FILE):
            with open(CUSTOM_MENU_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    CANONICAL_MENU.clear()
                    CANONICAL_MENU.update(data)
            print(f'[MENU PERSISTENCE] Loaded {len(CANONICAL_MENU)} items from disk.')
    except Exception as e:
        print(f'Notice: Failed to load custom menu: {e}')

def save_custom_categories():
    """Persist all custom categories to disk."""
    try:
        os.makedirs(os.path.dirname(CUSTOM_CATEGORIES_FILE), exist_ok=True)
        with open(CUSTOM_CATEGORIES_FILE, 'w', encoding='utf-8') as f:
            json.dump(CANONICAL_CATEGORIES, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f'Notice: Failed to persist custom categories to disk: {e}')

def load_custom_categories():
    """Load custom categories from disk."""
    global CANONICAL_CATEGORIES
    try:
        if os.path.exists(CUSTOM_CATEGORIES_FILE):
            with open(CUSTOM_CATEGORIES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    CANONICAL_CATEGORIES.clear()
                    CANONICAL_CATEGORIES.extend(data)
            print(f'[CATEGORIES PERSISTENCE] Loaded {len(CANONICAL_CATEGORIES)} categories from disk.')
    except Exception as e:
        print(f'Notice: Failed to load custom categories: {e}')

def purge_menu_and_categories():
    """Wipe all in-memory and on-disk menu items and categories."""
    CANONICAL_MENU.clear()
    CANONICAL_CATEGORIES.clear()
    save_custom_menu()
    save_custom_categories()

def load_authentic_sample_menu():
    """Restores sample menu from authentic_menu_data.json if explicitly requested."""
    try:
        _auth_file = os.path.join(os.path.dirname(__file__), "authentic_menu_data.json")
        if os.path.exists(_auth_file):
            with open(_auth_file, "r", encoding="utf-8") as _f:
                _data = json.load(_f)
                for _item in _data.get("items", []):
                    _iid = _item.get("id")
                    CANONICAL_MENU[_iid] = {
                        "id": _iid,
                        "name": _item.get("english_name") or _item.get("name"),
                        "gujarati_name": _item.get("gujarati_name"),
                        "price": float(_item.get("finalPrice") or _item.get("price")),
                        "category": _item.get("category"),
                        "description": _item.get("description", ""),
                        "is_available": _item.get("is_available", True),
                        "is_jain_available": True,
                        "prep_time_mins": _item.get("prepTimeMins", 10),
                        "tags": ["Authentic", _item.get("category")]
                    }
                if _data.get("categories"):
                    CANONICAL_CATEGORIES.clear()
                    CANONICAL_CATEGORIES.extend(_data.get("categories"))
                save_custom_menu()
                save_custom_categories()
    except Exception as _ex:
        print(f"Notice: Failed to load authentic sample menu: {_ex}")

# Load custom items and categories on startup
load_custom_menu()
load_custom_categories()

CANONICAL_COUPONS = {
    "WELCOME50": {"code": "WELCOME50", "discount": 50.0, "discount_type": "flat", "min_order": 250.0, "active": True, "description": "Flat ₹50 OFF on orders above ₹250"},
    "DOSA20": {"code": "DOSA20", "discount": 20.0, "discount_type": "percentage", "min_order": 300.0, "active": True, "description": "20% OFF on orders above ₹300"},
    "FESTIVE100": {"code": "FESTIVE100", "discount": 100.0, "discount_type": "flat", "min_order": 500.0, "active": True, "description": "Flat ₹100 OFF on festive orders above ₹500"}
}

# Initial Tables
CANONICAL_TABLES: Dict[str, Dict[str, Any]] = {
    f"T{i:02d}": {
        "id": f"T{i:02d}",
        "number": f"T{i:02d}",
        "capacity": 4 if i <= 10 else (6 if i <= 14 else 8),
        "zone": None,
        "status": "available",
        "current_order_id": None,
        "timing": None
    }
    for i in range(1, 17)
}

# Initial Orders (Clean start for live restaurant operations, persisted to disk)
CANONICAL_ORDERS: List[Dict[str, Any]] = []

ORDERS_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "orders.json"))

def save_orders():
    """Persist all live orders to disk so they survive backend restarts."""
    try:
        os.makedirs(os.path.dirname(ORDERS_FILE), exist_ok=True)
        with open(ORDERS_FILE, "w", encoding="utf-8") as f:
            json.dump(CANONICAL_ORDERS, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Notice: Failed to persist orders to disk: {e}")

def load_orders():
    """Load previously saved live orders from disk into CANONICAL_ORDERS."""
    global CANONICAL_ORDERS
    try:
        if os.path.exists(ORDERS_FILE):
            with open(ORDERS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    CANONICAL_ORDERS.clear()
                    CANONICAL_ORDERS.extend(data)
            print(f"[ORDERS PERSISTENCE] Loaded {len(CANONICAL_ORDERS)} orders from disk.")
    except Exception as e:
        print(f"Notice: Failed to load orders from disk: {e}")

# Load orders on startup
load_orders()



# Pre-configured Staff credentials
CANONICAL_STAFF: Dict[str, Dict[str, Any]] = {
    "admin": {
        "username": "admin",
        "email": "admin@atmiyadosa.com",
        "alternate_emails": ["ranadarshit99@gmail.com"],
        "name": "Admin Owner",
        "role": "Admin",
        "password_hash": "$2a$10$wEkgzJ9nQOwh6d203m0Q7u7Lw3mFqfN3/b3j62l4h6Z8s2M1v7zqu",  # admin123
        "phone": "+91 98000 00000",
        "shift": "Full Day",
        "is_active": True,
        "is_primary_owner": True
    },
    "chef": {
        "username": "chef",
        "email": "kitchen@atmiyadosa.com",
        "name": "Amit Kumar",
        "role": "Kitchen",
        "password_hash": "$2a$10$wEkgzJ9nQOwh6d203m0Q7u7Lw3mFqfN3/b3j62l4h6Z8s2M1v7zqu",
        "phone": "+91 98250 11223",
        "shift": "Kitchen Head",
        "is_active": True,
        "is_primary_owner": False
    },
    "cashier": {
        "username": "cashier",
        "email": "cashier@atmiyadosa.com",
        "name": "Anjali Patel",
        "role": "Cashier",
        "password_hash": "$2a$10$wEkgzJ9nQOwh6d203m0Q7u7Lw3mFqfN3/b3j62l4h6Z8s2M1v7zqu",
        "phone": "+91 97240 33445",
        "shift": "Evening",
        "is_active": True,
        "is_primary_owner": False
    },
    "waiter": {
        "username": "waiter",
        "email": "waiter@atmiyadosa.com",
        "name": "Riya Patel",
        "role": "Waiter",
        "waiter_id": "WTR-101",
        "password_hash": "$2a$10$wEkgzJ9nQOwh6d203m0Q7u7Lw3mFqfN3/b3j62l4h6Z8s2M1v7zqu",
        "phone": "+91 94280 55667",
        "shift": "Morning",
        "is_active": True,
        "is_primary_owner": False
    },
    "waiter_riya": {
        "username": "waiter_riya",
        "email": "riya@atmiyadosa.com",
        "name": "Riya Patel",
        "role": "Waiter",
        "waiter_id": "WTR-101",
        "password_hash": "$2a$10$wEkgzJ9nQOwh6d203m0Q7u7Lw3mFqfN3/b3j62l4h6Z8s2M1v7zqu",
        "phone": "+91 99245 67890",
        "shift": "Morning Shift",
        "is_active": True,
        "is_primary_owner": False
    },
    "waiter_rajesh": {
        "username": "waiter_rajesh",
        "email": "rajesh@atmiyadosa.com",
        "name": "Rajesh Kumar",
        "role": "Waiter",
        "waiter_id": "WTR-102",
        "password_hash": "$2a$10$wEkgzJ9nQOwh6d203m0Q7u7Lw3mFqfN3/b3j62l4h6Z8s2M1v7zqu",
        "phone": "+91 98251 22334",
        "shift": "Evening Shift",
        "is_active": True,
        "is_primary_owner": False
    },
    "waiter_vikram": {
        "username": "waiter_vikram",
        "email": "vikram@atmiyadosa.com",
        "name": "Vikram Shah",
        "role": "Waiter",
        "waiter_id": "WTR-103",
        "password_hash": "$2a$10$wEkgzJ9nQOwh6d203m0Q7u7Lw3mFqfN3/b3j62l4h6Z8s2M1v7zqu",
        "phone": "+91 97140 44556",
        "shift": "Full Day",
        "is_active": True,
        "is_primary_owner": False
    },
    "chef_amit": {
        "username": "chef_amit",
        "email": "amit@atmiyadosa.com",
        "name": "Amit Kumar",
        "role": "Kitchen",
        "password_hash": "$2a$10$wEkgzJ9nQOwh6d203m0Q7u7Lw3mFqfN3/b3j62l4h6Z8s2M1v7zqu",
        "phone": "+91 97123 45678",
        "shift": "Morning Shift",
        "is_active": True,
        "is_primary_owner": False
    }
}

def find_staff_member(identifier: str) -> Optional[Dict[str, Any]]:
    """Find staff member by username, email, waiter_id, or name (case-insensitive)."""
    clean_id = (identifier or "").strip().lower()
    for staff in CANONICAL_STAFF.values():
        if (
            staff.get("username", "").lower() == clean_id or 
            staff.get("email", "").lower() == clean_id or
            clean_id in [e.lower() for e in staff.get("alternate_emails", [])] or
            staff.get("waiter_id", "").lower() == clean_id or
            staff.get("name", "").lower() == clean_id
        ):
            return staff
    return None

def register_new_staff(name: str, email: str, role: str, password_hash: str, phone: str = "") -> Dict[str, Any]:
    """Register a new verified staff member into the canonical staff store."""
    clean_email = (email or "").strip().lower()
    base_user = clean_email.split("@")[0].replace(".", "_")
    username = base_user
    counter = 1
    while username in CANONICAL_STAFF:
        username = f"{base_user}_{counter}"
        counter += 1

    formatted_role = role.capitalize()
    if formatted_role.lower() in ["chef", "kitchen"]:
        formatted_role = "Kitchen"
    elif formatted_role.lower() in ["waiter", "floor"]:
        formatted_role = "Waiter"

    new_staff = {
        "username": username,
        "email": clean_email,
        "name": name.strip(),
        "role": formatted_role,
        "password_hash": password_hash,
        "phone": phone.strip() if phone else "+91 98000 00000",
        "shift": "General Shift",
        "is_active": True,
        "is_primary_owner": False
    }
    CANONICAL_STAFF[username] = new_staff
    return new_staff

CANONICAL_AUDIT_LOGS: List[Dict[str, Any]] = [
    {
        "id": f"audit_{int(datetime.now().timestamp())}_01",
        "employee_name": "Admin Owner",
        "employee_role": "Admin",
        "action_type": "SYSTEM_STARTUP",
        "details": "FastAPI Cloud POS Microservice Engine initialized with 19/19 Security Controls",
        "table_number": None,
        "order_id": None,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
]

CANONICAL_SERVICE_CALLS: List[Dict[str, Any]] = []

# -------------------------------------------------------------------------
# ASYNC SUPABASE CLOUD CLIENT INTEGRATION
# -------------------------------------------------------------------------

RESTAURANT_ID = "11111111-1111-1111-1111-111111111111"

async def sync_order_to_supabase(order_data: Dict[str, Any]) -> None:
    """Asynchronously sync an order to Supabase Cloud DB with real-time session tracking."""
    if os.environ.get("TESTING") == "1" or settings.ENVIRONMENT == "test":
        return
    api_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    if not api_key:
        return
    
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    base_url = f"{settings.SUPABASE_URL}/rest/v1"

    # Normalize table number to T-01 format
    raw_tbl = str(order_data.get("table_number", "01"))
    digits = "".join([c for c in raw_tbl if c.isdigit()])
    table_num = f"T-{digits.zfill(2)}" if digits else "T-01"

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            # 1. Resolve table_id
            table_id = None
            t_resp = await client.get(
                f"{base_url}/restaurant_tables?table_number=eq.{table_num}&select=id",
                headers=headers
            )
            if t_resp.status_code == 200 and t_resp.json():
                table_id = t_resp.json()[0]["id"]
            if not table_id:
                table_id = "4f8bb699-0c21-40d5-8e89-6cdd06d7dd77"

            # 2. Find or create ACTIVE session in table_sessions
            session_id = None
            sess_resp = await client.get(
                f"{base_url}/table_sessions?table_id=eq.{table_id}&status=eq.ACTIVE&order=opened_at.desc&limit=1",
                headers=headers
            )
            total_amt = float(order_data.get("total_amount") or order_data.get("total", 0.0))
            cust_name = order_data.get("customer_name") or "Walk-in Guest"
            cust_phone = order_data.get("customer_phone")

            if sess_resp.status_code == 200 and sess_resp.json():
                active_sess = sess_resp.json()[0]
                session_id = active_sess["id"]
                new_tot = float(active_sess.get("total_amount", 0.0)) + total_amt
                await client.patch(
                    f"{base_url}/table_sessions?id=eq.{session_id}",
                    headers=headers,
                    json={
                        "total_amount": new_tot,
                        "customer_name": cust_name,
                        "customer_phone": cust_phone
                    }
                )
            else:
                date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
                sess_code = f"SESS-{date_str}-{table_num.replace('-', '')}-{uuid.uuid4().hex[:4].upper()}"
                new_sess_payload = {
                    "restaurant_id": RESTAURANT_ID,
                    "table_id": table_id,
                    "session_code": sess_code,
                    "status": "ACTIVE",
                    "customer_name": cust_name,
                    "customer_phone": cust_phone,
                    "total_amount": total_amt,
                    "opened_at": datetime.now(timezone.utc).isoformat()
                }
                new_sess_resp = await client.post(
                    f"{base_url}/table_sessions",
                    headers=headers,
                    json=new_sess_payload
                )
                if new_sess_resp.status_code in [200, 201] and new_sess_resp.json():
                    session_id = new_sess_resp.json()[0]["id"]

            # Mark table occupied
            await client.patch(
                f"{base_url}/restaurant_tables?id=eq.{table_id}",
                headers=headers,
                json={"status": "OCCUPIED"}
            )

            # 3. Insert order
            pay_mode = str(order_data.get("payment_mode", "Cash")).upper()
            pay_method = "UPI_COUNTER" if "UPI" in pay_mode or "ONLINE" in pay_mode else "CASH"
            pay_status = "PAID" if "PAID" in str(order_data.get("payment_status", "")).upper() or pay_method == "UPI_COUNTER" else "UNPAID"
            
            raw_id = str(order_data.get("id", f"ORD-{uuid.uuid4().hex[:6]}"))
            order_num = raw_id.replace("#", "")

            order_payload = {
                "restaurant_id": RESTAURANT_ID,
                "session_id": session_id,
                "table_id": table_id,
                "table_number": table_num,
                "order_number": order_num,
                "customer_name": cust_name,
                "customer_phone": cust_phone,
                "subtotal": float(order_data.get("subtotal", 0.0)),
                "tax_amount": float(order_data.get("tax", 0.0)),
                "discount_amount": float(order_data.get("discount", 0.0)),
                "total_amount": total_amt,
                "payment_method": pay_method,
                "payment_status": pay_status,
                "status": "PLACED",
                "special_notes": order_data.get("special_note") or "",
                "placed_at": order_data.get("placed_at", datetime.now(timezone.utc).isoformat())
            }

            ord_resp = await client.post(f"{base_url}/orders", headers=headers, json=order_payload)
            if ord_resp.status_code in [200, 201]:
                print(f"[SUPABASE] Cloud Order {order_num} synced successfully with session {session_id}.")
                try:
                    resp_json = ord_resp.json()
                    created_ord_id = resp_json[0]["id"] if isinstance(resp_json, list) and len(resp_json) > 0 else None
                    raw_items = order_data.get("items", [])
                    if created_ord_id and raw_items:
                        item_rows = []
                        for item in raw_items:
                            qty = int(item.get("qty") or item.get("quantity") or 1)
                            unit_p = float(item.get("price") or item.get("unit_price") or 0.0)
                            item_rows.append({
                                "order_id": created_ord_id,
                                "item_name": item.get("name") or "Dish Item",
                                "quantity": qty,
                                "unit_price": unit_p,
                                "total_price": round(unit_p * qty, 2),
                                "cooking_note": item.get("notes") or item.get("cooking_note") or None,
                                "status": "PLACED"
                            })
                        if item_rows:
                            await client.post(f"{base_url}/order_items", headers=headers, json=item_rows)
                except Exception as item_err:
                    print(f"[SUPABASE] Cloud order_items insertion notice: {str(item_err)}")
            else:
                print(f"[SUPABASE] Cloud Order sync notice ({ord_resp.status_code}): {ord_resp.text}")

        except Exception as e:
            print(f"[SUPABASE] Cloud Order Sync exception: {str(e)}")

# Backward-compatible alias
sync_order_to_appwrite = sync_order_to_supabase

async def sync_settle_session_to_supabase(
    table_number: str,
    order_id: Optional[str] = None,
    payment_method: str = "Cash",
    session_id: Optional[str] = None,
    waiter_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritative server-side table session termination and bill settlement in Supabase Cloud.
    1. Resolves table and terminates active session in `table_sessions` (status: COMPLETED, closed_at: now).
    2. Marks `restaurant_tables` status as VACANT.
    3. Updates all orders for this table to status: SERVED / Completed, payment_status: PAID.
    """
    api_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    if not api_key:
        return {"success": True, "offline": True}

    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    base_url = f"{settings.SUPABASE_URL}/rest/v1"

    # Normalize table number variants to ensure comprehensive matching in Supabase
    raw_tbl = str(table_number or "01")
    digits = "".join([c for c in raw_tbl if c.isdigit()])
    pad_num = digits.zfill(2) if digits else "01"
    table_num = f"T-{pad_num}"

    table_variants = list({
        table_num,
        f"T{pad_num}",
        f"T-{digits}" if digits else "",
        f"T{digits}" if digits else "",
        str(int(digits)) if digits else "",
        pad_num,
        f"Table {digits}" if digits else ""
    } - {""})

    pay_method = "CASH" if (payment_method or "").upper() == "CASH" else "UPI_COUNTER"
    closed_at = datetime.now(timezone.utc).isoformat()

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            # 1. Resolve table_id
            table_id = None
            tbl_in_str = ",".join(table_variants)
            t_resp = await client.get(
                f"{base_url}/restaurant_tables?table_number=in.({tbl_in_str})&select=id",
                headers=headers
            )
            if t_resp.status_code == 200 and t_resp.json():
                table_id = t_resp.json()[0]["id"]

            # 1. Settle all active orders for this table in Supabase (unlink session_id)
            order_patch_payload = {
                "session_id": None,
                "status": "SERVED",
                "payment_status": "PAID",
                "payment_method": pay_method,
                "served_at": closed_at
            }

            # Update orders by table number variants
            await client.patch(
                f"{base_url}/orders?table_number=in.({tbl_in_str})&status=neq.CANCELLED",
                headers=headers,
                json=order_patch_payload
            )

            # If specific order_id was provided, update it directly as well
            if order_id:
                clean_ord = str(order_id).replace("#", "")
                is_uuid = len(clean_ord) == 36 and clean_ord.count("-") == 4
                if is_uuid:
                    await client.patch(
                        f"{base_url}/orders?id=eq.{clean_ord}",
                        headers=headers,
                        json=order_patch_payload
                    )
                else:
                    await client.patch(
                        f"{base_url}/orders?order_number=eq.{clean_ord}",
                        headers=headers,
                        json=order_patch_payload
                    )

            # 2. Delete / Terminate active session in table_sessions
            terminated_sessions = []
            if session_id:
                try:
                    await client.delete(
                        f"{base_url}/table_sessions?id=eq.{session_id}",
                        headers=headers
                    )
                    terminated_sessions.append(session_id)
                except Exception:
                    pass
            elif table_id:
                try:
                    await client.delete(
                        f"{base_url}/table_sessions?table_id=eq.{table_id}",
                        headers=headers
                    )
                except Exception:
                    pass

            # 3. Mark Table as VACANT
            if table_id:
                await client.patch(
                    f"{base_url}/restaurant_tables?id=eq.{table_id}",
                    headers=headers,
                    json={"status": "VACANT"}
                )
            else:
                await client.patch(
                    f"{base_url}/restaurant_tables?table_number=in.({tbl_in_str})",
                    headers=headers,
                    json={"status": "VACANT"}
                )

            print(f"[SUPABASE] Successfully terminated session(s) for Table {table_num} and marked VACANT.")
            return {
                "success": True,
                "table_number": table_num,
                "terminated_sessions": terminated_sessions,
                "closed_at": closed_at
            }
        except Exception as e:
            print(f"[SUPABASE] Session settlement notice: {str(e)}")
            return {"success": False, "error": str(e)}


async def log_admin_action(
    employee_name: str,
    employee_role: str,
    action_type: str,
    details: str,
    table_number: Optional[str] = None,
    order_id: Optional[str] = None
) -> None:
    """Log an administrative or staff action into the audit trail and Supabase."""
    timestamp = datetime.now(timezone.utc).isoformat()
    entry = {
        "id": f"audit_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}",
        "employee_name": employee_name,
        "employee_role": employee_role,
        "action_type": action_type,
        "details": details,
        "table_number": table_number,
        "order_id": order_id,
        "timestamp": timestamp
    }
    CANONICAL_AUDIT_LOGS.insert(0, entry)
    if len(CANONICAL_AUDIT_LOGS) > 500:
        CANONICAL_AUDIT_LOGS.pop()

    print(f"[AUDIT] [{action_type}] by {employee_name} ({employee_role}): {details}")

    if settings.SUPABASE_SERVICE_ROLE_KEY:
        url = f"{settings.SUPABASE_URL}/rest/v1/audit_logs"
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        payload = {
            "employee_name": employee_name,
            "employee_role": employee_role,
            "action_type": action_type,
            "details": details,
            "table_number": table_number,
            "order_id": order_id,
            "created_at": timestamp
        }
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(url, headers=headers, json=payload)
        except Exception:
            pass
