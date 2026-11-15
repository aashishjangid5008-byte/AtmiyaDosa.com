from typing import Optional
from pydantic import BaseModel, Field

class DiningTable(BaseModel):
    id: str
    number: str
    capacity: int = 4
    zone: Optional[str] = None
    status: str = "available"  # available, occupied, billing, reserved
    current_order_id: Optional[str] = None
    timing: Optional[str] = None
    created_at: Optional[str] = None
