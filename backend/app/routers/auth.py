import time
import secrets
import smtplib
from email.message import EmailMessage
from fastapi import APIRouter, HTTPException, status, Depends, Request
from app.config import settings
from app.schemas.auth import (
    LoginRequest, TokenResponse, UserProfile, VerifyTokenResponse,
    SendOtpRequest, SendOtpResponse, VerifyOtpRequest, StaffSignupRequest
)
from app.database import find_staff_member, register_new_staff, log_admin_action, RESTAURANT_ID
from app.security import verify_password, get_password_hash, create_access_token, get_current_user, ROLE_PERMISSIONS

router = APIRouter(prefix="/auth", tags=["Staff Authentication"])

PRIMARY_OWNER_EMAIL = "ranadarshit99@gmail.com"

# In-memory OTP storage: email -> { "otp": str, "expires_at": float, "attempts": int, "role": str }
_OTP_STORE: dict = {}

@router.post("/login", response_model=TokenResponse, summary="Staff Authentication Login")
async def login(request: Request, body: LoginRequest):
    """
    Authenticate staff (Admin, Kitchen Chef, Cashier, Waiter) and return signed JWT.
    Enforces server-side credentials check, strict primary admin restrictions, and audit logging.
    """
    input_identifier = body.username.strip()
    user = find_staff_member(input_identifier)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid staff credentials or account not found."
        )

    # Server-side security enforcement: Only primary owner can access Admin role
    requested_role = (body.role or user["role"]).strip().lower()
    if requested_role in ["admin", "owner"]:
        user_email = user.get("email", "").lower()
        if user_email != PRIMARY_OWNER_EMAIL.lower() and user["username"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Security Exception: Only primary owner ({PRIMARY_OWNER_EMAIL}) has access to the Admin Executive Panel."
            )

    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid staff password or PIN code."
        )

    # Resolve permissions
    role_name = user["role"]
    perms = ROLE_PERMISSIONS.get(role_name, ROLE_PERMISSIONS.get(role_name.capitalize(), ["orders:view"]))

    # Issue 12-hour signed JWT token
    token_data = {
        "sub": user["username"],
        "email": user.get("email", ""),
        "name": user["name"],
        "role": role_name,
        "permissions": perms,
        "restaurant": "Atmiya Dosa Hub",
        "restaurant_id": RESTAURANT_ID,
        "is_primary_owner": user.get("is_primary_owner", False)
    }
    token = create_access_token(token_data)

    client_ip = request.client.host if request.client else "unknown"
    await log_admin_action(
        employee_name=user["name"],
        employee_role=role_name,
        action_type="STAFF_LOGIN",
        details=f"Staff member {user['name']} logged in as {role_name} from IP {client_ip}"
    )

    profile = UserProfile(
        name=user["name"],
        username=user["username"],
        email=user.get("email", ""),
        role=role_name,
        waiter_id=user.get("waiter_id"),
        permissions=perms,
        restaurant="Atmiya Dosa Hub",
        restaurant_id=RESTAURANT_ID,
        is_primary_owner=user.get("is_primary_owner", False)
    )

    return TokenResponse(
        success=True,
        token=token,
        token_type="bearer",
        expires_in_hours=12,
        user=profile
    )

@router.get("/me", response_model=UserProfile, summary="Get Current Authenticated Staff Profile")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Retrieve profile and role permissions of current token holder."""
    role_name = current_user.get("role", "Staff")
    perms = current_user.get("permissions") or ROLE_PERMISSIONS.get(role_name, ["orders:view"])
    return UserProfile(
        name=current_user.get("name", "Staff"),
        username=current_user.get("sub", ""),
        email=current_user.get("email", ""),
        role=role_name,
        permissions=perms,
        restaurant=current_user.get("restaurant", "Atmiya Dosa Hub"),
        restaurant_id=current_user.get("restaurant_id", RESTAURANT_ID),
        is_primary_owner=current_user.get("is_primary_owner", False)
    )

@router.get("/verify", response_model=VerifyTokenResponse, summary="Validate Active Staff JWT Token")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """Verify that the caller's JWT token is authentic, non-expired, and valid."""
    role_name = current_user.get("role", "Staff")
    perms = current_user.get("permissions") or ROLE_PERMISSIONS.get(role_name, ["orders:view"])
    profile = UserProfile(
        name=current_user.get("name", "Staff"),
        username=current_user.get("sub", ""),
        email=current_user.get("email", ""),
        role=role_name,
        permissions=perms,
        restaurant=current_user.get("restaurant", "Atmiya Dosa Hub"),
        restaurant_id=current_user.get("restaurant_id", RESTAURANT_ID),
        is_primary_owner=current_user.get("is_primary_owner", False)
    )
    return VerifyTokenResponse(valid=True, user=profile)

@router.post("/logout", summary="Staff Logout Audit")
async def logout(current_user: dict = Depends(get_current_user)):
    """Log staff logout action in audit records."""
    await log_admin_action(
        employee_name=current_user.get("name", "Staff"),
        employee_role=current_user.get("role", "Staff"),
        action_type="STAFF_LOGOUT",
        details=f"Staff member {current_user.get('name')} logged out."
    )
    return {"success": True, "message": "Successfully logged out."}


# ---------------------------------------------------------------------------
# FREE EMAIL OTP AUTHENTICATION ENGINE (GMAIL SMTP / PYTHON STANDARD LIBRARY)
# ---------------------------------------------------------------------------

def dispatch_otp_email(to_email: str, otp: str, role: str, purpose: str = "login") -> tuple[bool, str, bool]:
    """
    Sends a 6-digit OTP code to the recipient using Python's built-in smtplib
    and Gmail/Hostinger/Domain SMTP server.
    
    Includes official branding and references to OptiMap Solution (optimapsolution.com).
    If SMTP_PASSWORD is not set, securely logs the OTP to server terminal and allows dev preview.
    """
    is_signup = purpose.lower() == "signup"
    subject_title = "Staff Account Registration" if is_signup else "Staff Login Verification"
    subject_line = f"Atmiya POS • {otp} is your verification code (optimapsolution.com)"
    action_text = f"verify your email and activate your <strong>{role.upper()}</strong> staff profile" if is_signup else f"authenticate into the <strong>{role.upper()}</strong> live terminal"

    # 1. Dev / Offline Simulated Fallback if SMTP password is not set
    if not settings.SMTP_PASSWORD:
        print(f"\n=======================================================")
        print(f"[AUTH OTP] 📨 FREE EMAIL OTP GENERATED FOR: {to_email}")
        print(f"[AUTH OTP] 🔑 VERIFICATION CODE: {otp}")
        print(f"[AUTH OTP] ⏱️  VALIDITY: 5 MINUTES (ROLE: {role.upper()} | PURPOSE: {purpose.upper()})")
        print(f"[AUTH OTP] 🌐 POWERED BY: OptiMap Solution (optimapsolution.com)")
        print(f"[AUTH OTP] ⚠️  SMTP_PASSWORD is empty in backend/.env!")
        print(f"[AUTH OTP] ℹ️  To deliver directly to your Gmail inbox, add your Google App Password to backend/.env")
        print(f"=======================================================\n")
        return True, f"Code generated for {to_email} (Dev code: {otp} • See backend/.env to enable real email)", True

    # 2. Live SMTP Dispatch via TLS (587) or SSL (465)
    try:
        msg = EmailMessage()
        msg["Subject"] = subject_line
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USERNAME}>"
        msg["To"] = to_email

        plain_text = f"""Atmiya Dosa Hub - Cloud POS System
Powered by OptiMap Solution (optimapsolution.com)

Your verification code is: {otp}

This code will expire in 5 minutes.
Action: {subject_title} ({role.upper()})

If you did not request this code, please ignore this email or contact support at info@optimapsolution.com.

Visit OptiMap Solution: https://optimapsolution.com
"""
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
            .container {{ max-width: 490px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .header-badge {{ display: inline-block; background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }}
            .brand {{ font-size: 20px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 0.05em; }}
            .brand-sub {{ font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 20px; }}
            .brand-sub a {{ color: #2563eb; text-decoration: none; }}
            .title {{ font-size: 19px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }}
            .desc {{ font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 24px; }}
            .otp-box {{ background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px; }}
            .otp-label {{ font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 6px; }}
            .otp-code {{ font-size: 34px; font-weight: 900; letter-spacing: 0.25em; color: #0f172a; font-family: 'SF Mono', Monaco, Consolas, monospace; }}
            .validity {{ font-size: 12px; color: #ea580c; font-weight: 600; text-align: center; margin-bottom: 24px; }}
            .company-card {{ background: #f1f5f9; border-radius: 10px; padding: 14px 16px; margin-top: 24px; font-size: 12px; color: #334155; line-height: 1.5; }}
            .company-card strong {{ color: #0f172a; }}
            .company-card a {{ color: #ea580c; font-weight: 600; text-decoration: none; }}
            .footer {{ font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; line-height: 1.6; }}
            .footer a {{ color: #64748b; text-decoration: underline; }}
          </style>
        </head>
        <body>
          <div class="container">
            <span class="header-badge">Security Verification</span>
            <div class="brand">Atmiya Dosa Hub</div>
            <div class="brand-sub">Cloud POS Engine • Powered by <a href="https://optimapsolution.com" target="_blank">OptiMap Solution</a></div>
            
            <div class="title">{subject_title}</div>
            <p class="desc">Enter the 6-digit security code below to {action_text}.</p>
            
            <div class="otp-box">
              <div class="otp-label">One-Time Verification Code</div>
              <div class="otp-code">{otp}</div>
            </div>
            
            <div class="validity">⏱️ Valid for 5 minutes • Single-use staff credential</div>

            <div class="company-card">
              <strong>Engineered by OptiMap Solution</strong><br>
              Enterprise cloud infrastructure & restaurant POS solutions.<br>
              Official Website: <a href="https://optimapsolution.com" target="_blank">optimapsolution.com</a>
            </div>

            <div class="footer">
              This automated security email was dispatched for <strong>Atmiya Dosa Hub POS</strong>.<br>
              © 2026 <a href="https://optimapsolution.com" target="_blank">OptiMap Solution</a>. All rights reserved.
            </div>
          </div>
        </body>
        </html>
        """

        msg.set_content(plain_text)
        msg.add_alternative(html_content, subtype="html")

        # Connect to SMTP (supports 465 SSL and 587 TLS)
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=12) as server:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=12) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)

        print(f"[AUTH OTP] Successfully sent verification email to {to_email} via {settings.SMTP_SERVER} (OptiMap Solution)")
        return True, f"Verification code sent to {to_email}", False

    except Exception as exc:
        print(f"[AUTH OTP ERROR] SMTP Delivery error: {exc}. Falling back to console OTP.")
        print(f"[AUTH OTP FALLBACK] 🔑 CODE FOR {to_email}: {otp}")
        print(f"[AUTH OTP FALLBACK] 🌐 POWERED BY: OptiMap Solution (optimapsolution.com)")
        return True, f"Code generated for {to_email} (Dev test code: {otp})", True


@router.post("/otp/send", response_model=SendOtpResponse, summary="Generate & Send Free Email OTP")
async def send_email_otp(body: SendOtpRequest):
    """
    Generates a secure 6-digit one-time password and delivers it via Gmail SMTP.
    Valid for 5 minutes. Supports both 'login' and 'signup' flows.
    """
    raw_email = body.email.strip().lower()
    if not raw_email or "@" not in raw_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid email address is required to receive the verification OTP."
        )

    role = (body.role or "waiter").strip().lower()
    purpose = (body.purpose or "login").strip().lower()

    # Enforce admin restriction: Only primary owner can request OTP for admin role
    if role in ["admin", "owner"]:
        if raw_email != PRIMARY_OWNER_EMAIL.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Security Exception: Only primary owner ({PRIMARY_OWNER_EMAIL}) has access to Admin role."
            )

    # For signup, check if email is already registered
    if purpose == "signup":
        existing_user = find_staff_member(raw_email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A staff account with this email is already registered. Please sign in instead."
            )

    # Generate secure 6-digit OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = time.time() + 300  # 5 minutes validity

    # Store in server memory
    _OTP_STORE[raw_email] = {
        "otp": otp_code,
        "expires_at": expires_at,
        "attempts": 0,
        "role": role,
        "purpose": purpose
    }

    # Dispatch email
    success, message, is_simulated = dispatch_otp_email(raw_email, otp_code, role, purpose=purpose)

    return SendOtpResponse(
        success=True,
        message=message,
        email=raw_email,
        expires_in_seconds=300,
        is_simulated=is_simulated,
        dev_code=otp_code if (is_simulated and not settings.is_production) else None
    )


@router.post("/otp/verify", response_model=TokenResponse, summary="Verify OTP & Issue JWT Session")
async def verify_email_otp(request: Request, body: VerifyOtpRequest):
    """
    Authoritatively checks the entered OTP code against the server-generated record.
    If valid, marks identity verified and returns signed JWT token.
    """
    raw_email = body.email.strip().lower()
    entered_otp = body.otp.strip()

    record = _OTP_STORE.get(raw_email)
    
    # Allow master test OTP (e.g. '202600') during development or if matched
    now = time.time()
    is_valid = False

    if record:
        if now > record["expires_at"]:
            _OTP_STORE.pop(raw_email, None)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new code."
            )

        if record["attempts"] >= 5:
            _OTP_STORE.pop(raw_email, None)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many invalid attempts. Code invalidated for security. Please request a new code."
            )

        if entered_otp == record["otp"]:
            is_valid = True
        else:
            record["attempts"] += 1

    # Dev master code fallback for rapid testing if record expired
    if not is_valid and not settings.is_production and entered_otp == "202600":
        is_valid = True

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code. Please check your email and try again."
        )

    # Code is valid! Consume it so it cannot be reused
    saved_role = record["role"] if record else (body.role or "admin").strip().lower()
    _OTP_STORE.pop(raw_email, None)

    # Resolve Staff Profile
    user = find_staff_member(raw_email)
    if not user:
        if raw_email == PRIMARY_OWNER_EMAIL.lower() or saved_role in ["admin", "owner"]:
            user = {
                "name": "Darshit Rana",
                "username": "admin",
                "email": PRIMARY_OWNER_EMAIL,
                "role": "admin",
                "is_primary_owner": True
            }
        elif saved_role == "waiter":
            user = {
                "name": "Riya Patel",
                "username": "waiter_1",
                "email": raw_email,
                "role": "waiter",
                "is_primary_owner": False
            }
        else:
            user = {
                "name": "Suresh Chef",
                "username": "chef_1",
                "email": raw_email,
                "role": "chef",
                "is_primary_owner": False
            }

    role_name = user["role"]
    perms = ROLE_PERMISSIONS.get(role_name, ["orders:view"])

    # Issue 12-hour signed JWT token
    token_data = {
        "sub": user["username"],
        "email": user.get("email", raw_email),
        "name": user["name"],
        "role": role_name,
        "permissions": perms,
        "restaurant": "Atmiya Dosa Hub",
        "restaurant_id": RESTAURANT_ID,
        "is_primary_owner": user.get("is_primary_owner", False),
        "auth_method": "EMAIL_OTP"
    }
    token = create_access_token(token_data)

    client_ip = request.client.host if request.client else "unknown"
    await log_admin_action(
        employee_name=user["name"],
        employee_role=role_name,
        action_type="STAFF_LOGIN_OTP",
        details=f"Staff member {user['name']} logged in via Free Email OTP from IP {client_ip}"
    )

    profile = UserProfile(
        name=user["name"],
        username=user["username"],
        email=user.get("email", raw_email),
        role=role_name,
        permissions=perms,
        restaurant="Atmiya Dosa Hub",
        restaurant_id=RESTAURANT_ID,
        is_primary_owner=user.get("is_primary_owner", False)
    )

    return TokenResponse(
        success=True,
        token=token,
        token_type="bearer",
        expires_in_hours=12,
        user=profile
    )


@router.post("/register", response_model=TokenResponse, summary="Direct Staff Registration")
async def register_staff_member(request: Request, body: StaffSignupRequest):
    """
    Registers a new staff member (Waiter, Kitchen Chef, Cashier) directly.
    Instantly hashes their password/PIN, persists their profile, and returns a signed JWT session.
    """
    raw_email = body.email.strip().lower()
    name = body.name.strip()
    role = (body.role or "waiter").strip().lower()
    password = body.password.strip()

    if not name or len(name) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid staff name (at least 2 characters)."
        )

    if not password or len(password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password / PIN must be at least 4 characters for POS security."
        )

    # Restrict Admin registration: Only primary owner can be Admin
    if role in ["admin", "owner"] and raw_email != PRIMARY_OWNER_EMAIL.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security Exception: Admin owner account cannot be registered here."
        )

    # Check if staff member with this email already exists
    existing = find_staff_member(raw_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A staff account with this email is already registered. Please sign in instead."
        )

    # Hash password & register staff directly
    password_hash = get_password_hash(password)
    user = register_new_staff(
        name=name,
        email=raw_email,
        role=role,
        password_hash=password_hash,
        phone=body.phone or ""
    )

    role_name = user["role"]
    perms = ROLE_PERMISSIONS.get(role_name, ROLE_PERMISSIONS.get(role_name.capitalize(), ["orders:view"]))

    # Issue signed 12-hour JWT
    token_data = {
        "sub": user["username"],
        "email": user["email"],
        "name": user["name"],
        "role": role_name,
        "permissions": perms,
        "restaurant": "Atmiya Dosa Hub",
        "restaurant_id": RESTAURANT_ID,
        "is_primary_owner": False,
        "auth_method": "STAFF_DIRECT_SIGNUP"
    }
    token = create_access_token(token_data)

    client_ip = request.client.host if request.client else "unknown"
    await log_admin_action(
        employee_name=user["name"],
        employee_role=role_name,
        action_type="STAFF_REGISTERED",
        details=f"New staff account created for {user['name']} ({role_name}) from IP {client_ip}"
    )

    profile = UserProfile(
        name=user["name"],
        username=user["username"],
        email=user["email"],
        role=role_name,
        permissions=perms,
        restaurant="Atmiya Dosa Hub",
        restaurant_id=RESTAURANT_ID,
        is_primary_owner=False
    )

    return TokenResponse(
        success=True,
        token=token,
        token_type="bearer",
        expires_in_hours=12,
        user=profile
    )


