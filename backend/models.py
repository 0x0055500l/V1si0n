from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, DateTime, Float, Text
from sqlalchemy.orm import relationship
import datetime
from database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # admin, inspector
    description = Column(String)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    role_id = Column(Integer, ForeignKey("roles.id"))

    role = relationship("Role", back_populates="users")
    scans = relationship("ScanLog", back_populates="user")
    chats = relationship("ChatHistory", back_populates="user")


class ProductionLine(Base):
    __tablename__ = "production_lines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    location = Column(String)

    scans = relationship("ScanLog", back_populates="production_line")


class PcbModel(Base):
    __tablename__ = "pcb_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)

    scans = relationship("ScanLog", back_populates="pcb_model")


class DefectDictionary(Base):
    __tablename__ = "defect_dictionary"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # ej: "Short Circuit"
    severity = Column(String) # Baja, Media, Alta
    description = Column(String)

    scan_defects = relationship("ScanDefect", back_populates="defect")


class ScanLog(Base):
    __tablename__ = "scan_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    production_line_id = Column(Integer, ForeignKey("production_lines.id"))
    pcb_model_id = Column(Integer, ForeignKey("pcb_models.id"))
    
    filename = Column(String)
    status = Column(String) # Defectuoso, OK
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="scans")
    production_line = relationship("ProductionLine", back_populates="scans")
    pcb_model = relationship("PcbModel", back_populates="scans")
    defects = relationship("ScanDefect", back_populates="scan")


class ScanDefect(Base):
    __tablename__ = "scan_defects"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scan_logs.id"))
    defect_id = Column(Integer, ForeignKey("defect_dictionary.id"))
    
    confidence = Column(Float)
    bbox_x1 = Column(Float)
    bbox_y1 = Column(Float)
    bbox_x2 = Column(Float)
    bbox_y2 = Column(Float)

    scan = relationship("ScanLog", back_populates="defects")
    defect = relationship("DefectDictionary", back_populates="scan_defects")


class ChatHistory(Base):
    __tablename__ = "chat_histories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String) # 'user' o 'assistant'
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="chats")


class PromptLibrary(Base):
    __tablename__ = "prompts_library"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String) # Email, UI Alert
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class SystemConfig(Base):
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)
