# 🚀 V1si0n - Sistema Experto de Control de Calidad con IA

V1si0n es un sistema moderno, responsivo y ultraseguro diseñado para la detección automatizada de defectos en Placas de Circuito Impreso (PCBs) utilizando Inteligencia Artificial (Visión por Computadora).

## 🌟 Nuevas Características (Fases 2, 3, 4 y 5)
- **Registro de Actividad (Auditoría):** Módulo para roles administrativos que registra el uso del sistema, guardando accesos, metadatos, IP local y timestamps, con filtros y exportación (PDF/Excel).
- **Miniaturas (Thumbnails) Optimizadas:** Los escaneos en la bitácora ahora comprimen y muestran visualmente mediante un recuadro dinámico (base64) la imagen analizada para referencia rápida y visual con función de Zoom.
- **Soporte Multilingüe Completo (i18n):** Interfaz disponible 100% en Inglés y Español con cambio en tiempo real, abarcando paneles, reportes PDF/Excel y prompts dinámicos de IA.
- **Alertas Visuales Avanzadas (Pillow):** Las notificaciones por Telegram y SMTP incluyen directamente la fotografía escaneada superpuesta con Cajas Selectoras (Bounding Boxes) rojas donde la IA encontró el defecto.
- **Sistema de Chat Avanzado (IA Local):** Múltiples sesiones de chat guardadas y un modo "Chat Secreto" autodestructible, protegido por contraseña. Inyección dinámica del modelo seleccionado y del idioma (con respuesta estricta en el idioma solicitado).
- **Configuraciones Avanzadas y Seguridad:** Panel de ajustes para parámetros críticos (SMTP, Telegram) y módulo de usuarios (CRUD) protegido por tokens JWT y prevención concurrente de sesiones.
- **Recuperación de Contraseña:** Flujo nativo de recuperación mediante correos de reseteo con códigos seguros y expiración temporal.
- **Dashboard Estadístico Responsivo:** Gráficas interactivas y dinámicas (basadas en Recharts) que muestran la tasa de éxito y tipos de defectos con diseño Glassmorphism y soporte Dark/Light Mode.
- **Notificaciones Ricas (SMTP/Telegram):** Alertas en tiempo real que incluyen adjuntos de las imágenes escaneadas con la región del defecto detectado.
- **Bitácora de Inspecciones con Exportación:** Registro detallado con capacidad de descargar reportes multilingües en PDF y Excel, totalmente responsivo.
- **Seguridad Robusta:** Prevención Anti-DevTools activa en producción, roles granulares (Admin e Inspector), y cifrado bcrypt.
- **Despliegue en Red Local (LAN):** Resolución dinámica de endpoints para permitir el acceso al sistema desde cualquier dispositivo de la red WiFi utilizando la IP local de la computadora principal.

## 📊 Diagramas del Sistema

### 1. Diagrama de Casos de Uso
```mermaid
flowchart LR
    A((Admin))
    I((Inspector))

    subgraph "Sistema V1si0n"
        UC1([Login / Recuperación de Contraseña])
        UC2([Gestión de Usuarios y Seguridad - CRUD])
        UC3([Configuraciones del Sistema y Alertas])
        UC4([Escaneo de PCB estático - Foto])
        UC5([Escaneo de PCB en Vivo - WebSockets])
        UC6([Visualizar Dashboard Estadístico])
        UC7([Ver y Exportar Bitácora a PDF/Excel])
        UC8([Chatear con Asistente IA - Soporte Multi-idioma])
        UC9([Notificaciones Automáticas Ricas - Telegram/SMTP])
    end

    A --> UC1
    A --> UC2
    A --> UC3
    A --> UC4
    A --> UC5
    A --> UC6
    A --> UC7
    A --> UC8

    I --> UC1
    I --> UC4
    I --> UC5
    I --> UC6
    I --> UC7
    I --> UC8
    
    UC4 -.-> UC9
    UC5 -.-> UC9
```

### 2. Diagrama Entidad-Relación (Base de Datos PostgreSQL)
```mermaid
erDiagram
    Role ||--o{ User : "tiene"
    User ||--o{ ScanLog : "realiza"
    User ||--o{ ChatSession : "crea"
    ChatSession ||--o{ ChatHistory : "contiene"
    ProductionLine ||--o{ ScanLog : "monitorea"
    PcbModel ||--o{ ScanLog : "escaneado_en"
    ScanLog ||--o{ ScanDefect : "encuentra"
    DefectDictionary ||--o{ ScanDefect : "categoriza"
    
    Role {
        int id PK
        string name
        string description
    }
    User {
        int id PK
        string username
        string email
        string hashed_password
        boolean is_active
        string dashboard_config
        string session_token
        string reset_code
        datetime reset_expires
        int role_id FK
    }
    ProductionLine {
        int id PK
        string name
        string location
    }
    PcbModel {
        int id PK
        string name
        string description
    }
    DefectDictionary {
        int id PK
        string name
        string severity
        string description
    }
    ScanLog {
        int id PK
        string filename
        string status
        datetime timestamp
        int user_id FK
        int production_line_id FK
        int pcb_model_id FK
    }
    ScanDefect {
        int id PK
        float confidence
        float bbox_x1
        float bbox_y1
        float bbox_x2
        float bbox_y2
        int scan_id FK
        int defect_id FK
    }
    ChatSession {
        int id PK
        string title
        datetime timestamp
        int user_id FK
    }
    ChatHistory {
        int id PK
        string role
        text content
        datetime timestamp
        int session_id FK
        int user_id FK
    }
    Notification {
        int id PK
        string type
        text message
        boolean is_read
        datetime timestamp
    }
    SystemConfig {
        int id PK
        string key
        string value
    }
```

## 🏗️ Arquitectura del Proyecto

El proyecto está dividido en tres componentes principales para asegurar escalabilidad, mantenibilidad y rendimiento en tiempo real:

```mermaid
flowchart TD
    subgraph Frontend - React & Vite
        UI[Interfaz de Usuario]
        WS_Client[WebSocket Client]
        HTTP_Client[HTTP Fetch API]
    end

    subgraph Backend - FastAPI
        API[Rutas REST API]
        WS_Server[WebSocket Server]
        Auth[Autenticación JWT]
        AI[Módulo IA Central]
    end

    subgraph Base de Datos
        DB[(PostgreSQL)]
    end

    subgraph AI Local
        YOLO[Modelos YOLOv8 .pt]
        Llama[Ollama Llama 3.2]
        Whisper[Faster Whisper]
    end

    UI --> HTTP_Client
    UI --> WS_Client

    HTTP_Client -- Peticiones HTTP/REST --> API
    WS_Client -- Transmisión en Vivo --> WS_Server

    API --> Auth
    API --> DB
    WS_Server --> AI

    API --> AI
    
    AI --> YOLO
    AI --> Llama
    AI --> Whisper
    
    API -- Enviar Alertas (Foto) --> SMTP_Telegram[Notificadores SMTP/Telegram]
```

- **/frontend**: Interfaz web interactiva construida con **React** y **Vite**. Diseñada con un enfoque estético premium (Glassmorphism, Dark Mode). Conectada directamente a la API backend.
- **/backend**: API robusta desarrollada con **FastAPI** y **PostgreSQL**. Se encarga de la seguridad, Rate Limiting, manejo de sesiones (JWT), gestión de usuarios, almacenamiento de bitácoras, túneles WebSocket e inferencia del modelo.
- **/ai**: Scripts y utilidades para el entrenamiento local de la Inteligencia Artificial (**YOLOv8**) aprovechando la potencia de tu máquina.

---

## 💻 Inicio Rápido (Despliegue con Docker)

La forma más rápida y recomendada de desplegar el entorno completo de V1si0n es mediante **Docker Compose**. Esto levantará automáticamente la Base de Datos, el Backend y el Frontend en contenedores aislados.

Requiere tener [Docker](https://www.docker.com/) instalado en tu sistema.

```bash
# En la carpeta raíz del proyecto
docker-compose up --build -d
```
Una vez levantado:
- El **Frontend** estará disponible en: `http://localhost:80` (o simplemente `http://localhost`)
- El **Backend (API)** estará en: `http://localhost:8000`
- La **Base de Datos** estará mapeada en el puerto `5432`.

*(Nota: Para que el asistente IA funcione en Docker, debes tener Ollama corriendo localmente. El contenedor ya está configurado para buscar a Ollama en `host.docker.internal`).*

---

## 💻 Inicio Rápido (Desarrollo Local sin Docker)

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
- **Sesión Única:** Se agregó control estricto de sesión. Un usuario inspector solo puede tener una única sesión activa en toda la planta.
- **Protección Anti-DevTools:** En producción, se inhibe el acceso a DevTools (Inspeccionar elemento) usando `disable-devtool`, protegiendo la lógica de negocio y variables de entorno del cliente.
- **Encabezados de Seguridad (HTTP Headers):** Middleware configurado con protección XSS (`X-XSS-Protection`), prevención de Sniffing MIME (`X-Content-Type-Options: nosniff`), bloqueo de Iframes/Clickjacking (`X-Frame-Options: DENY`) y `Strict-Transport-Security`.
- **Autenticación con JWT:** Tokens de acceso (JSON Web Tokens) persistentes configurados con un tiempo de expiración estricto de **1 hora**. El Frontend gestiona este ciclo de vida de forma automática verificando la validez del token en cada recarga de página.
- **Contraseñas Seguras y Flujo de Recuperación:** Hashing mediante `bcrypt` integrado en PostgreSQL. Flujo de "Olvidé mi contraseña" asegurado por tokens de un solo uso con ventana de expiración breve (10 mins).
- **Acceso Basado en Roles (RBAC):** Las funciones administrativas y de edición están protegidas por endpoints que validan estrictamente el rol del token JWT. Los Inspectores son aislados a ver únicamente sus propios escaneos.

---
*Desarrollado para la clase de Inteligencia Artificial por:*
- *Cinthia Paola Paz Alvarado (202310010826)*
- *Sherley Iveth Ochoa López (202210040236)*
- *Samantha Margarita Sabillón Mejia (201210010381 )*
- *Josseth Alejandro Bautista Fuentes (201810020200)*
