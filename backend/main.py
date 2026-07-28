from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Request
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

import models
import schemas
import auth
from database import engine, get_db

# Crea las tablas en la base de datos (En producción usar Alembic)
models.Base.metadata.create_all(bind=engine)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="V1si0n - API de Control de Calidad")
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

# Configuración de CORS ultrasegura
origins = [
    "http://localhost:3000",
    "http://localhost:5173", # Vite
    "http://localhost:8501", # Streamlit (por si acaso)
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
        token_data = schemas.TokenData(username=username)
    except auth.JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
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
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# ================= USER CRUD (ADMIN ONLY) =================
@app.get("/users", response_model=List[schemas.User])
def get_users(db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    return db.query(models.User).all()

@app.post("/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed_password, role=user.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user_update.role is not None:
        db_user.role = user_update.role
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
    return {"message": "Usuario eliminado correctamente"}

# ================= SCANNER & LOGS =================
@app.post("/predict")
async def predict_defect(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Formato de archivo inválido. Solo JPG/PNG.")
    
    # Aquí iría la lógica de IA (YOLOv8 real) - MOCK
    # simulando que procesa y halla defectos:
    defects = [
        {"type": "Missing Hole", "confidence": 0.95, "bbox": [10, 20, 50, 60]},
        {"type": "Short Circuit", "confidence": 0.88, "bbox": [100, 120, 150, 160]}
    ]
    status_label = "Defectuoso" if defects else "OK"
    
    # Guardar en Bitácora
    scan_log = models.ScanLog(
        user_id=current_user.id,
        filename=file.filename,
        status=status_label,
        defects_json=json.dumps(defects)
    )
    db.add(scan_log)
    db.commit()
    db.refresh(scan_log)

    return {
        "status": "success",
        "message": "Imagen procesada y guardada en bitácora",
        "filename": file.filename,
        "inspector": current_user.username,
        "defects": defects,
        "scan_id": scan_log.id
    }

@app.get("/scans", response_model=List[schemas.ScanLog])
def get_scans(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Los inspectores solo ven los suyos? o el admin ve todos?
    # Para el ejemplo, todos ven todo, pero podríamos filtrarlo.
    return db.query(models.ScanLog).order_by(models.ScanLog.timestamp.desc()).all()

@app.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    total_scans = db.query(models.ScanLog).count()
    defective_scans = db.query(models.ScanLog).filter(models.ScanLog.status == "Defectuoso").count()
    ok_scans = db.query(models.ScanLog).filter(models.ScanLog.status == "OK").count()
    
    return {
        "total": total_scans,
        "defectuoso": defective_scans,
        "ok": ok_scans
    }

# ================= OLLAMA CHATBOT =================
@app.post("/chat", response_model=schemas.ChatResponse)
async def chat_with_ollama(req: schemas.ChatRequest, current_user: models.User = Depends(get_current_user)):
    system_prompt = (
        "Eres V1si0n, un asistente de IA especializado estrictamente en control de calidad de placas "
        "de circuito impreso (PCBs). Solo puedes responder preguntas relacionadas con PCBs, electrónica, "
        "YOLOv8, visión por computadora y calidad industrial. Si te preguntan otra cosa, debes decir de "
        "forma educada que no puedes responder porque tu propósito es exclusivo para V1si0n y PCBs."
    )
    
    try:
        response = ollama.chat(model='llama3', messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': req.message},
        ])
        return {"response": response['message']['content']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ollama local no disponible: {str(e)}")

# ================= SETUP =================
@app.post("/setup-admin", response_model=schemas.User)
def create_admin(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password, role="admin")
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
