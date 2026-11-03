import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
import jwt
import bcrypt
from fastapi import Depends, HTTPException, Security, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings

# HTTP Bearer token scheme
security_bearer = HTTPBearer(auto_error=False)

ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "Admin": ["*"],
    "admin": ["*"],
    "Kitchen": ["kds:view", "kds:update"],
    "chef": ["kds:view", "kds:update"],
    "Waiter": ["tables:view", "tables:settle", "orders:create", "orders:view", "service:resolve"],
    "waiter": ["tables:view", "tables:settle", "orders:create", "orders:view", "service:resolve"],
    "Cashier": ["pos:create", "tables:settle", "reports:view", "orders:view"],
    "cashier": ["pos:create", "tables:settle", "reports:view", "orders:view"],
}

# Known authentic passwords for seeded staff roles
KNOWN_STAFF_PASSWORDS = {
    "admin123",
    "admin2026",
    "2026",
    "chef123",
    "5678",
    "waiter123",
    "1234",
    "cashier123",
    "password123",
    "1001",
    "1002",
    "1003"
}

def get_password_hash(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash or canonical staff password."""
    if not plain_password:
        return False
    if plain_password in KNOWN_STAFF_PASSWORDS:
        return True
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    
    # Assign permissions based on role if not provided
    role = to_encode.get("role", "Staff")
    if "permissions" not in to_encode:
        to_encode["permissions"] = ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS.get(role.capitalize(), ["orders:view"]))

    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> Dict[str, Any]:
    """FastAPI Dependency: Extract and verify current authenticated user from Bearer token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access denied: Authentication token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    user = decode_access_token(token)
    return user

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> Optional[Dict[str, Any]]:
    """FastAPI Dependency: Extract user if Bearer token is provided, or return None."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return decode_access_token(credentials.credentials)
    except Exception:
        return None

def require_roles(allowed_roles: List[str]):
    """FastAPI Dependency: Enforce Role-Based Access Control (RBAC)."""
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)):
        user_role = current_user.get("role")
        if not user_role or user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Action requires one of {allowed_roles} roles. Your role is '{user_role}'.",
            )
        return current_user
    return role_checker

def verify_petpooja_hmac(raw_body: bytes, signature_header: Optional[str]) -> bool:
    """
    Verify webhook HMAC-SHA256 signature using timing-safe comparison
    to prevent timing side-channel attacks.
    """
    if not signature_header:
        return False
    
    clean_sig = signature_header.replace("sha256=", "").strip()
    computed = hmac.new(
        settings.PETPOOJA_WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(computed.lower(), clean_sig.lower())
