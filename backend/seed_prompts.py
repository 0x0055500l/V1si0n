from database import SessionLocal
import models

db = SessionLocal()

try:
    if db.query(models.PromptLibrary).count() == 0:
        p1 = models.PromptLibrary(title="Explicación de Cortocircuito", content="Explícame qué es un cortocircuito en una PCB y por qué es peligroso.")
        p2 = models.PromptLibrary(title="Defectos comunes SMD", content="¿Cuáles son los defectos de fabricación más comunes en soldadura SMD?")
        p3 = models.PromptLibrary(title="YOLOv8 y Visión", content="¿Cómo funciona el modelo YOLOv8 para detección de defectos?")
        
        db.add_all([p1, p2, p3])
        db.commit()
        print("Prompts sembrados con éxito.")
    else:
        print("Los prompts ya existen.")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
