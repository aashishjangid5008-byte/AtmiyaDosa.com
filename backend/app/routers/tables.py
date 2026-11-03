import html
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Request

from app.schemas.table import (
    TableCreate,
    TableUpdate,
    TableResponse,
    TableListResponse,
    ShiftTableRequest,
    SettleBillRequest
)
from app.database import (
    CANONICAL_TABLES,
    CANONICAL_ORDERS,
    log_admin_action,
    sync_settle_session_to_supabase
)
from app.security import get_current_user
from app.routers.qr import build_table_qr_url

router = APIRouter(prefix="/tables", tags=["Dining Floor & Live Table Management"])

def _build_table_response(table_dict: dict, request: Optional[Request] = None) -> TableResponse:
    # Dynamic, secure touchless link that works on Cloud Run and local dev
    qr_url = build_table_qr_url(table_dict["number"], request)
    return TableResponse(
        id=table_dict["id"],
        number=table_dict["number"],
        capacity=table_dict["capacity"],
        zone=table_dict["zone"],
        status=table_dict["status"],
        current_order_id=table_dict.get("current_order_id"),
        timing=table_dict.get("timing"),
        qr_url=qr_url
    )

@router.get("", response_model=TableListResponse, summary="List All Floor Tables with Live Status & QR Links")
async def list_tables(request: Request):
    """
    Retrieve all dining tables, party capacities, zone tags,
    occupancy status, and dynamic touchless QR URLs.
    """
    tables_list = list(CANONICAL_TABLES.values())
    occupied_count = sum(1 for t in tables_list if t["status"] == "occupied")
    vacant_count = len(tables_list) - occupied_count

    return TableListResponse(
        success=True,
        total=len(tables_list),
        occupied=occupied_count,
        vacant=vacant_count,
        tables=[_build_table_response(t, request) for t in tables_list]
    )

@router.post("", response_model=TableResponse, status_code=status.HTTP_201_CREATED, summary="Add Table & Generate Dynamic QR Standee")
async def add_table(
    body: TableCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Add a new table to the floor plan and automatically generate its
    touchless QR menu URL. Validates uniqueness of table identifier.
    """
    clean_number = html.escape(body.number.strip().upper())
    if not clean_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Table identifier code cannot be empty."
        )

    if clean_number in CANONICAL_TABLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Table code '{clean_number}' already exists on the floor plan."
        )

    new_table_dict = {
        "id": clean_number,
        "number": clean_number,
        "capacity": body.capacity,
        "zone": body.zone,
        "status": "available",
        "current_order_id": None,
        "timing": None
    }
    CANONICAL_TABLES[clean_number] = new_table_dict

    await log_admin_action(
        employee_name=current_user.get("name", "Staff"),
        employee_role=current_user.get("role", "Staff"),
        action_type="TABLE_ADDED",
        details=f"Added dining table {clean_number} ({body.zone}, {body.capacity} seats) with dynamic QR standee",
        table_number=clean_number
    )

    return _build_table_response(new_table_dict, request)

@router.put("/{table_number}", response_model=TableResponse, summary="Update Table Details or Status")
async def update_table(
    table_number: str,
    body: TableUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    clean_num = table_number.strip().upper()
    table = CANONICAL_TABLES.get(clean_num)
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table '{clean_num}' not found."
        )

    if body.capacity is not None:
        table["capacity"] = body.capacity
    if body.zone is not None:
        table["zone"] = body.zone
    if body.status is not None:
        table["status"] = body.status
    if body.current_order_id is not None:
        table["current_order_id"] = body.current_order_id
    if body.timing is not None:
        table["timing"] = body.timing

    await log_admin_action(
        employee_name=current_user.get("name", "Staff"),
        employee_role=current_user.get("role", "Staff"),
        action_type="TABLE_UPDATED",
        details=f"Updated settings for table {clean_num}",
        table_number=clean_num
    )

    return _build_table_response(table, request)

@router.delete("/{table_number}", summary="Delete Dining Table from Floor Plan")
async def delete_table(
    table_number: str,
    current_user: dict = Depends(get_current_user)
):
    clean_num = table_number.strip().upper()
    if clean_num not in CANONICAL_TABLES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table '{clean_num}' not found."
        )

    del CANONICAL_TABLES[clean_num]

    await log_admin_action(
        employee_name=current_user.get("name", "Staff"),
        employee_role=current_user.get("role", "Staff"),
        action_type="TABLE_DELETED",
        details=f"Deleted table {clean_num} from floor plan",
        table_number=clean_num
    )

    return {"success": True, "message": f"Table '{clean_num}' deleted successfully."}

@router.post("/{table_number}/shift", response_model=TableResponse, summary="Shift / Transfer Running Order to Vacant Table")
async def shift_table(
    table_number: str,
    body: ShiftTableRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Transfer an active ticket and dining party to another vacant table."""
    source_num = table_number.strip().upper()
    target_num = body.target_table_number.strip().upper()

    source = CANONICAL_TABLES.get(source_num)
    target = CANONICAL_TABLES.get(target_num)

    if not source:
        raise HTTPException(status_code=404, detail=f"Source table '{source_num}' not found.")
    if not target:
        raise HTTPException(status_code=404, detail=f"Target table '{target_num}' not found.")
    if target["status"] == "occupied":
        raise HTTPException(status_code=400, detail=f"Target table '{target_num}' is currently occupied.")

    order_id = source.get("current_order_id")
    order = next((o for o in CANONICAL_ORDERS if o["id"] == order_id), None) if order_id else None

    # Move order reference
    target["status"] = "occupied"
    target["current_order_id"] = order_id
    target["timing"] = source.get("timing", "10m")

    source["status"] = "available"
    source["current_order_id"] = None
    source["timing"] = None

    if order:
        order["table_number"] = target_num

    await log_admin_action(
        employee_name=current_user.get("name", "Staff"),
        employee_role=current_user.get("role", "Staff"),
        action_type="TABLE_SHIFT",
        details=f"Shifted running order {order_id or 'none'} from {source_num} to {target_num}",
        table_number=target_num,
        order_id=order_id
    )

    return _build_table_response(target, request)

@router.post("/{table_number}/settle", summary="Quick Settle Bill & Free Dining Table")
async def settle_table_bill(
    table_number: str,
    body: SettleBillRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Settle the running bill for a table, terminate active session in Supabase Cloud,
    free table to vacant, and mark all associated orders paid.
    """
    clean_num = table_number.strip().upper()
    table = CANONICAL_TABLES.get(clean_num)
    if not table:
        raise HTTPException(status_code=404, detail=f"Table '{clean_num}' not found.")

    def _digits_of(val: str) -> str:
        return "".join(filter(str.isdigit, str(val)))

    def _is_table_match(t1: str, t2: str) -> bool:
        d1, d2 = _digits_of(t1), _digits_of(t2)
        if d1 and d2:
            return d1 == d2
        return str(t1).strip().upper() == str(t2).strip().upper()

    # Settle all active orders for this table (Multi-round tickets)
    active_orders = [
        o for o in CANONICAL_ORDERS
        if _is_table_match(o.get("table_number", ""), clean_num)
        and (o.get("status") or "").lower() not in ["completed", "cancelled"]
    ]

    total_amount = sum(float(o.get("total_amount") or o.get("total", 0.0)) for o in active_orders)
    settled_order_ids = []

    waiter_id_val = body.waiter_id or current_user.get("sub") or current_user.get("username")

    for order in active_orders:
        order["status"] = "Completed"
        order["payment_status"] = "Paid"
        order["payment_mode"] = body.payment_method
        if waiter_id_val:
            order["paid_collected_by_id"] = waiter_id_val
        if body.settled_by:
            order["paid_collected_by"] = body.settled_by
        settled_order_ids.append(order["id"])

    # Vacate table
    table["status"] = "available"
    table["current_order_id"] = None
    table["timing"] = None

    # Server-side Supabase Cloud session termination
    supabase_sync = await sync_settle_session_to_supabase(
        table_number=clean_num,
        order_id=settled_order_ids[0] if settled_order_ids else None,
        payment_method=body.payment_method,
        session_id=body.session_id,
        waiter_id=waiter_id_val
    )

    staff_name = body.settled_by or current_user.get("name", "Staff")
    staff_role = current_user.get("role", "Staff")

    audit_detail = f"Settled bill for Table {clean_num} (₹{total_amount:.2f}, {len(active_orders)} tickets) via {body.payment_method}"
    if waiter_id_val:
        audit_detail += f" [Collected by Waiter ID: {waiter_id_val}]"
    audit_detail += ". Table vacated and session terminated."

    await log_admin_action(
        employee_name=staff_name,
        employee_role=staff_role,
        action_type="TABLE_BILL_SETTLED",
        details=audit_detail,
        table_number=clean_num,
        order_id=settled_order_ids[0] if settled_order_ids else None
    )

    return {
        "success": True,
        "message": f"Bill for Table {clean_num} settled via {body.payment_method}.",
        "table_number": clean_num,
        "total_amount": total_amount,
        "settled_orders": settled_order_ids,
        "session_terminated": True,
        "status": "COMPLETED",
        "vacated": True,
        "supabase_sync": supabase_sync
    }
