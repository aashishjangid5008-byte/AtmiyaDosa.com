import base64
import html
import os
import time
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Request
import httpx

from app.config import settings
from app.schemas.menu import (
    MenuItemCreate,
    MenuItemUpdate,
    MenuItemResponse,
    CategoryResponse,
    ImageUploadRequest
)
from app.database import (
    CANONICAL_MENU,
    CANONICAL_CATEGORIES,
    RESTAURANT_ID,
    log_admin_action,
    save_custom_menu
)
from app.security import get_current_user, get_current_user_optional, require_roles

router = APIRouter(prefix="/menu", tags=["Menu & Category Catalog"])

FRONTEND_UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "uploads"))
BACKEND_UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))

@router.post("/upload-photo", summary="Upload Dish Photo (Multipart File or Base64 Data URL)")
async def upload_dish_photo(request: Request):
    """
    Accepts either a standard multipart file upload or a JSON body with base64 Data URL.
    Permanently uploads the image into Supabase Cloud Storage (public bucket 'menu-photos')
    and saves to disk as a fallback, returning the permanent CDN URL.
    """
    os.makedirs(FRONTEND_UPLOADS_DIR, exist_ok=True)
    os.makedirs(BACKEND_UPLOADS_DIR, exist_ok=True)

    timestamp = int(time.time() * 1000)
    content = None
    ext = ".jpg"
    mime_type = "image/jpeg"

    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("file")
        if uploaded_file and hasattr(uploaded_file, "filename") and uploaded_file.filename:
            file_ext = os.path.splitext(uploaded_file.filename)[1].lower() or ".jpg"
            if file_ext in [".png"]:
                ext = ".png"
                mime_type = "image/png"
            elif file_ext in [".webp"]:
                ext = ".webp"
                mime_type = "image/webp"
            else:
                ext = ".jpg"
                mime_type = "image/jpeg"
            content = await uploaded_file.read()
    else:
        try:
            body = await request.json()
            image_data = body.get("image") or body.get("image_data") or body.get("image_url")
            if image_data:
                if image_data.startswith("data:image/"):
                    header, base64_str = image_data.split(",", 1)
                    if "png" in header:
                        ext = ".png"
                        mime_type = "image/png"
                    elif "webp" in header:
                        ext = ".webp"
                        mime_type = "image/webp"
                    else:
                        ext = ".jpg"
                        mime_type = "image/jpeg"
                else:
                    base64_str = image_data
                content = base64.b64decode(base64_str)
        except Exception:
            pass

    if not content:
        raise HTTPException(status_code=400, detail="No file or image data provided")

    filename = f"dish_{timestamp}{ext}"

    # 1. Permanent Upload to Supabase Cloud Storage ('menu-photos' bucket)
    public_url = None
    if settings.SUPABASE_SERVICE_ROLE_KEY and settings.SUPABASE_URL:
        try:
            storage_url = f"{settings.SUPABASE_URL}/storage/v1/object/menu-photos/dishes/{filename}"
            storage_headers = {
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                "Content-Type": mime_type,
                "x-upsert": "true"
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                up_res = await client.post(storage_url, headers=storage_headers, content=content)
                if up_res.status_code in [200, 201]:
                    public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/menu-photos/dishes/{filename}"
                    print(f"[SUPABASE STORAGE] Successfully uploaded dish photo: {public_url}")
                else:
                    print(f"[SUPABASE STORAGE] Upload notice ({up_res.status_code}): {up_res.text}")
        except Exception as sup_err:
            print(f"[SUPABASE STORAGE] Upload exception: {sup_err}")

    # 2. Local disk fallback
    try:
        frontend_path = os.path.join(FRONTEND_UPLOADS_DIR, filename)
        with open(frontend_path, "wb") as f:
            f.write(content)

        backend_path = os.path.join(BACKEND_UPLOADS_DIR, filename)
        with open(backend_path, "wb") as f:
            f.write(content)
    except Exception:
        pass

    final_url = public_url if public_url else f"/uploads/{filename}"
    return {
        "success": True,
        "url": final_url,
        "filename": filename
    }

@router.get("", summary="Get Canonical Menu Catalog (Public / Guest / POS)")
async def get_menu(category: Optional[str] = None):
    """
    Retrieve live menu items. Supports optional filtering by category.
    Returns authoritative server prices and dietary flags.
    """
    items = list(CANONICAL_MENU.values())
    if category and category.lower() != "all":
        items = [i for i in items if i.get("category", "").lower() == category.lower()]
    
    return {
        "success": True,
        "count": len(items),
        "items": [MenuItemResponse(**i) for i in items]
    }

@router.get("/categories", summary="List All Menu Categories with Counts")
async def get_categories():
    """Retrieve all categories with live counts of available dishes."""
    result = []
    for cat in CANONICAL_CATEGORIES:
        count = sum(1 for it in CANONICAL_MENU.values() if it.get("category") == cat["name"])
        result.append(CategoryResponse(
            id=cat["id"],
            name=cat["name"],
            icon=cat.get("icon", "Utensils"),
            count=count
        ))
    return {"success": True, "categories": result}

@router.post("", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED, summary="Add New Menu Item (Admin/Kitchen)")
async def create_menu_item(
    body: MenuItemCreate,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    item_id = body.id if body.id else f"item_atmiya_{int(time.time() * 1000)}"
    new_item = {
        "id": item_id,
        "name": body.name.strip(),
        "english_name": body.english_name.strip() if body.english_name else body.name.strip(),
        "gujarati_name": body.gujarati_name.strip() if body.gujarati_name else None,
        "price": float(body.price),
        "category": body.category,
        "cuisine": body.cuisine or "south_indian",
        "description": body.description.strip() if body.description else "",
        "is_available": body.is_available,
        "is_jain_available": body.is_jain_available,
        "prep_time_mins": body.prep_time_mins,
        "image_url": body.image_url,
        "tags": ["New Item"]
    }

    # PERMANENT CLOUD PERSISTENCE: Insert into Supabase Cloud PostgreSQL DB
    if settings.SUPABASE_SERVICE_ROLE_KEY and settings.SUPABASE_URL:
        try:
            api_key = settings.SUPABASE_SERVICE_ROLE_KEY
            headers = {
                "apikey": api_key,
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
            base_url = f"{settings.SUPABASE_URL}/rest/v1"

            async with httpx.AsyncClient(timeout=8.0) as client:
                # 1. Resolve matching category_id
                category_id = None
                cat_resp = await client.get(
                    f"{base_url}/menu_categories?name=eq.{body.category}&select=id",
                    headers=headers
                )
                if cat_resp.status_code == 200 and cat_resp.json():
                    category_id = cat_resp.json()[0]["id"]
                else:
                    all_cats = await client.get(f"{base_url}/menu_categories?select=id&limit=1", headers=headers)
                    if all_cats.status_code == 200 and all_cats.json():
                        category_id = all_cats.json()[0]["id"]

                # 2. Insert into menu_items table
                db_payload = {
                    "restaurant_id": RESTAURANT_ID,
                    "category_id": category_id,
                    "name": new_item["name"],
                    "gujarati_name": new_item.get("gujarati_name"),
                    "description": new_item.get("description", ""),
                    "price": float(new_item["price"]),
                    "image_url": new_item.get("image_url"),
                    "is_available": new_item.get("is_available", True),
                    "is_jain_available": new_item.get("is_jain_available", True),
                    "prep_time_mins": new_item.get("prep_time_mins", 10),
                    "tags": new_item.get("tags", ["New Item"])
                }
                insert_resp = await client.post(f"{base_url}/menu_items", headers=headers, json=db_payload)
                if insert_resp.status_code in [200, 201]:
                    saved_rows = insert_resp.json()
                    if saved_rows and isinstance(saved_rows, list) and len(saved_rows) > 0:
                        new_item["id"] = saved_rows[0].get("id", item_id)
                        print(f"[SUPABASE] Permanently inserted dish '{new_item['name']}' with UUID {new_item['id']}")
                else:
                    print(f"[SUPABASE] Menu item insertion notice ({insert_resp.status_code}): {insert_resp.text}")
        except Exception as sup_err:
            print(f"[SUPABASE] Menu item insertion error: {sup_err}")

    CANONICAL_MENU[item_id] = new_item
    save_custom_menu()

    emp_name = current_user.get("name", "Admin") if current_user else "Admin"
    emp_role = current_user.get("role", "Admin") if current_user else "Admin"
    await log_admin_action(
        employee_name=emp_name,
        employee_role=emp_role,
        action_type="MENU_ITEM_CREATED",
        details=f"Created menu item '{new_item['name']}' in category '{new_item['category']}' for ₹{new_item['price']}"
    )

    return MenuItemResponse(**new_item)

@router.put("/{item_id}", response_model=MenuItemResponse, summary="Update Menu Item or Availability")
async def update_menu_item(
    item_id: str,
    body: MenuItemUpdate,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    # Lookup by ID first, then by matching name
    item = CANONICAL_MENU.get(item_id)
    if not item and body.name:
        for k, v in CANONICAL_MENU.items():
            if v.get("name", "").strip().lower() == body.name.strip().lower():
                item = v
                item_id = k
                break

    if not item:
        item = {
            "id": item_id,
            "name": body.name.strip() if body.name else "Dish",
            "english_name": body.english_name.strip() if body.english_name else (body.name.strip() if body.name else "Dish"),
            "gujarati_name": body.gujarati_name.strip() if body.gujarati_name else None,
            "price": float(body.price) if body.price is not None else 0.0,
            "category": body.category or "Other",
            "cuisine": body.cuisine or "south_indian",
            "description": body.description.strip() if body.description else "",
            "is_available": body.is_available if body.is_available is not None else True,
            "is_jain_available": body.is_jain_available if body.is_jain_available is not None else True,
            "prep_time_mins": body.prep_time_mins or 10,
            "image_url": body.image_url,
            "tags": []
        }
        CANONICAL_MENU[item_id] = item
    else:
        if body.name is not None:
            item["name"] = body.name.strip()
        if body.english_name is not None:
            item["english_name"] = body.english_name.strip()
        if body.gujarati_name is not None:
            item["gujarati_name"] = body.gujarati_name.strip()
        if body.price is not None:
            item["price"] = float(body.price)
        if body.category is not None:
            item["category"] = body.category
        if body.cuisine is not None:
            item["cuisine"] = body.cuisine
        if body.is_available is not None:
            item["is_available"] = body.is_available
        if body.is_jain_available is not None:
            item["is_jain_available"] = body.is_jain_available
        if body.prep_time_mins is not None:
            item["prep_time_mins"] = body.prep_time_mins
        if body.description is not None:
            item["description"] = body.description.strip()
        if body.image_url is not None:
            item["image_url"] = body.image_url
        if body.original_price is not None:
            item["original_price"] = float(body.original_price)
        if body.final_price is not None:
            item["final_price"] = float(body.final_price)
        if body.has_discount is not None:
            item["has_discount"] = bool(body.has_discount)
        if body.discount_percent is not None:
            item["discount_percent"] = float(body.discount_percent)

    # PERMANENT CLOUD PERSISTENCE: Update in Supabase Cloud PostgreSQL DB
    if settings.SUPABASE_SERVICE_ROLE_KEY and settings.SUPABASE_URL:
        try:
            api_key = settings.SUPABASE_SERVICE_ROLE_KEY
            headers = {
                "apikey": api_key,
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            }
            base_url = f"{settings.SUPABASE_URL}/rest/v1"

            patch_data = {}
            if body.name is not None:
                patch_data["name"] = body.name.strip()
            if body.gujarati_name is not None:
                patch_data["gujarati_name"] = body.gujarati_name.strip()
            if body.price is not None:
                patch_data["price"] = float(body.price)
            if body.description is not None:
                patch_data["description"] = body.description.strip()
            if body.image_url is not None:
                patch_data["image_url"] = body.image_url
            if body.is_available is not None:
                patch_data["is_available"] = body.is_available
            if body.is_jain_available is not None:
                patch_data["is_jain_available"] = body.is_jain_available

            if patch_data:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    target_name = item.get("name")
                    upd_resp = await client.patch(
                        f"{base_url}/menu_items?name=eq.{target_name}",
                        headers=headers,
                        json=patch_data
                    )
                    if upd_resp.status_code not in [200, 204]:
                        await client.patch(
                            f"{base_url}/menu_items?id=eq.{item_id}",
                            headers=headers,
                            json=patch_data
                        )
        except Exception as sup_err:
            print(f"[SUPABASE] Menu item update error: {sup_err}")

    save_custom_menu()

    emp_name = current_user.get("name", "Staff") if current_user else "Staff"
    emp_role = current_user.get("role", "Staff") if current_user else "Staff"
    await log_admin_action(
        employee_name=emp_name,
        employee_role=emp_role,
        action_type="MENU_ITEM_UPDATED",
        details=f"Updated menu item {item_id} ({item['name']})"
    )

    return MenuItemResponse(**item)

@router.delete("/{item_id}", summary="Delete Menu Item")
async def delete_menu_item(
    item_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    removed = None
    if item_id in CANONICAL_MENU:
        removed = CANONICAL_MENU.pop(item_id)
    else:
        for k, v in CANONICAL_MENU.items():
            if v.get("name", "").strip().lower() == item_id.strip().lower():
                removed = CANONICAL_MENU.pop(k)
                break

    # PERMANENT CLOUD PERSISTENCE: Delete from Supabase Cloud PostgreSQL DB
    if settings.SUPABASE_SERVICE_ROLE_KEY and settings.SUPABASE_URL:
        try:
            api_key = settings.SUPABASE_SERVICE_ROLE_KEY
            headers = {
                "apikey": api_key,
                "Authorization": f"Bearer {api_key}"
            }
            base_url = f"{settings.SUPABASE_URL}/rest/v1"
            async with httpx.AsyncClient(timeout=8.0) as client:
                target_dish_name = removed.get("name") if removed else item_id
                await client.delete(f"{base_url}/menu_items?name=eq.{target_dish_name}", headers=headers)
                await client.delete(f"{base_url}/menu_items?id=eq.{item_id}", headers=headers)
        except Exception as sup_err:
            print(f"[SUPABASE] Menu item delete error: {sup_err}")

    save_custom_menu()
    emp_name = current_user.get("name", "Staff") if current_user else "Staff"
    emp_role = current_user.get("role", "Staff") if current_user else "Staff"
    await log_admin_action(
        employee_name=emp_name,
        employee_role=emp_role,
        action_type="MENU_ITEM_DELETED",
        details=f"Deleted menu item {item_id} ({removed.get('name', 'Dish') if removed else item_id})"
    )
    return {"success": True, "message": f"Menu item {item_id} deleted successfully"}
