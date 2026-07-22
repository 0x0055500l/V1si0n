import argparse
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import auth

def create_admin(username, password):
    # Ensure tables are created
    models.Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        db_user = db.query(models.User).filter(models.User.username == username).first()
        if db_user:
            print(f"El usuario '{username}' ya existe.")
            return

        hashed_password = auth.get_password_hash(password)
        db_user = models.User(username=username, hashed_password=hashed_password, role="admin")
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        print(f"Usuario admin '{username}' creado exitosamente.")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Crear usuario administrador")
    parser.add_argument("--username", type=str, default="admin", help="Nombre de usuario")
    parser.add_argument("--password", type=str, default="admin123", help="Contraseña")
    args = parser.parse_args()
    
    create_admin(args.username, args.password)
