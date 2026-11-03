from typing import Optional, List
from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100, description="Staff username or email (e.g. admin, ranadarshit99@gmail.com, waiter, chef)")
    password: str = Field(..., min_length=1, max_length=100, description="Staff password or PIN code")
    role: Optional[str] = Field(default=None, description="Optional requested role hint (admin, kitchen, waiter, cashier)")

class UserProfile(BaseModel):
    name: str
    username: str
    email: str
    role: str
    waiter_id: Optional[str] = None
    permissions: List[str] = []
    restaurant: str = "Atmiya Dosa Hub"
    restaurant_id: str = "11111111-1111-1111-1111-111111111111"
    is_primary_owner: bool = False

class TokenResponse(BaseModel):
    success: bool = True
    token: str
    token_type: str = "bearer"
    expires_in_hours: int = 12
    user: UserProfile

class VerifyTokenResponse(BaseModel):
    valid: bool = True
    user: UserProfile

class SendOtpRequest(BaseModel):
    email: str = Field(..., description="Target email address to receive OTP (e.g. ranadarshit99@gmail.com)")
    role: Optional[str] = Field(default=None, description="Role being accessed (admin, waiter, chef)")
    purpose: Optional[str] = Field(default="login", description="OTP purpose ('login' or 'signup')")

class SendOtpResponse(BaseModel):
    success: bool = True
    message: str
    email: str
    expires_in_seconds: int = 300
    is_simulated: bool = False
    dev_code: Optional[str] = Field(default=None, description="Temporary dev code when SMTP is not configured")

class VerifyOtpRequest(BaseModel):
    email: str = Field(..., description="Target email address")
    otp: str = Field(..., min_length=4, max_length=8, description="6-digit verification OTP")
    role: Optional[str] = Field(default=None, description="Requested role")

class StaffSignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full staff name (e.g. Rohan Sharma)")
    email: str = Field(..., description="Staff email address")
    role: str = Field(..., description="Role: waiter or chef (admin is reserved for owner)")
    password: str = Field(..., min_length=4, max_length=100, description="Password or PIN code")
    otp: Optional[str] = Field(default=None, description="Legacy OTP if provided")
    phone: Optional[str] = Field(default=None, description="Contact phone number")


