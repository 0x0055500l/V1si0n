import psycopg2
from psycopg2 import sql

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

if __name__ == "__main__":
    create_database()
