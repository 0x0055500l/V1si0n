from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Request, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta
from typing import List
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
import json
import ollama
import os
import requests
import io
from PIL import Image

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

import models
import schemas
import auth
from database import engine, get_db

# Crea las tablas
models.Base.metadata.create_all(bind=engine)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="V1si0n - API de Control de Calidad (Fase 3)")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8501",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except auth.JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role.name != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos de administrador")
    return current_user

@app.post("/token", response_model=schemas.Token)
@limiter.limit("5/minute")
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role.name}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# ================= USER CRUD =================
@app.get("/users", response_model=List[schemas.User])
def get_users(db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    return db.query(models.User).all()

@app.post("/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed_password, role_id=user.role_id)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user_update.role_id is not None:
        db_user.role_id = user_update.role_id
    if user_update.is_active is not None:
        db_user.is_active = user_update.is_active
    db.commit()
    db.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if db_user.id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    db.delete(db_user)
    db.commit()
    return {"message": "Eliminado"}

# ================= CATALOG CRUDs (ADMIN ONLY) =================
@app.get("/roles", response_model=List[schemas.Role])
def get_roles(db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    return db.query(models.Role).all()

# PCB Models
@app.get("/pcb-models", response_model=List[schemas.PcbModel])
def get_pcb_models(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.PcbModel).all()

@app.post("/pcb-models", response_model=schemas.PcbModel)
def create_pcb_model(model: schemas.PcbModelCreate, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    new_model = models.PcbModel(name=model.name, description=model.description)
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model

@app.delete("/pcb-models/{id}")
def delete_pcb_model(id: int, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    obj = db.query(models.PcbModel).filter(models.PcbModel.id == id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return {"status": "ok"}

# Production Lines
@app.get("/production-lines", response_model=List[schemas.ProductionLine])
def get_production_lines(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.ProductionLine).all()

@app.post("/production-lines", response_model=schemas.ProductionLine)
def create_production_line(line: schemas.ProductionLineCreate, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    new_line = models.ProductionLine(name=line.name, location=line.location)
    db.add(new_line)
    db.commit()
    db.refresh(new_line)
    return new_line

@app.delete("/production-lines/{id}")
def delete_production_line(id: int, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    obj = db.query(models.ProductionLine).filter(models.ProductionLine.id == id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return {"status": "ok"}

# Defect Dictionary
@app.get("/defects", response_model=List[schemas.DefectDictionary])
def get_defects(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.DefectDictionary).all()

@app.post("/defects", response_model=schemas.DefectDictionary)
def create_defect(defect: schemas.DefectDictionaryCreate, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    new_defect = models.DefectDictionary(name=defect.name, severity=defect.severity, description=defect.description)
    db.add(new_defect)
    db.commit()
    db.refresh(new_defect)
    return new_defect

@app.delete("/defects/{id}")
def delete_defect(id: int, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    obj = db.query(models.DefectDictionary).filter(models.DefectDictionary.id == id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return {"status": "ok"}


# ================= SYSTEM CONFIG & NOTIFICATIONS =================
@app.get("/config", response_model=List[schemas.SystemConfig])
def get_config(db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    return db.query(models.SystemConfig).all()

@app.put("/config", response_model=schemas.SystemConfig)
def set_config(config: schemas.SystemConfigBase, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    db_config = db.query(models.SystemConfig).filter(models.SystemConfig.key == config.key).first()
    if db_config:
        db_config.value = config.value
    else:
        db_config = models.SystemConfig(key=config.key, value=config.value)
        db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

@app.get("/notifications", response_model=List[schemas.Notification])
def get_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Notification).order_by(models.Notification.timestamp.desc()).limit(20).all()

@app.put("/notifications/{notif_id}/read")
def read_notification(notif_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    notif = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "ok"}


# ================= SCANNER & LOGS =================
@app.post("/predict")
async def predict_defect(
    file: UploadFile = File(...), 
    pcb_model_id: int = Form(...),
    production_line_id: int = Form(...),
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Formato de archivo inválido. Solo JPG/PNG.")
    
    file_bytes = await file.read()
    
    # YOLOv8 Inferencia Real con Fallback
    has_defects = False
    detected_defects = []
    
    model_path = os.path.join(os.path.dirname(__file__), "best.pt")
    if YOLO_AVAILABLE and os.path.exists(model_path):
        try:
            model = YOLO(model_path)
            image = Image.open(io.BytesIO(file_bytes))
            results = model.predict(image)
            
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    class_name = model.names[cls_id]
                    # We need to map class_name to our db defect
                    defect_obj = db.query(models.DefectDictionary).filter(models.DefectDictionary.name == class_name).first()
                    if not defect_obj:
                        # Fallback or create temporary if not exists
                        defect_obj = db.query(models.DefectDictionary).first()
                    
                    if defect_obj:
                        has_defects = True
                        detected_defects.append({
                            "obj": defect_obj,
                            "conf": conf,
                            "bbox": box.xyxy[0].tolist()
                        })
        except Exception as e:
            print(f"Error en YOLOv8, usando mock: {e}")
            has_defects = True
            defect_obj = db.query(models.DefectDictionary).first()
            if defect_obj:
                detected_defects.append({"obj": defect_obj, "conf": 0.88, "bbox": [100.0, 120.0, 150.0, 160.0]})
    else:
        # MOCK LOGIC si no está best.pt
        defect_obj = db.query(models.DefectDictionary).filter(models.DefectDictionary.name == "Short Circuit").first()
        if not defect_obj:
            defect_obj = db.query(models.DefectDictionary).first()
        
        has_defects = defect_obj is not None
        if has_defects:
            detected_defects.append({"obj": defect_obj, "conf": 0.88, "bbox": [100.0, 120.0, 150.0, 160.0]})
            
    status_label = "Defectuoso" if has_defects else "OK"
    
    # 1. Guardar ScanLog
    scan_log = models.ScanLog(
        user_id=current_user.id,
        production_line_id=production_line_id,
        pcb_model_id=pcb_model_id,
        filename=file.filename,
        status=status_label
    )
    db.add(scan_log)
    db.commit()
    db.refresh(scan_log)

    defects_resp = []
    # 2. Guardar ScanDefect y Notificaciones
    if has_defects:
        for d in detected_defects:
            scan_defect = models.ScanDefect(
                scan_id=scan_log.id,
                defect_id=d["obj"].id,
                confidence=d["conf"],
                bbox_x1=d["bbox"][0], bbox_y1=d["bbox"][1], bbox_x2=d["bbox"][2], bbox_y2=d["bbox"][3]
            )
            db.add(scan_defect)
            
            defects_resp.append({
                "type": d["obj"].name,
                "confidence": d["conf"],
                "bbox": d["bbox"]
            })
        db.commit()
        
        # Generar Notificación UI
        notif = models.Notification(
            type="ALERTA_DEFECTO",
            message=f"Defecto encontrado en placa {scan_log.id} ({file.filename}) - Estado: Defectuoso"
        )
        db.add(notif)
        db.commit()
        
        # Enviar alerta Telegram
        bot_token_cfg = db.query(models.SystemConfig).filter(models.SystemConfig.key == "telegram_bot_token").first()
        chat_id_cfg = db.query(models.SystemConfig).filter(models.SystemConfig.key == "telegram_chat_id").first()
        if bot_token_cfg and chat_id_cfg and bot_token_cfg.value and chat_id_cfg.value:
            tg_url = f"https://api.telegram.org/bot{bot_token_cfg.value}/sendMessage"
            tg_data = {
                "chat_id": chat_id_cfg.value,
                "text": f"⚠️ ALERTA V1si0n ⚠️\nInspector: {current_user.username}\nArchivo: {file.filename}\nResultado: Defectuoso\nAcción requerida."
            }
            try:
                requests.post(tg_url, json=tg_data, timeout=5)
            except:
                pass # Ignorar errores de red de telegram

    return {
        "status": "success",
        "message": "Imagen procesada y guardada en bitácora",
        "filename": file.filename,
        "inspector": current_user.username,
        "defects": defects_resp,
        "scan_id": scan_log.id
    }

@app.get("/scans", response_model=List[schemas.ScanLog])
def get_scans(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.ScanLog).order_by(models.ScanLog.timestamp.desc()).all()

@app.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    total_scans = db.query(models.ScanLog).count()
    defective_scans = db.query(models.ScanLog).filter(models.ScanLog.status == "Defectuoso").count()
    ok_scans = db.query(models.ScanLog).filter(models.ScanLog.status == "OK").count()
    return {"total": total_scans, "defectuoso": defective_scans, "ok": ok_scans}


# ================= OLLAMA CHATBOT =================
@app.get("/chat/history", response_model=List[schemas.ChatHistory])
def get_chat_history(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.ChatHistory).filter(models.ChatHistory.user_id == current_user.id).order_by(models.ChatHistory.timestamp.asc()).all()

@app.get("/prompts", response_model=List[schemas.PromptLibrary])
def get_prompts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.PromptLibrary).all()

@app.post("/chat", response_model=schemas.ChatResponse)
async def chat_with_ollama(req: schemas.ChatRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    system_prompt = (
        "Eres V1si0n, un asistente de IA especializado estrictamente en control de calidad de placas "
        "de circuito impreso (PCBs). REGLA ESTRICTA: BAJO NINGUNA CIRCUNSTANCIA PUEDES HABLAR DE TEMAS "
        "FUERA DE PCBS, ELECTRÓNICA, YOLOV8, VISIÓN POR COMPUTADORA O CALIDAD INDUSTRIAL. Si el usuario "
        "intenta cambiar de tema o preguntar sobre cosas generales (matemáticas, historia, chistes, programación general), "
        "debes negarte rotundamente y responder: 'Mi contexto está estrictamente limitado al sistema V1si0n y PCBs. No puedo responder eso'."
    )
    
    # 1. Guardar mensaje de usuario
    user_chat = models.ChatHistory(user_id=current_user.id, role="user", content=req.message)
    db.add(user_chat)
    db.commit()

    try:
        # Fetch conversation history to keep context
        history = db.query(models.ChatHistory).filter(models.ChatHistory.user_id == current_user.id).order_by(models.ChatHistory.timestamp.asc()).all()
        messages = [{'role': 'system', 'content': system_prompt}]
        for h in history[-10:]: # last 10 messages for context
            messages.append({'role': h.role, 'content': h.content})
            
        # We append the current message because history includes it now
        
        response = ollama.chat(model='llama3.2', messages=messages)
        bot_response = response['message']['content']
        
        # 2. Guardar respuesta del asistente
        bot_chat = models.ChatHistory(user_id=current_user.id, role="assistant", content=bot_response)
        db.add(bot_chat)
        db.commit()
        
        return {"response": bot_response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ollama local no disponible: {str(e)}")
