import html
import random
import time
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Request

from app.schemas.order import (
    GuestOrderCreate,
    OrderResponse,
    OrderListResponse,
    OrderStatusUpdate,
    OrderItemDetail
)
from app.database import (
    CANONICAL_MENU,
    CANONICAL_COUPONS,
    CANONICAL_ORDERS,
    CANONICAL_TABLES,
    sync_order_to_supabase,
    log_admin_action
)
from app.security import get_current_user

router = APIRouter(prefix="/orders", tags=["Orders & KDS Kitchen Dispatch"])

@router.post("/guest", response_model=OrderResponse, status_code=status.HTTP_201_CREATED, summary="Guest Touchless Order Placement")
async def place_guest_order(request: Request, body: GuestOrderCreate):
    """
    Never Trust The Frontend:
    Authoritative server-side price recalculation, anti-bot honeypot check,
    coupon discount validation, and 5% GST computation.
    Directly dispatches order to Kitchen KDS and syncs to Supabase Cloud DB.
    """
    # 1. Anti-Bot Honeypot checks
    if body.gotcha or body.anti_bot_token:
        client_ip = request.client.host if request.client else "unknown"
        print(f"🤖 Bot trap triggered from IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Automated request rejected by security shield."
        )

    # 2. Form submission velocity check (< 600ms is a bot)
    if body.submitted_at:
        elapsed_ms = (time.time() * 1000) - body.submitted_at
        if elapsed_ms < 600:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Form submitted too rapidly."
            )

    # 3. Sanitize inputs
    clean_table = html.escape(body.table_number.strip().upper())
    clean_customer = html.escape((body.customer_name or "Walk-in Guest").strip())

    # 3b. Anti-Duplicate / Table QR Lock Check: Prevent 2nd order while an order is active in the kitchen queue
    def _digits_of(val: str) -> str:
        return "".join(filter(str.isdigit, str(val)))

    def _is_table_match(t1: str, t2: str) -> bool:
        d1, d2 = _digits_of(t1), _digits_of(t2)
        if d1 and d2:
            return d1 == d2
        return str(t1).strip().upper() == str(t2).strip().upper()

    active_order = next((
        o for o in CANONICAL_ORDERS
        if _is_table_match(o.get("table_number", ""), clean_table)
        and (o.get("status") or "").lower() not in ["completed", "cancelled"]
    ), None)

    if active_order:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Table {clean_table} already has an active order ({active_order['id']}) in status '{active_order['status']}'. QR ordering is locked for this table until the current order is completed."
        )

    # 4. Authoritative Server-Side Price Recalculation
    verified_subtotal = 0.0
    verified_items: List[OrderItemDetail] = []
    summary_parts: List[str] = []

    for item in body.items:
        canonical = CANONICAL_MENU.get(item.id)
        if not canonical:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Dish identifier '{item.id}' is invalid or discontinued."
            )
        
        qty = max(1, min(20, item.qty))
        line_total = canonical["price"] * qty
        verified_subtotal += line_total

        verified_items.append(
            OrderItemDetail(
                id=item.id,
                name=canonical["name"],
                price=canonical["price"],
                qty=qty,
                line_total=line_total,
                notes=html.escape(item.notes.strip()) if item.notes else None,
                modifiers=item.modifiers
            )
        )
        summary_parts.append(f"{qty}x {canonical['name']}")

    # 5. Server-side Coupon Validation
    verified_discount = 0.0
    if body.coupon_code:
        clean_code = body.coupon_code.strip().upper()
        promo = CANONICAL_COUPONS.get(clean_code)
        if promo and promo["active"] and verified_subtotal >= promo["min_order"]:
            if promo["discount_type"] == "flat":
                verified_discount = float(promo["discount"])
            elif promo["discount_type"] == "percentage":
                verified_discount = round((verified_subtotal * promo["discount"]) / 100.0, 2)

    # 6. 5% GST Calculation (2.5% CGST + 2.5% SGST)
    taxable_amount = max(0.0, verified_subtotal - verified_discount)
    tax = round(taxable_amount * 0.05, 2)
    authoritative_total = round(taxable_amount + tax, 2)

    order_id = f"#ORD{random.randint(1000, 9999)}"
    placed_at = datetime.now(timezone.utc).isoformat()

    new_order_dict = {
        "id": order_id,
        "table_number": clean_table,
        "customer_name": clean_customer,
        "items": [it.model_dump() for it in verified_items],
        "items_summary": ", ".join(summary_parts),
        "subtotal": verified_subtotal,
        "discount": verified_discount,
        "tax": tax,
        "total_amount": authoritative_total,
        "status": "Placed",
        "payment_mode": body.payment_mode or "Cash",
        "payment_status": "Paid" if body.payment_mode == "UPI" else "Pending",
        "placed_at": placed_at,
        "estimated_time_mins": 15
    }

    # Prepend to live orders list
    CANONICAL_ORDERS.insert(0, new_order_dict)

    # Update Table status to occupied
    if clean_table in CANONICAL_TABLES:
        CANONICAL_TABLES[clean_table]["status"] = "occupied"
        CANONICAL_TABLES[clean_table]["current_order_id"] = order_id
        CANONICAL_TABLES[clean_table]["timing"] = "Just now"

    # Background async sync to Supabase
    await sync_order_to_supabase(new_order_dict)

    return OrderResponse(**new_order_dict)

@router.get("", response_model=OrderListResponse, summary="List All Live Orders (Staff Only)")
async def list_orders(current_user: dict = Depends(get_current_user)):
    """Retrieve all active orders across tables and KDS kitchen stations."""
    return OrderListResponse(
        success=True,
        count=len(CANONICAL_ORDERS),
        orders=[OrderResponse(**o) for o in CANONICAL_ORDERS]
    )

@router.put("/{order_id}/status", response_model=OrderResponse, summary="Update Order KDS Status")
async def update_order_status(
    order_id: str,
    body: OrderStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update ticket status along kitchen lifecycle:
    Placed -> Cooking -> Preparing -> Ready -> Served -> Completed / Cancelled.
    """
    valid_statuses = ["Placed", "Cooking", "Preparing", "Ready", "Served", "Completed", "Cancelled"]
    if body.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{body.status}'. Must be one of: {', '.join(valid_statuses)}"
        )

    order = next((o for o in CANONICAL_ORDERS if o["id"] == order_id), None)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{order_id}' not found."
        )

    prev_status = order["status"]
    order["status"] = body.status

    # If completed or cancelled, release table
    if body.status in ["Completed", "Cancelled"]:
        tbl = CANONICAL_TABLES.get(order["table_number"])
        if tbl and tbl.get("current_order_id") == order_id:
            tbl["status"] = "available"
            tbl["current_order_id"] = None
            tbl["timing"] = None

    await log_admin_action(
        employee_name=current_user.get("name", "Staff"),
        employee_role=current_user.get("role", "Staff"),
        action_type="ORDER_STATUS_UPDATE",
        details=f"Order {order_id} transitioned from {prev_status} to {body.status}",
        table_number=order["table_number"],
        order_id=order_id
    )

    return OrderResponse(**order)
