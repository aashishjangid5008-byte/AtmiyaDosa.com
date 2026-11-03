import base64
import html
import os
import time
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Request

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
    Saves the image into frontend/public/uploads (served directly by Vite)
    and backend/uploads (served by FastAPI) so the photo is visible everywhere.
    """
    os.makedirs(FRONTEND_UPLOADS_DIR, exist_ok=True)
    os.makedirs(BACKEND_UPLOADS_DIR, exist_ok=True)

    timestamp = int(time.time() * 1000)
    content = None
    ext = ".jpg"

    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("file")
        if uploaded_file and hasattr(uploaded_file, "filename") and uploaded_file.filename:
            file_ext = os.path.splitext(uploaded_file.filename)[1].lower() or ".jpg"
            ext = file_ext if file_ext in [".jpg", ".jpeg", ".png", ".webp"] else ".jpg"
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
                    elif "webp" in header:
                        ext = ".webp"
                else:
                    base64_str = image_data
                content = base64.b64decode(base64_str)
        except Exception:
            pass

    if not content:
        raise HTTPException(status_code=400, detail="No file or image data provided")

    filename = f"dish_{timestamp}{ext}"
    frontend_path = os.path.join(FRONTEND_UPLOADS_DIR, filename)
    with open(frontend_path, "wb") as f:
        f.write(content)

    backend_path = os.path.join(BACKEND_UPLOADS_DIR, filename)
    with open(backend_path, "wb") as f:
        f.write(content)

    photo_url = f"/uploads/{filename}"
    return {
        "success": True,
        "url": photo_url,
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
        # If item doesn't exist yet, insert it into server repository
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
    if item_id in CANONICAL_MENU:
        removed = CANONICAL_MENU.pop(item_id)
        save_custom_menu()
        emp_name = current_user.get("name", "Staff") if current_user else "Staff"
        emp_role = current_user.get("role", "Staff") if current_user else "Staff"
        await log_admin_action(
            employee_name=emp_name,
            employee_role=emp_role,
            action_type="MENU_ITEM_DELETED",
            details=f"Deleted menu item {item_id} ({removed.get('name', 'Dish')})"
        )
        return {"success": True, "message": f"Menu item {item_id} deleted successfully"}
    
    # Try finding by name if item_id was not the key
    found_key = None
    for k, v in CANONICAL_MENU.items():
        if v.get("name", "").strip().lower() == item_id.strip().lower():
            found_key = k
            break
    
    if found_key:
        removed = CANONICAL_MENU.pop(found_key)
        save_custom_menu()
        return {"success": True, "message": f"Menu item {found_key} deleted successfully"}
        
    return {"success": True, "message": f"Menu item {item_id} removed"}
