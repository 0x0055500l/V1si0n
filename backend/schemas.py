from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    role: str = "inspector"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class ScanLogBase(BaseModel):
    filename: str
    status: str
    defects_json: str

class ScanLogCreate(ScanLogBase):
    pass

class ScanLog(ScanLogBase):
    id: int
    user_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
