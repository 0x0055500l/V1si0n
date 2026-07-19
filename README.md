# 🚀 V1si0n - Sistema Experto de Control de Calidad con IA

V1si0n es un sistema moderno, responsivo y ultraseguro diseñado para la detección automatizada de defectos en Placas de Circuito Impreso (PCBs) utilizando Inteligencia Artificial (Visión por Computadora).

## 🏗️ Arquitectura del Proyecto

El proyecto está dividido en tres componentes principales para asegurar escalabilidad y mantenibilidad:

- **/frontend**: Interfaz web interactiva construida con **React** y **Vite**. Diseñada con un enfoque estético premium (Glassmorphism, Dark Mode).
- **/backend**: API robusta desarrollada con **FastAPI** y **PostgreSQL**. Se encarga de la seguridad (autenticación JWT), manejo de usuarios e inferencia del modelo.
- **/ai**: Scripts y utilidades para el entrenamiento local de la Inteligencia Artificial (**YOLOv8**) aprovechando la potencia de tu máquina.

---

## 💻 Inicio Rápido (Desarrollo)

### 1. Frontend (Interfaz Web)
Requiere [Node.js](https://nodejs.org/) instalado.

```bash
cd frontend
npm install
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

### 2. Backend (API & Base de Datos)
Requiere [Python 3.8+](https://www.python.org/) y PostgreSQL instalado.

```bash
cd backend
python -m venv venv
# Activar entorno virtual
# En Windows: venv\Scripts\activate
# En Linux/Mac: source venv/bin/activate

pip install -r requirements.txt
```

**Configuración:**
Debes configurar tu variable de entorno apuntando a tu base de datos:
`DATABASE_URL="postgresql://usuario:contraseña@localhost/v1si0n"`

**Ejecución:**
```bash
uvicorn main:app --reload
```

### 3. Inteligencia Artificial (Entrenamiento YOLOv8 Local)
El modelo de visión artificial se entrena localmente para aprovechar la potencia computacional de tu máquina.

1. Abre el script `ai/train_yolov8.py`.
2. Asegúrate de tener instalado Python y las dependencias (el script intentará instalarlas).
3. Configura tu API Key de Roboflow en el script si necesitas descargar el dataset.
4. Ejecuta el script localmente: `python ai/train_yolov8.py`.
5. El modelo resultante (`best.pt`) se guardará localmente y podrás integrarlo directamente al Backend.

---

## 🔒 Características de Seguridad

- **Autenticación con JWT (JSON Web Tokens):** Las sesiones se manejan de manera asíncrona sin estado.
- **Contraseñas Seguras:** Hashing mediante `bcrypt` (Passlib) integrado en la base de datos PostgreSQL.
- **Validación de Datos:** Uso estricto de esquemas Pydantic y validación de tipos MIME en la subida de imágenes para prevenir inyecciones.
- **CORS Configurado:** Accesos restringidos exclusivamente a los orígenes del frontend.

---
*Desarrollado para la clase de Inteligencia Artificial.*
