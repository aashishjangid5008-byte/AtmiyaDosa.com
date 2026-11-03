import io
import os
import re
from typing import Optional
from fastapi import APIRouter, Response, Request, HTTPException
import qrcode
from qrcode.image.pil import PilImage

from app.database import CANONICAL_TABLES

router = APIRouter(prefix="/qr", tags=["Table QR Codes & Touchless Standees"])

TABLE_SALT = "atmiya_dosa_hub_qr_sec_2026"

def normalize_table_number(val: str) -> str:
    if not val:
        return ""
    digits = re.sub(r"[^0-9]", "", str(val))
    if digits:
        return str(int(digits))
    return str(val).strip().upper()

def generate_table_security_key(table_val: str) -> str:
    """
    Deterministic cryptographic security key matching frontend signature.
    Prevents table tampering (?table=T01 -> ?table=T02).
    """
    norm = normalize_table_number(table_val)
    if not norm:
        return ""
    h = 0x811c9dc5
    s = f"{TABLE_SALT}_table_{norm}_atmiya"
    for ch in s:
        h = (h ^ ord(ch)) & 0xFFFFFFFF
        h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) & 0xFFFFFFFF
    return f"{h:08x}"

def resolve_frontend_base(request: Optional[Request] = None) -> str:
    """
    Dynamically determines the live public domain:
    1. Environment variables: PUBLIC_URL or APP_URL (Cloud Run custom or service URL).
    2. Request headers: x-forwarded-proto + x-forwarded-host (injected by Google Cloud Run).
    3. Fallback to request.base_url.
    """
    env_url = os.environ.get("PUBLIC_URL") or os.environ.get("APP_URL")
    if env_url and env_url.strip():
        return env_url.strip().rstrip("/")

    if request:
        forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        if forwarded_host:
            clean_host = forwarded_host.split(",")[0].strip()
            # Cloud Run terminates TLS at Google frontends
            forwarded_proto = request.headers.get("x-forwarded-proto")
            if not forwarded_proto:
                forwarded_proto = "https" if ("run.app" in clean_host or "appspot.com" in clean_host) else request.url.scheme
            return f"{forwarded_proto}://{clean_host}".rstrip("/")
        
        return str(request.base_url).rstrip("/")

    return "http://localhost:5173"

def build_table_qr_url(table_number: str, request: Optional[Request] = None) -> str:
    clean_num = table_number.strip().upper()
    digits = re.sub(r"[^0-9]", "", clean_num)
    formatted = f"T{int(digits):02d}" if digits else clean_num
    base_url = resolve_frontend_base(request)
    tsec = generate_table_security_key(clean_num)
    return f"{base_url}/?table={formatted}&tsec={tsec}"

@router.get("/{table_number}", summary="Get Table QR Metadata & Direct Menu Link")
async def get_table_qr_meta(table_number: str, request: Request):
    """
    Retrieve QR standee metadata, direct dynamic guest ordering URL,
    and restaurant table details for online Cloud Run deployment.
    """
    clean_num = table_number.strip().upper()
    target_url = build_table_qr_url(clean_num, request)

    table = CANONICAL_TABLES.get(clean_num)
    capacity = table.get("capacity", 4) if table else 4
    zone = table.get("zone", "Main Hall") if table else "Main Hall"

    return {
        "success": True,
        "table_number": clean_num,
        "capacity": capacity,
        "zone": zone,
        "base_url": resolve_frontend_base(request),
        "touchless_url": target_url,
        "security_key": generate_table_security_key(clean_num),
        "purpose": "Touchless table ordering without login barrier. Direct KDS dispatch.",
        "brand": {
            "name": "Atmiya Dosa Hub",
            "tagline": "Pure Veg • Authentic Taste",
            "location": "Petlad, Gujarat"
        }
    }

@router.get("/{table_number}/image", summary="Generate Dynamic QR Code Standee PNG")
async def generate_table_qr_image(table_number: str, request: Request):
    """
    Dynamically renders high-resolution PNG QR code pointing directly
    to the touchless guest ordering flow for the specified table.
    Works online for any device worldwide on 4G/5G/Wi-Fi.
    """
    clean_num = table_number.strip().upper()
    target_url = build_table_qr_url(clean_num, request)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(target_url)
    qr.make(fit=True)

    img: PilImage = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    png_bytes = buffer.getvalue()

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="AtmiyaDosa-QR-{clean_num}.png"'}
    )
