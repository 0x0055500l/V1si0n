# 🚀 V1si0n - Sistema Experto de Control de Calidad con IA

V1si0n es un sistema moderno, responsivo y ultraseguro diseñado para la detección automatizada de defectos en Placas de Circuito Impreso (PCBs) utilizando Inteligencia Artificial (Visión por Computadora).

## 🌟 Nuevas Características (Fase 2)
- **Dashboard Estadístico:** Gráficas interactivas y dinámicas (basadas en Recharts) que muestran la tasa de éxito y tipos de defectos en tiempo real.
- **Asistente de IA Local (Chatbot):** Un chatbot integrado conectado a un modelo de lenguaje local (Ollama) entrenado para responder estrictamente a dudas sobre calidad y PCBs, sin salirse del contexto.
- **Bitácora de Inspecciones:** Registro detallado y persistente en base de datos de cada PCB analizado.
- **Roles y Gestión de Usuarios (CRUD):** El sistema diferencia entre "Inspectores" (solo operan el escáner) y "Administradores" (pueden crear, editar o eliminar usuarios).

## 🏗️ Arquitectura del Proyecto

El proyecto está dividido en tres componentes principales para asegurar escalabilidad y mantenibilidad:

- **/frontend**: Interfaz web interactiva construida con **React** y **Vite**. Diseñada con un enfoque estético premium (Glassmorphism, Dark Mode). Conectada directamente a la API backend.
- **/backend**: API robusta desarrollada con **FastAPI** y **PostgreSQL**. Se encarga de la seguridad, Rate Limiting, manejo de sesiones (JWT), gestión de usuarios, almacenamiento de bitácoras e inferencia del modelo.
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
> **Nota de Acceso:** Para ingresar, usa el usuario `admin` y la contraseña `admin123`.

### 2. Backend (API, Base de Datos y Ollama)
Requiere [Python 3.8+](https://www.python.org/) y PostgreSQL instalado. También requiere [Ollama](https://ollama.com/) corriendo en segundo plano si deseas usar el Chatbot.

```bash
# Estando en la carpeta raíz (V1si0n)
python -m venv venv
# Activar entorno virtual
# En Windows: venv\Scripts\activate
# En Linux/Mac: source venv/bin/activate

# Entrar a backend e instalar dependencias
cd backend
pip install -r requirements.txt
```
*(Nota: El proyecto usa `bcrypt==3.2.0` específicamente por temas de compatibilidad con `passlib`).*

**Configuración de Base de Datos:**
Asegúrate de tener un servidor PostgreSQL corriendo en el puerto por defecto (5432).
1. Actualiza el archivo `backend/database.py` (o tu `.env`) con tus credenciales:
   `DATABASE_URL="postgresql://usuario:contraseña@localhost/v1si0n"`
2. Puedes ejecutar el script proporcionado para automatizar la creación de la DB: `python create_db.py`.
3. Crea el usuario de pruebas ejecutando: `python create_admin.py` (esto creará el usuario `admin` con contraseña `admin123`).

**Ejecución:**
```bash
# Estando en la carpeta backend, usa el entorno virtual de la raíz:
..\venv\Scripts\python.exe -m uvicorn main:app --reload
```
La API estará disponible en `http://localhost:8000`.

### 3. Inteligencia Artificial (Entrenamiento YOLOv8 Local)
El modelo de visión artificial se entrena localmente para aprovechar la potencia computacional de tu máquina.

1. Abre el script `ai/train_yolov8.py`.
2. Asegúrate de tener instalado Python y las dependencias (el script intentará instalarlas).
3. Configura tu API Key de Roboflow en el script si necesitas descargar el dataset.
4. Ejecuta el script localmente: `python ai/train_yolov8.py`.
5. El modelo resultante (`best.pt`) se guardará localmente y podrás integrarlo directamente al Backend.

---

## 🔒 Características de Seguridad (Nivel Senior)

- **Prevención de Fuerza Bruta (Rate Limiting):** Se implementó `slowapi` limitando el endpoint de login (`/token`) a un máximo de **5 intentos por minuto por IP**.
- **Encabezados de Seguridad (HTTP Headers):** Middleware configurado con protección XSS (`X-XSS-Protection`), prevención de Sniffing MIME (`X-Content-Type-Options: nosniff`), bloqueo de Iframes/Clickjacking (`X-Frame-Options: DENY`) y `Strict-Transport-Security`.
- **Autenticación con JWT:** Tokens de acceso (JSON Web Tokens) persistentes configurados con un tiempo de expiración estricto de **1 hora**. El Frontend gestiona este ciclo de vida de forma automática verificando la validez del token en cada recarga de página.
- **Contraseñas Seguras:** Hashing mediante `bcrypt` integrado en PostgreSQL, sin almacenar las contraseñas en texto plano.
- **Validación de Datos y Manejo de Errores Genéricos:** Uso estricto de Pydantic. Los errores de login muestran "Usuario o contraseña incorrectos", previniendo la enumeración de usuarios válidos.
- **Acceso Basado en Roles (RBAC):** Las funciones administrativas y de edición están protegidas por endpoints que validan estrictamente el rol del token JWT.

---
*Desarrollado para la clase de Inteligencia Artificial.*
