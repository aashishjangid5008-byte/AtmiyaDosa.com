import html
import re
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Request
import httpx

from app.config import settings
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
    RESTAURANT_ID,
    log_admin_action,
    sync_settle_session_to_supabase
)
from app.security import get_current_user, get_current_user_optional
from app.routers.qr import build_table_qr_url

router = APIRouter(prefix="/tables", tags=["Dining Floor & Live Table Management"])

def _format_supabase_table_number(val: str) -> str:
    clean = (val or "").strip().upper()
    digits = re.sub(r"[^0-9]", "", clean)
    if digits:
        return f"T-{digits.zfill(2)}"
    return clean

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
    occupancy status, and dynamic touchless QR URLs directly from Supabase Cloud.
    """
    # Attempt loading from Supabase Cloud for multi-device sync
    if settings.SUPABASE_SERVICE_ROLE_KEY and settings.SUPABASE_URL:
        try:
            api_key = settings.SUPABASE_SERVICE_ROLE_KEY
            headers = {
                "apikey": api_key,
                "Authorization": f"Bearer {api_key}"
            }
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(
                    f"{settings.SUPABASE_URL}/rest/v1/restaurant_tables?select=*&order=table_number.asc",
                    headers=headers
                )
                if resp.status_code == 200:
                    db_tables = resp.json()
                    for dt in db_tables:
                        t_num = dt.get("table_number") or ""
                        clean_code = t_num.replace("-", "")
                        st = (dt.get("status") or "VACANT").upper()
                        norm_status = "occupied" if st == "OCCUPIED" else "available"
                        table_data = {
                            "id": clean_code or t_num,
                            "number": clean_code or t_num,
                            "capacity": dt.get("capacity", 4),
                            "zone": dt.get("zone", "Main Hall"),
                            "status": norm_status,
                            "current_order_id": None,
                            "timing": None
                        }
                        CANONICAL_TABLES[clean_code] = table_data
                        if t_num != clean_code:
                            CANONICAL_TABLES[t_num] = table_data
        except Exception as e:
            print(f"[TABLES] Notice: Supabase tables fetch fallback to canonical cache: {e}")

    tables_list = list(CANONICAL_TABLES.values())
    # Deduplicate tables by normalized number
    seen_nums = set()
    unique_tables = []
    for t in tables_list:
        clean_key = re.sub(r"[^0-9]", "", t["number"]) or t["number"]
        if clean_key not in seen_nums:
            seen_nums.add(clean_key)
            unique_tables.append(t)

    occupied_count = sum(1 for t in unique_tables if t["status"] == "occupied")
    vacant_count = len(unique_tables) - occupied_count

    return TableListResponse(
        success=True,
        total=len(unique_tables),
        occupied=occupied_count,
        vacant=vacant_count,
        tables=[_build_table_response(t, request) for t in unique_tables]
    )

@router.post("", response_model=TableResponse, status_code=status.HTTP_201_CREATED, summary="Add Table & Generate Dynamic QR Standee")
async def add_table(
    body: TableCreate,
    request: Request,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Add a new table to the floor plan and automatically persist to Supabase Cloud
    and generate its touchless QR menu URL. Validates uniqueness of table identifier.
    """
    clean_number = html.escape(body.number.strip().upper())
    if not clean_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Table identifier code cannot be empty."
        )

    supabase_tnum = _format_supabase_table_number(clean_number)
    clean_code = clean_number.replace("-", "")

    # Check duplicate in canonical tables
    if clean_code in CANONICAL_TABLES or supabase_tnum in CANONICAL_TABLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Table code '{clean_number}' already exists on the floor plan."
        )

    new_table_dict = {
        "id": clean_code,
        "number": clean_code,
        "capacity": body.capacity,
        "zone": body.zone or "Main Hall",
        "status": "available",
        "current_order_id": None,
        "timing": None
    }
    CANONICAL_TABLES[clean_code] = new_table_dict
    CANONICAL_TABLES[supabase_tnum] = new_table_dict

    # PERMANENT CLOUD PERSISTENCE: Write to Supabase restaurant_tables using service role key
    if settings.SUPABASE_SERVICE_ROLE_KEY and settings.SUPABASE_URL:
        try:
            api_key = settings.SUPABASE_SERVICE_ROLE_KEY
            headers = {
                "apikey": api_key,
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
            async with httpx.AsyncClient(timeout=5.0) as client:
                db_payload = {
                    "restaurant_id": RESTAURANT_ID,
                    "table_number": supabase_tnum,
                    "capacity": body.capacity,
                    "zone": body.zone or "Main Hall",
                    "status": "VACANT",
                    "floor": "Ground Floor"
                }
                sb_resp = await client.post(
                    f"{settings.SUPABASE_URL}/rest/v1/restaurant_tables",
                    headers=headers,
                    json=db_payload
                )
                if sb_resp.status_code in (200, 201):
                    print(f"[SUPABASE] Successfully persisted table {supabase_tnum} to Cloud DB!")
                else:
                    print(f"[SUPABASE] Notice: Table insert status {sb_resp.status_code}: {sb_resp.text}")
        except Exception as e:
            print(f"[SUPABASE] Notice: Table cloud insert exception: {e}")

    staff_name = (current_user or {}).get("name", "Admin")
    staff_role = (current_user or {}).get("role", "Admin")

    await log_admin_action(
        employee_name=staff_name,
        employee_role=staff_role,
        action_type="TABLE_ADDED",
        details=f"Added dining table {clean_code} ({body.zone}, {body.capacity} seats) with dynamic QR standee",
        table_number=clean_code
    )

    return _build_table_response(new_table_dict, request)

@router.put("/{table_number}", response_model=TableResponse, summary="Update Table Details or Status")
async def update_table(
    table_number: str,
    body: TableUpdate,
    request: Request,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    clean_num = table_number.strip().upper()
    clean_code = clean_num.replace("-", "")
    supabase_tnum = _format_supabase_table_number(clean_num)

    table = CANONICAL_TABLES.get(clean_code) or CANONICAL_TABLES.get(supabase_tnum) or CANONICAL_TABLES.get(clean_num)
    if not table:
        table = {
            "id": clean_code,
            "number": clean_code,
            "capacity": body.capacity or 4,
            "zone": body.zone or "Main Hall",
            "status": body.status or "available",
            "current_order_id": body.current_order_id,
            "timing": body.timing
        }
        CANONICAL_TABLES[clean_code] = table

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

    # Update in Supabase
    if settings.SUPABASE_SERVICE_ROLE_KEY and settings.SUPABASE_URL:
        try:
            api_key = settings.SUPABASE_SERVICE_ROLE_KEY
            headers = {
                "apikey": api_key,
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            patch_data = {}
            if body.capacity is not None:
                patch_data["capacity"] = body.capacity
            if body.zone is not None:
                patch_data["zone"] = body.zone
            if body.status is not None:
                patch_data["status"] = "OCCUPIED" if body.status.lower() == "occupied" else "VACANT"

            if patch_data:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    await client.patch(
                        f"{settings.SUPABASE_URL}/rest/v1/restaurant_tables?table_number=in.({supabase_tnum},{clean_code})",
                        headers=headers,
                        json=patch_data
                    )
        except Exception as e:
            print(f"[SUPABASE] Notice: Table cloud patch exception: {e}")

    staff_name = (current_user or {}).get("name", "Staff")
    staff_role = (current_user or {}).get("role", "Staff")

    await log_admin_action(
        employee_name=staff_name,
        employee_role=staff_role,
        action_type="TABLE_UPDATED",
        details=f"Updated settings for table {clean_num}",
        table_number=clean_num
    )

    return _build_table_response(table, request)

@router.delete("/{table_number}", summary="Delete Dining Table from Floor Plan")
async def delete_table(
    table_number: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    clean_num = table_number.strip().upper()
    clean_code = clean_num.replace("-", "")
    supabase_tnum = _format_supabase_table_number(clean_num)

    if clean_code in CANONICAL_TABLES:
        del CANONICAL_TABLES[clean_code]
    if supabase_tnum in CANONICAL_TABLES:
        del CANONICAL_TABLES[supabase_tnum]
    if clean_num in CANONICAL_TABLES:
        del CANONICAL_TABLES[clean_num]

    # Delete from Supabase Cloud
    if settings.SUPABASE_SERVICE_ROLE_KEY and settings.SUPABASE_URL:
        try:
            api_key = settings.SUPABASE_SERVICE_ROLE_KEY
            headers = {
                "apikey": api_key,
                "Authorization": f"Bearer {api_key}"
            }
            async with httpx.AsyncClient(timeout=4.0) as client:
                await client.delete(
                    f"{settings.SUPABASE_URL}/rest/v1/restaurant_tables?table_number=in.({supabase_tnum},{clean_code})",
                    headers=headers
                )
        except Exception as e:
            print(f"[SUPABASE] Notice: Table cloud delete exception: {e}")

    staff_name = (current_user or {}).get("name", "Staff")
    staff_role = (current_user or {}).get("role", "Staff")

    await log_admin_action(
        employee_name=staff_name,
        employee_role=staff_role,
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
    current_user: Optional[dict] = Depends(get_current_user_optional)
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

    staff_name = (current_user or {}).get("name", "Staff")
    staff_role = (current_user or {}).get("role", "Staff")

    await log_admin_action(
        employee_name=staff_name,
        employee_role=staff_role,
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
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Settle the running bill for a table, terminate active session in Supabase Cloud,
    free table to vacant, and mark all associated orders paid.
    """
    clean_num = table_number.strip().upper()

    def _digits_of(val: str) -> str:
        return "".join(filter(str.isdigit, str(val)))

    def _is_table_match(t1: str, t2: str) -> bool:
        d1, d2 = _digits_of(t1), _digits_of(t2)
        if d1 and d2:
            return d1 == d2
        return str(t1).strip().upper() == str(t2).strip().upper()

    digits = _digits_of(clean_num)
    t_hyphen = f"T-{digits.zfill(2)}" if digits else clean_num
    t_clean = f"T{digits.zfill(2)}" if digits else clean_num
    clean_code = clean_num.replace("-", "")

    table = (
        CANONICAL_TABLES.get(clean_num)
        or CANONICAL_TABLES.get(t_hyphen)
        or CANONICAL_TABLES.get(t_clean)
        or CANONICAL_TABLES.get(clean_code)
    )

    if not table:
        for k, v in list(CANONICAL_TABLES.items()):
            if _is_table_match(k, clean_num):
                table = v
                break

    if not table:
        table = {
            "id": clean_num,
            "number": clean_num,
            "capacity": 4,
            "zone": "Main Hall",
            "status": "available",
            "current_order_id": None,
            "timing": None
        }
        CANONICAL_TABLES[clean_num] = table

    # Settle all active orders for this table (Multi-round tickets)
    active_orders = [
        o for o in CANONICAL_ORDERS
        if _is_table_match(o.get("table_number", ""), clean_num)
        and (o.get("status") or "").lower() not in ["completed", "cancelled"]
    ]

    total_amount = sum(float(o.get("total_amount") or o.get("total", 0.0)) for o in active_orders)
    settled_order_ids = []

    waiter_id_val = body.waiter_id or (current_user or {}).get("sub") or (current_user or {}).get("username")

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

    staff_name = body.settled_by or (current_user or {}).get("name", "Staff")
    staff_role = (current_user or {}).get("role", "Staff")

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
