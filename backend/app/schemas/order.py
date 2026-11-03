from typing import List, Optional
from pydantic import BaseModel, Field

class GuestOrderItem(BaseModel):
    id: str = Field(..., description="Canonical menu item identifier")
    qty: int = Field(default=1, ge=1, le=20, description="Quantity of the item")
    notes: Optional[str] = Field(default=None, max_length=200, description="Special cooking instructions (e.g. Jain, less spicy)")
    modifiers: List[str] = Field(default_factory=list, description="Addons: Extra Butter, Extra Cheese, etc.")

class GuestOrderCreate(BaseModel):
    table_number: str = Field(..., min_length=1, max_length=20, description="Dining table number (e.g. T04, VIP-1)")
    customer_name: Optional[str] = Field(default="Walk-in Guest", max_length=100)
    customer_phone: Optional[str] = Field(default=None, max_length=20, description="Customer 10-digit mobile number")
    items: List[GuestOrderItem] = Field(..., min_length=1, description="List of items ordered")
    coupon_code: Optional[str] = Field(default=None, max_length=30)
    payment_mode: Optional[str] = Field(default="Cash", description="Cash | UPI | Card")
    is_addon: Optional[bool] = Field(default=False, description="Flag indicating if this is an add-on to an existing bill")
    parent_order_id: Optional[str] = Field(default=None, description="Existing Order ID to merge items into")

    # Anti-Bot Honeypot fields
    gotcha: Optional[str] = Field(default=None, alias="_gotcha", description="Honeypot field (must remain empty)")
    anti_bot_token: Optional[str] = Field(default=None, description="Honeypot token")
    submitted_at: Optional[int] = Field(default=None, description="Epoch timestamp of form mount")

class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="Placed | Cooking | Preparing | Ready | Served | Completed | Cancelled")

class OrderItemDetail(BaseModel):
    id: str
    name: str
    price: float
    qty: int
    line_total: float
    notes: Optional[str] = None
    modifiers: List[str] = Field(default_factory=list)

class OrderResponse(BaseModel):
    id: str
    table_number: str
    customer_name: str
    customer_phone: Optional[str] = None
    items: List[OrderItemDetail]
    items_summary: str
    subtotal: float
    discount: float
    tax: float
    total_amount: float
    status: str
    payment_mode: str
    payment_status: str
    placed_at: str
    estimated_time_mins: int = 15

class OrderListResponse(BaseModel):
    success: bool = True
    count: int
    orders: List[OrderResponse]
