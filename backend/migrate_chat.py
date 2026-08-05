import psycopg2
from psycopg2 import sql

def migrate():
    conn = psycopg2.connect(
        dbname="v1si0n",
        user="postgres",
        password="Besos0312.",
        host="localhost",
        port="5432"
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    try:
        print("Creating chat_sessions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        print("Adding session_id to chat_histories...")
        cursor.execute("""
            ALTER TABLE chat_histories 
            ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE
        """)
        
        print("Migration successful.")
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
