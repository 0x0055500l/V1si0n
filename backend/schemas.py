from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- ROLES ---
class RoleBase(BaseModel):
    name: str
    description: str

class RoleCreate(RoleBase):
    pass

class Role(RoleBase):
    id: int
    class Config:
        from_attributes = True

# --- USERS ---
class UserBase(BaseModel):
    username: str
    role_id: int = 1

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    role_id: Optional[int] = None
    is_active: Optional[bool] = None

class User(BaseModel):
    id: int
    username: str
    is_active: bool
    role: Role
    dashboard_config: Optional[str] = "{}"
    class Config:
        from_attributes = True

class UserUpdateConfig(BaseModel):
    dashboard_config: str

# --- PRODUCTION LINES ---
class ProductionLineBase(BaseModel):
    name: str
    location: str

class ProductionLineCreate(ProductionLineBase):
    pass

class ProductionLine(ProductionLineBase):
    id: int
    class Config:
        from_attributes = True

# --- PCB MODELS ---
class PcbModelBase(BaseModel):
    name: str
    description: str

class PcbModelCreate(PcbModelBase):
    pass

class PcbModel(PcbModelBase):
    id: int
    class Config:
        from_attributes = True

# --- DEFECT DICTIONARY ---
class DefectDictionaryBase(BaseModel):
    name: str
    severity: str
    description: str

class DefectDictionaryCreate(DefectDictionaryBase):
    pass

class DefectDictionary(DefectDictionaryBase):
    id: int
    class Config:
        from_attributes = True

# --- SCAN DEFECTS ---
class ScanDefectBase(BaseModel):
    defect_id: int
    confidence: float
    bbox_x1: float
    bbox_y1: float
    bbox_x2: float
    bbox_y2: float

class ScanDefectCreate(ScanDefectBase):
    pass

class ScanDefect(ScanDefectBase):
    id: int
    scan_id: int
    defect: DefectDictionary
    class Config:
        from_attributes = True

# --- SCAN LOGS ---
class ScanLogBase(BaseModel):
    filename: str
    status: str
    production_line_id: int
    pcb_model_id: int

class ScanLogCreate(ScanLogBase):
    pass

class ScanLog(ScanLogBase):
    id: int
    user_id: int
    timestamp: datetime
    defects: List[ScanDefect] = []

    class Config:
        from_attributes = True

# --- AUTH & CHAT ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

class ChatHistory(BaseModel):
    id: int
    role: str
    content: str
    timestamp: datetime
    class Config:
        from_attributes = True

class PromptLibrary(BaseModel):
    id: int
    title: str
    content: str
    class Config:
        from_attributes = True

class NotificationBase(BaseModel):
    type: str
    message: str
    is_read: bool = False

class Notification(NotificationBase):
    id: int
    timestamp: datetime
    class Config:
        from_attributes = True

class SystemConfigBase(BaseModel):
    key: str
    value: str

class SystemConfig(SystemConfigBase):
    id: int
    class Config:
        from_attributes = True
