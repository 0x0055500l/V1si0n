import psycopg2
from psycopg2 import sql
from database import engine, SessionLocal
import models
import auth

def create_database():
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="Besos0312.",
        host="localhost",
        port="5432"
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    try:
        cursor.execute(sql.SQL("CREATE DATABASE {}").format(
            sql.Identifier('v1si0n')
        ))
        print("Base de datos 'v1si0n' creada exitosamente.")
    except psycopg2.errors.DuplicateDatabase:
        print("La base de datos 'v1si0n' ya existe.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cursor.close()
        conn.close()

def reset_and_seed_tables():
    print("Borrando todas las tablas (Drop all)...")
    models.Base.metadata.drop_all(bind=engine)
    print("Creando nuevas tablas (Create all)...")
    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Seed Roles
        admin_role = models.Role(name="admin", description="Administrador del sistema")
        inspector_role = models.Role(name="inspector", description="Inspector de calidad (Escaneo)")
        db.add_all([admin_role, inspector_role])
        db.commit()

        # Seed initial admin user
        hashed_password = auth.get_password_hash("admin123")
        admin_user = models.User(username="admin", hashed_password=hashed_password, role_id=admin_role.id)
        db.add(admin_user)
        
        # Seed Production Lines
        line1 = models.ProductionLine(name="Línea Principal A", location="Nave 1")
        line2 = models.ProductionLine(name="Línea Secundaria B", location="Nave 2")
        db.add_all([line1, line2])

        # Seed PCB Models
        pcb1 = models.PcbModel(name="Arduino Uno Rev3", description="Placa estándar")
        pcb2 = models.PcbModel(name="Motherboard X570", description="Placa base avanzada")
        db.add_all([pcb1, pcb2])

        # Seed Defect Dictionary
        def1 = models.DefectDictionary(name="Missing Hole", severity="Alta", description="Falta un agujero (via) en el PCB.")
        def2 = models.DefectDictionary(name="Mouse Bite", severity="Media", description="Falta un pedazo de cobre en el borde de la pista.")
        def3 = models.DefectDictionary(name="Open Circuit", severity="Alta", description="Pista de cobre rota.")
        def4 = models.DefectDictionary(name="Short Circuit", severity="Alta", description="Dos pistas conectadas accidentalmente.")
        def5 = models.DefectDictionary(name="Spur", severity="Baja", description="Protrusión de cobre pequeña en la pista.")
        def6 = models.DefectDictionary(name="Spurious Copper", severity="Baja", description="Cobre suelto en zona vacía.")
        db.add_all([def1, def2, def3, def4, def5, def6])

        db.commit()
        print("Tablas sembradas (Seeded) con éxito!")
    except Exception as e:
        print(f"Error al sembrar datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_database()
    reset_and_seed_tables()
