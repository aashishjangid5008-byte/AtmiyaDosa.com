from typing import Optional, List
from pydantic import BaseModel, Field

class PaymentIntentRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount to be paid in INR")
    table_number: str = Field(..., min_length=1, max_length=20, description="Table identifier code, e.g. T04")
    order_id: Optional[str] = Field(default=None, description="Order identifier code, e.g. #ORD1048")
    customer_name: Optional[str] = Field(default="Guest", description="Name of paying guest")
    session_id: Optional[str] = Field(default=None, description="Active dining session ID")
    vpa: Optional[str] = Field(default=None, description="Custom UPI VPA ID (e.g. owner@bank)")
    payee_name: Optional[str] = Field(default=None, description="Custom Payee Name")

class PaymentIntentResponse(BaseModel):
    success: bool = True
    payment_reference: str
    amount: float
    table_number: str
    order_id: Optional[str]
    vpa: str = "ranadarshit99@okicici"
    payee_name: str = "darshit rana"
    upi_intent_url: str
    qr_data_url: str
    expires_in_secs: int = 900

class PaymentVerifyRequest(BaseModel):
    payment_reference: str = Field(..., min_length=1, description="Payment reference ID from intent")
    table_number: str = Field(..., min_length=1, max_length=20)
    order_id: Optional[str] = None
    transaction_id: Optional[str] = Field(default=None, description="Optional bank / UPI UTR reference number")
    method: str = Field(default="UPI", description="UPI | Cash | Card")

class PaymentVerifyResponse(BaseModel):
    success: bool = True
    verified: bool = True
    receipt_id: str
    payment_reference: str
    amount: float
    method: str
    table_number: str
    order_id: Optional[str]
    payment_status: str = "PAID"
    timestamp: str
