# Agente de Conocimiento Empresarial — Santos Pegasus Soluciones

Sistema de inteligencia artificial RAG que permite a los colaboradores consultar documentación interna en lenguaje natural. Incluye búsqueda vectorial, generación de respuestas con IA e interfaz web moderna.

[![README](https://img.shields.io/badge/docs-README-blue)](README.md)
[![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

### Demo en video

> 📹 **[Ver demostración del sistema](https://youtu.be/tu-video-aqui)**
> *(Agrega aquí el enlace a tu video de demostración)*

---

### Documentos de conocimiento indexados

Estos son los 5 documentos internos que el agente consulta para responder preguntas:

| # | Documento |
|---|-----------|
| 1 | Manual de Onboarding para Nuevos Desarrolladores.pdf |
| 2 | Santo Pegasus Soluciones Guía Oficial de Ingeniería Backend.pdf |
| 3 | Santo Pegasus Soluciones Guía Oficial de Ingeniería FrontEnd.pdf |
| 4 | PROTOCOLO DE RESPUESTA A INCIDENTES Y POST-MORTEMS.pdf |
| 5 | Arquitectura de Microservicios y Mapa de Dominios.pdf |

---

## Índice

1. [Tecnologías](#tecnologías)
2. [Arquitectura](#arquitectura)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Pipeline RAG](#pipeline-rag)
5. [Usuarios y roles](#usuarios-y-roles)
6. [Requisitos previos](#requisitos-previos)
7. [Configuración](#configuración)
8. [Ejecución local](#ejecución-local)
9. [Ejecución con Docker](#ejecución-con-docker)
10. [Endpoints de la API](#endpoints-de-la-api)
11. [Pruebas QA](#pruebas-qa)
12. [Agregar documentos](#agregar-documentos)
13. [Búsqueda web con Tavily](#búsqueda-web-con-tavily)

---

## Tecnologías

| Capa | Tecnología | Versión | Para qué sirve |
|------|-----------|---------|----------------|
| Backend | Python + FastAPI | 3.12 / 0.115 | API REST y lógica RAG |
| Chat (LLM) | Cohere command-a-03-2025 | 5.11 | Genera las respuestas en lenguaje natural |
| Embeddings | Cohere embed-multilingual-v3.0 | 5.11 | Convierte texto en vectores de 1024 dims |
| Base vectorial | ChromaDB | 0.6.3 | Almacena y busca fragmentos por similitud |
| PDFs | PyPDF2 | 3.0.1 | Extrae texto de los documentos internos |
| Búsqueda web | Tavily | 0.5.0 | Complemento web opcional |
| Frontend | React 18 + Vite | 18 / 5.4 | Interfaz de usuario |
| Estilos | Tailwind CSS | 3.4 | Diseño visual |
| Routing | React Router v6 | 6.21 | Navegación entre páginas |
| Iconos | Lucide React | 0.469 | Íconos del sistema |
| Pruebas | pytest + TestClient | 8.3 | Suite QA automatizada |
| Contenedores | Docker + Compose | — | Despliegue reproducible |

---

## Arquitectura

El proyecto usa **arquitectura hexagonal** (Ports & Adapters). El dominio central no depende de ningún framework — Cohere, ChromaDB y los archivos JSON se inyectan desde el `orchestrator.py` hacia adentro.

```
┌──────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                      │
│   Login → Dashboard → Chat → Documentos → Perfil → Admin │
│                    servicios/api.js                        │
└─────────────────────────┬────────────────────────────────┘
                          │ HTTP / JSON
┌─────────────────────────▼────────────────────────────────┐
│                    BACKEND (FastAPI)                       │
│                                                            │
│   api.py ──► orchestrator.py ──► ServicioAgente           │
│                                        │                   │
│              DOMINIO (puro)            │                   │
│              entities.py · ports.py ◄─┘                   │
│                                                            │
│              INFRAESTRUCTURA (adaptadores)                 │
│              ClienteIA · ChromaDB · RepositorioUsuarios    │
└────────────────────────────────────────────────────────────┘
```

---

## Estructura del proyecto

```
Enterprise_AI_Knowledge_Agent/
├── .env                          ← Claves API y configuración
├── docker-compose.yml
│
├── BackEnd/
│   ├── requirements.txt
│   ├── data/usuarios.json        ← Usuarios y historial (sin BD externa)
│   └── app/
│       ├── main.py               ← Arranque FastAPI
│       ├── api.py                ← Endpoints REST
│       ├── orchestrator.py       ← Composition Root (inyección de dependencias)
│       ├── schemas.py            ← Modelos Pydantic
│       ├── domain/
│       │   ├── entities.py       ← FragmentoDocumento, ResultadoConsulta
│       │   └── ports.py          ← Interfaces abstractas
│       ├── infrastructure/
│       │   ├── repositorio_documentos.py
│       │   ├── repositorio_vectorial.py  ← ChromaDB
│       │   └── repositorio_usuarios.py   ← JSON local
│       └── services/
│           ├── cliente_ia.py              ← Cohere (chat + embeddings)
│           ├── servicio_agente.py         ← Caso de uso principal
│           ├── servicio_rag.py            ← Pipeline RAG
│           ├── servicio_tavily.py         ← Búsqueda web
│           └── procesamiento_documentos.py
│
├── FrontEnd/
│   ├── vite.config.js            ← Proxy /api → localhost:8000
│   └── src/
│       ├── App.jsx               ← Rutas protegidas
│       ├── contextos/AuthContexto.jsx
│       ├── servicios/api.js      ← Todas las llamadas al backend
│       ├── componentes/
│       │   ├── Sidebar.jsx
│       │   └── RutaProtegida.jsx
│       └── paginas/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Chat.jsx          ← Chat con historial de conversaciones
│           ├── Documentos.jsx
│           ├── IndiceVectorial.jsx
│           ├── Perfil.jsx        ← Editar perfil y contraseña
│           └── Admin.jsx         ← Solo para el rol admin
│
├── Docs/                         ← Los 5 PDFs fuente de conocimiento
│
└── QA/
    └── tests/test_api.py         ← 63 pruebas automatizadas
```

---

## Pipeline RAG

Flujo completo desde la pregunta hasta la respuesta:

```
Pregunta del usuario
        │
        ▼
1. Embedding de la consulta
   Cohere embed-multilingual-v3.0 → vector 1024 dims
        │
        ▼
2. Búsqueda semántica en ChromaDB
   Similitud coseno (HNSW) · Top 5 fragmentos · Umbral ≥ 0.25
        │
        ▼
3. Búsqueda web con Tavily (opcional)
   Solo si está habilitado + consulta técnica + confianza docs ≥ 0.25
        │
        ▼
4. Construcción del prompt
   Rol del agente + historial (4 msgs) + contexto + pregunta
        │
        ▼
5. Generación con Cohere command-a-03-2025
   Temperatura 0.2 · Máx 1024 tokens
        │
        ▼
6. Respuesta al usuario
   Texto + fuente + citas + nivel de confianza
```

**Chunking de documentos:**
- Fragmentos de 400 palabras con 60 de solapamiento
- Lotes de 90 textos por llamada a la API (evita el rate limit del plan trial)
- Deduplicación automática — no se reindexan fragmentos ya existentes

---

## Usuarios y roles

Los usuarios se guardan en `BackEnd/data/usuarios.json`, sin base de datos externa.

### Credenciales

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `Admin2024!` | Administrador completo |
| `backend` | `Backend2024!` | Desarrollador backend |
| `frontend` | `Frontend2024!` | Desarrollador frontend |
| `fullstack` | `Fullstack2024!` | Acceso técnico completo |

### Qué puede ver cada rol

| Documento | admin | fullstack | backend | frontend |
|-----------|:-----:|:---------:|:-------:|:--------:|
| Manual de Onboarding | ✓ | ✓ | ✓ | ✓ |
| Guía Backend | ✓ | ✓ | ✓ | — |
| Guía FrontEnd | ✓ | ✓ | — | ✓ |
| Protocolo de Incidentes | ✓ | ✓ | — | — |
| Arquitectura y Microservicios | ✓ | ✓ | ✓ | ✓ |

### Panel de administración (solo `admin`)

- Estadísticas de uso por usuario
- Editar perfil y cambiar contraseña de cualquier usuario
- Activar / inactivar cuentas
- Subir nuevos documentos al sistema

---

## Requisitos previos

- **Python 3.12** — ChromaDB no soporta Python 3.14 todavía
- **Node.js 20+**
- **Clave de Cohere** — [dashboard.cohere.com/api-keys](https://dashboard.cohere.com/api-keys)
- **Clave de Tavily** (opcional) — [app.tavily.com](https://app.tavily.com)

Para confirmar que tienes Python 3.12:
```cmd
py -0
```

---

## Configuración

Edita el archivo `.env` en la raíz del proyecto:

```env
# Obligatorio
COHERE_API_KEY=tu-clave-cohere-aqui
COHERE_MODELO_CHAT=command-a-03-2025
COHERE_MODELO_EMBEDDING=embed-multilingual-v3.0

# Opcional — búsqueda web
TAVILY_API_KEY=tu-clave-tavily-aqui
TAVILY_HABILITADO=false

# ChromaDB
CHROMA_DIRECTORIO_PERSISTENCIA=./chroma_db
CHROMA_COLECCION=santos_pegasus_conocimiento

# Documentos
DOCUMENTOS_DIRECTORIO=../Docs
CHUNK_TAMANO=400
CHUNK_SOLAPAMIENTO=60
```

> El plan trial de Cohere tiene límite de 100 llamadas/minuto. El sistema lo maneja automáticamente con reintentos y batch embeddings.

---

## Ejecución local

**Paso 1 — Crear entorno virtual con Python 3.12:**
```cmd
py -3.12 -m venv .venv
.venv\Scripts\activate
```

**Paso 2 — Instalar dependencias:**
```cmd
pip install -r BackEnd\requirements.txt
```

**Paso 3 — Configurar la clave de Cohere en `.env`**

**Paso 4 — Iniciar el backend:**
```cmd
cd BackEnd
py -3.12 -m uvicorn app.main:app --reload --port 8000
```

La primera vez indexa los PDFs automáticamente (1–3 minutos). Las siguientes veces arranca en segundos.

**Paso 5 — Iniciar el frontend (nueva terminal):**
```cmd
cd FrontEnd
npm install
npm run dev
```

**Paso 6 — Abrir en el navegador:**
```
http://localhost:5173
```

---

## Ejecución con Docker

```cmd
docker compose up --build
```

| Servicio | URL |
|---------|-----|
| Frontend | http://localhost:80 |
| Backend | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

```cmd
docker compose down
```

---

## Endpoints de la API

Documentación interactiva completa: `http://localhost:8000/docs`

### Sistema
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/salud` | Health check |
| `GET` | `/api/validar-api` | Verifica la clave de Cohere |
| `GET` | `/api/estado-indice` | Estado de ChromaDB |

### Documentos
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/indexar` | Indexa los PDFs en ChromaDB |
| `GET` | `/api/documentos/listar/{username}` | Documentos visibles para el usuario |
| `POST` | `/api/documentos/upload` | Sube un PDF nuevo (solo admin) |

### Agente RAG
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/agente/consultar` | Consulta principal — ejecuta el pipeline RAG |

```json
// Body de ejemplo
{
  "pregunta": "¿Cuánto dura el proceso de onboarding?",
  "id_conversacion": "conv-20260101120000000000",
  "username": "backend"
}
```

### Auth y usuarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Iniciar sesión |
| `GET` | `/api/usuarios` | Listar usuarios |
| `POST` | `/api/usuarios/cambiar-contrasena` | Cambiar contraseña |
| `POST` | `/api/usuarios/actualizar-perfil` | Actualizar nombre y email |
| `POST` | `/api/usuarios/actualizar-estado` | Activar / inactivar cuenta |

### Historial de chat
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/chat/conversacion` | Nueva conversación |
| `GET` | `/api/chat/historial/{username}` | Historial del usuario |
| `GET` | `/api/chat/conversacion/{username}/{conv_id}` | Mensajes de una conversación |
| `DELETE` | `/api/chat/conversacion/{username}/{conv_id}` | Eliminar conversación |

### Admin
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/estadisticas` | Estadísticas de uso del sistema |

---

## Pruebas QA

```cmd
cd QA
py -3.12 -m pytest tests/ -v
```

**63 pruebas pasando.** No requieren claves de API reales — usan dobles de prueba.

| Clase | Tests | Qué verifica |
|-------|-------|--------------|
| `TestSalud` | 4 | Health check, versión |
| `TestValidarApi` | 5 | Clave Cohere válida/inválida |
| `TestEstadoIndice` | 5 | Fragmentos, documentos, índice vacío |
| `TestDocumentosPorRol` | 6 | Visibilidad por rol |
| `TestConsultarAgente` | 11 | RAG completo, validaciones, historial |
| `TestAuth` | 5 | Login, credenciales incorrectas, roles |
| `TestHistorialChat` | 5 | Crear/obtener/eliminar conversaciones |
| `TestIndexar` | 3 | 503 sin clave, 200 con clave |
| `TestDominio` | 7 | Entidades puras del dominio |
| `TestServicioRag` | 8 | Pipeline RAG, saludos, fuera de ámbito |
| `TestServicioProcesamiento` | 3 | Chunking, IDs únicos |
| `TestOrquestador` | 2 | Directorio de documentos |

---

## Agregar documentos

1. Copia el PDF al directorio `Docs/`
2. En el frontend: **Índice vectorial → Indexar nuevos documentos**

O por terminal:
```cmd
curl -X POST http://localhost:8000/api/indexar -H "Content-Type: application/json" -d "{\"forzar_reindexacion\": false}"
```

Para reindexar todo desde cero:
```cmd
curl -X POST http://localhost:8000/api/indexar -H "Content-Type: application/json" -d "{\"forzar_reindexacion\": true}"
```

---

## Búsqueda web con Tavily

Deshabilitada por defecto. Para activarla:

1. Obtén tu clave en [app.tavily.com](https://app.tavily.com)
2. En `.env`: `TAVILY_HABILITADO=true` y agrega tu `TAVILY_API_KEY`
3. Reinicia el backend

El sistema consulta la web solo cuando la pregunta es técnica, hay confianza mínima en los documentos internos y no es un tema fuera de ámbito (deportes, entretenimiento, etc.). Los documentos internos siempre son la fuente principal.
