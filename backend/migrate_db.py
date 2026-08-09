import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn_str = os.getenv("DATABASE_URL", "postgresql://postgres:Besos0312.@localhost/v1si0n")

try:
    conn = psycopg2.connect(conn_str)
    conn.autocommit = True
    cursor = conn.cursor()
    
    # 1. Add thumbnail column to scan_logs if it doesn't exist
    try:
        cursor.execute("ALTER TABLE scan_logs ADD COLUMN thumbnail TEXT;")
        print("Column 'thumbnail' added successfully.")
    except Exception as e:
        print(f"Thumbnail column might already exist: {e}")

    # 2. Let SQLAlchemy create the ActivityLogs table (it creates missing tables on start)
    from database import engine, Base
    import models
    Base.metadata.create_all(bind=engine)
    print("Tables created/updated successfully.")
    
except Exception as e:
    print(f"Error migrating DB: {e}")
