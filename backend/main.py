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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from PIL import Image

try:
    from faster_whisper import WhisperModel
    WHISPER_AVAILABLE = True
    whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
except ImportError:
    WHISPER_AVAILABLE = False

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
    # allow_origins=origins,
    allow_origins=["*"], # Permitir todo temporalmente
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

@app.post("/verify-password")
def verify_password_endpoint(req: schemas.PasswordVerifyRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not auth.verify_password(req.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Contraseña incorrecta")
    return {"status": "ok"}

# ================= USER CRUD =================
@app.get("/users", response_model=List[schemas.User])
def get_users(db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    return db.query(models.User).all()

@app.post("/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    hashed_password = auth.get_password_hash(user.password)
    # Default to role_id=2 (inspector) if 1 is admin, or just use user.role_id
    new_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password, role_id=user.role_id)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password, role_id=user.role_id)
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

@app.put("/users/me/dashboard_config")
def update_my_dashboard_config(config: schemas.UserUpdateConfig, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    current_user.dashboard_config = config.dashboard_config
    db.commit()
    db.refresh(current_user)
    return current_user

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
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Formato de archivo inválido. Solo imágenes permitidas.")
    
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
                        # Auto-crear el defecto en el diccionario si la IA encuentra una clase nueva
                        defect_obj = models.DefectDictionary(name=class_name, severity="Media", description="Defecto detectado por IA")
                        db.add(defect_obj)
                        db.commit()
                        db.refresh(defect_obj)
                    
                    if defect_obj:
                        has_defects = True
                        detected_defects.append({
                            "obj": defect_obj,
                            "conf": conf,
                            "bbox": box.xyxyn[0].tolist()
                        })
        except Exception as e:
            print(f"Error en YOLOv8, usando mock: {e}")
            has_defects = True
            defect_obj = db.query(models.DefectDictionary).first()
            if defect_obj:
                detected_defects.append({"obj": defect_obj, "conf": 0.88, "bbox": [0.1, 0.2, 0.3, 0.4]})
    else:
        # MOCK LOGIC si no está best.pt
        defect_obj = db.query(models.DefectDictionary).filter(models.DefectDictionary.name == "Short Circuit").first()
        if not defect_obj:
            defect_obj = db.query(models.DefectDictionary).first()
        
        has_defects = defect_obj is not None
        if has_defects:
            detected_defects.append({"obj": defect_obj, "conf": 0.88, "bbox": [0.1, 0.2, 0.3, 0.4]})
            
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
        
        # Enviar alerta por Correo Electrónico
        smtp_server = db.query(models.SystemConfig).filter(models.SystemConfig.key == "email_smtp_server").first()
        smtp_port = db.query(models.SystemConfig).filter(models.SystemConfig.key == "email_port").first()
        smtp_user = db.query(models.SystemConfig).filter(models.SystemConfig.key == "email_user").first()
        smtp_pass = db.query(models.SystemConfig).filter(models.SystemConfig.key == "email_password").first()
        
        # Obtener correos configurados (separados por coma)
        email_to_cfg = db.query(models.SystemConfig).filter(models.SystemConfig.key == "email_recipient").first()
        recipient_list = []
        if email_to_cfg and email_to_cfg.value:
            recipient_list.extend([e.strip() for e in email_to_cfg.value.split(',') if e.strip()])

        if smtp_server and smtp_user and smtp_pass and recipient_list:
            try:
                server = smtplib.SMTP(smtp_server.value, int(smtp_port.value) if smtp_port else 587)
                server.starttls()
                server.login(smtp_user.value, smtp_pass.value)
                
                body = f"""
                <h2>Alerta de Calidad V1si0n</h2>
                <p><strong>Inspector:</strong> {current_user.username}</p>
                <p><strong>Archivo:</strong> {file.filename}</p>
                <p><strong>Resultado:</strong> Defectuoso</p>
                <p>Por favor revise el panel de control para más detalles.</p>
                """
                
                for recipient in recipient_list:
                    try:
                        msg = MIMEMultipart()
                        msg['From'] = smtp_user.value
                        msg['To'] = recipient
                        msg['Subject'] = f"⚠️ ALERTA V1si0n: Defecto detectado en placa {scan_log.id}"
                        msg.attach(MIMEText(body, 'html'))
                        server.send_message(msg)
                    except Exception as email_err:
                        print(f"No se pudo enviar a {recipient}: {email_err}")
                        
                server.quit()
            except Exception as e:
                print(f"Error en servidor de correo: {e}")

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
    
    # Distribución de defectos
    defect_counts = db.query(models.DefectDictionary.name, func.count(models.ScanDefect.id)).join(
        models.ScanDefect, models.ScanDefect.defect_id == models.DefectDictionary.id
    ).group_by(models.DefectDictionary.name).all()
    
    distribution = [{"name": name, "value": count} for name, count in defect_counts]

    # Desempeño por línea
    line_stats = db.query(models.ProductionLine.name, models.ScanLog.status, func.count(models.ScanLog.id)).join(
        models.ScanLog, models.ScanLog.production_line_id == models.ProductionLine.id
    ).group_by(models.ProductionLine.name, models.ScanLog.status).all()
    
    lines_dict = {}
    for line_name, status, count in line_stats:
        if line_name not in lines_dict:
            lines_dict[line_name] = {"name": line_name, "ok": 0, "defectuoso": 0}
        
        if status == "OK":
            lines_dict[line_name]["ok"] = count
        else:
            lines_dict[line_name]["defectuoso"] = count

    recent = db.query(models.ScanLog).order_by(models.ScanLog.timestamp.desc()).limit(5).all()
    
    return {
        "total": total_scans, 
        "defectuoso": defective_scans, 
        "ok": ok_scans,
        "distribution": distribution,
        "line_performance": list(lines_dict.values()),
        "recent_scans": recent
    }


# ================= OLLAMA CHATBOT =================
@app.get("/chat/sessions", response_model=List[schemas.ChatSession])
def get_chat_sessions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.ChatSession).filter(models.ChatSession.user_id == current_user.id).order_by(models.ChatSession.timestamp.desc()).all()

@app.post("/chat/sessions", response_model=schemas.ChatSession)
def create_chat_session(req: schemas.ChatSessionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    new_session = models.ChatSession(user_id=current_user.id, title=req.title)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@app.get("/chat/sessions/{session_id}/history", response_model=List[schemas.ChatHistory])
def get_session_history(session_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Verify ownership
    session_obj = db.query(models.ChatSession).filter(models.ChatSession.id == session_id, models.ChatSession.user_id == current_user.id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return db.query(models.ChatHistory).filter(models.ChatHistory.session_id == session_id).order_by(models.ChatHistory.timestamp.asc()).all()

@app.get("/prompts", response_model=List[schemas.PromptLibrary])
def get_prompts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.PromptLibrary).all()

@app.post("/chat", response_model=schemas.ChatResponse)
async def chat_with_ollama(req: schemas.ChatRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_scans = db.query(models.ScanLog).count()
    defect_scans = db.query(models.ScanLog).filter(models.ScanLog.status == "Defectuoso").count()
    ok_scans = db.query(models.ScanLog).filter(models.ScanLog.status == "OK").count()
    
    system_prompt = (
        "Eres V1si0n, un asistente de IA especializado estrictamente en control de calidad de placas "
        "de circuito impreso (PCBs). REGLA ESTRICTA: BAJO NINGUNA CIRCUNSTANCIA PUEDES HABLAR DE TEMAS "
        "FUERA DE PCBS, ELECTRÓNICA, YOLOV8, VISIÓN POR COMPUTADORA O CALIDAD INDUSTRIAL. Si el usuario "
        "intenta cambiar de tema o preguntar sobre cosas generales, "
        "debes negarte rotundamente y responder: 'Mi contexto está estrictamente limitado al sistema V1si0n y PCBs. No puedo responder eso'.\n\n"
        "CONTEXTO DEL SISTEMA ACTUAL (puedes usar esto si el usuario pregunta):\n"
        f"- Total de PCBs escaneadas históricamente: {total_scans}\n"
        f"- PCBs Defectuosas encontradas: {defect_scans}\n"
        f"- PCBs OK (Sin defectos): {ok_scans}\n"
        "- Módulos del sistema: Escáner PCB, Bitácora de Inspecciones, Panel de Estadísticas y Chat de IA.\n"
        "- Tu objetivo principal: Ayudar al operario a entender defectos como 'Corto Circuito', 'Exceso de Flux', 'Pines Unidos', dar recomendaciones, y responder dudas sobre las estadísticas actuales del sistema."
    )
    
    # Manejar sesión
    session_id = req.session_id
    if not req.is_ephemeral and not session_id:
        # Create a default session if none provided and not ephemeral
        new_sess = models.ChatSession(user_id=current_user.id, title="Chat " + datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M"))
        db.add(new_sess)
        db.commit()
        db.refresh(new_sess)
        session_id = new_sess.id

    if not req.is_ephemeral:
        # 1. Guardar mensaje de usuario
        user_chat = models.ChatHistory(session_id=session_id, user_id=current_user.id, role="user", content=req.message)
        db.add(user_chat)
        db.commit()

    try:
        # Fetch conversation history to keep context
        history = []
        if not req.is_ephemeral and session_id:
            history = db.query(models.ChatHistory).filter(models.ChatHistory.session_id == session_id).order_by(models.ChatHistory.timestamp.asc()).all()
            
        messages = [{'role': 'system', 'content': system_prompt}]
        for h in history[-10:]: # last 10 messages for context
            messages.append({'role': h.role, 'content': h.content})
            
        if req.is_ephemeral:
            # Add the current user message since it's not in the DB history
            messages.append({'role': 'user', 'content': req.message})
            
        response = ollama.chat(model='llama3.2', messages=messages)
        bot_response = response['message']['content']
        
        if not req.is_ephemeral:
            # 2. Guardar respuesta del asistente
            bot_chat = models.ChatHistory(session_id=session_id, user_id=current_user.id, role="assistant", content=bot_response)
            db.add(bot_chat)
            db.commit()
            
            # Update session timestamp
            sess = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
            if sess:
                sess.timestamp = datetime.datetime.utcnow()
                db.commit()
        
        return {"response": bot_response, "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ollama local no disponible: {str(e)}")

@app.post("/speech-to-text")
async def speech_to_text(audio: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    if not WHISPER_AVAILABLE:
        raise HTTPException(status_code=500, detail="Faster-Whisper no está instalado o falló al cargar.")
    
    # Guardar audio en memoria o temporal
    temp_file = f"/tmp/audio_{current_user.id}.webm"
    try:
        with open(temp_file, "wb") as f:
            f.write(await audio.read())
            
        segments, info = whisper_model.transcribe(temp_file, beam_size=5, language="es")
        text = " ".join([segment.text for segment in segments]).strip()
        
        if os.path.exists(temp_file):
            os.remove(temp_file)
            
        return {"text": text}
    except Exception as e:
        if os.path.exists(temp_file):
            os.remove(temp_file)
        raise HTTPException(status_code=500, detail=f"Error transcribiendo audio: {str(e)}")
