from typing import Optional, List
from pydantic import BaseModel, Field

class ImageUploadRequest(BaseModel):
    image: str
    filename: Optional[str] = None

class MenuItemCreate(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=200)
    english_name: Optional[str] = None
    gujarati_name: Optional[str] = None
    price: float = Field(..., ge=0)
    category: str = Field(..., min_length=1, max_length=100)
    cuisine: Optional[str] = None
    description: Optional[str] = None
    is_available: bool = True
    is_jain_available: bool = True
    prep_time_mins: int = 10
    image_url: Optional[str] = None

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    english_name: Optional[str] = None
    gujarati_name: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0)
    category: Optional[str] = None
    cuisine: Optional[str] = None
    description: Optional[str] = None
    is_available: Optional[bool] = None
    is_jain_available: Optional[bool] = None
    prep_time_mins: Optional[int] = None
    image_url: Optional[str] = None
    original_price: Optional[float] = None
    final_price: Optional[float] = None
    has_discount: Optional[bool] = None
    discount_percent: Optional[float] = None

class MenuItemResponse(BaseModel):
    id: str
    name: str
    english_name: Optional[str] = None
    gujarati_name: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    final_price: Optional[float] = None
    has_discount: bool = False
    discount_percent: float = 0.0
    category: str
    cuisine: Optional[str] = None
    description: Optional[str] = None
    is_available: bool
    is_jain_available: bool = True
    prep_time_mins: int = 10
    image_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

class CategoryResponse(BaseModel):
    id: str
    name: str
    icon: Optional[str] = "Utensils"
    count: int = 0

