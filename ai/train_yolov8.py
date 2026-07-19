# Script para entrenar YOLOv8 Localmente
# Instrucciones: Ejecuta este script en tu máquina local. Se recomienda tener una GPU compatible instalada.

import os
import subprocess
import sys

def install_dependencies():
    print("Instalando ultralytics (YOLOv8)...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "ultralytics", "roboflow"])

def download_dataset():
    # NOTA: Debes reemplazar 'TU_API_KEY' con tu clave real de Roboflow
    # y asegurarte de tener el link correcto del dataset de PCB Defects
    from roboflow import Roboflow
    print("Descargando dataset desde Roboflow...")
    
    # Ejemplo genérico, el usuario deberá actualizar los parámetros:
    rf = Roboflow(api_key="TU_API_KEY_AQUI")
    project = rf.workspace("pcb-defects").project("pcb-defect-detection")
    dataset = project.version(1).download("yolov8")
    return dataset.location

def train_model(data_path):
    from ultralytics import YOLO
    print("Iniciando entrenamiento de YOLOv8...")
    
    # Se recomienda yolov8m.pt (medium) o yolov8l.pt (large) para alta precisión
    model = YOLO("yolov8m.pt")
    
    # Entrenar el modelo
    # Epochs: 100 es un buen punto de partida.
    # imgsz: 640 es el tamaño estándar de imagen.
    results = model.train(
        data=f"{data_path}/data.yaml",
        epochs=100,
        imgsz=640,
        batch=16,
        name="v1si0n_pcb_model",
        device=0 # Usa la GPU local 0. Si no tienes GPU, cambia a device='cpu'
    )
    
    print("Entrenamiento completado.")
    print("El modelo final ha sido guardado en runs/detect/v1si0n_pcb_model/weights/best.pt")

if __name__ == "__main__":
    try:
        import ultralytics
    except ImportError:
        install_dependencies()
        
    # Descomentar cuando tengas la API key de Roboflow
    # dataset_path = download_dataset()
    
    # Suponiendo que el dataset se llama 'dataset' y está en el mismo directorio
    dataset_path = "dataset" 
    
    # train_model(dataset_path)
    print("Por favor, lee los comentarios y ajusta los parámetros antes de ejecutar el entrenamiento local.")
