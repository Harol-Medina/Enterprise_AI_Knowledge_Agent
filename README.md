# 🧠 Agente de Conocimiento Empresarial — Santos Pegasus Soluciones

> **Sistema de inteligencia artificial RAG** que permite a los colaboradores consultar documentación interna en **lenguaje natural**. Pipeline completo con búsqueda vectorial, generación de respuestas e interfaz moderna.

**Estado**: ✅ Producción  
**Última actualización**: 13 de Julio 2026  
**Versión**: 1.0.0

---

## 📚 Documentación

| Documento | Contenido | Tiempo |
|---|---|---|
| **[INICIO_RAPIDO.md](INICIO_RAPIDO.md)** | 🚀 5 pasos para ejecutar el sistema | 5 min |
| **[ARQUITECTURA.md](ARQUITECTURA.md)** | 🏗️ Diseño hexagonal, flujos RAG, capas | 15 min |
| **README.md** | 📖 Este archivo - referencia completa | 30 min |

---

## Índice

1. [Tecnologías](#tecnologías)
2. [Arquitectura](#arquitectura)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Pipeline RAG](#pipeline-rag)
5. [Sistema de usuarios y roles](#sistema-de-usuarios-y-roles)
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

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| Backend | Python + FastAPI | 3.12 / 0.115 | API REST, lógica RAG |
| LLM — Chat | Cohere command-a-03-2025 | cohere 5.11 | Generación de respuestas |
| LLM — Embeddings | Cohere embed-multilingual-v3.0 | cohere 5.11 | Vectores semánticos 1024 dims |
| Base vectorial | ChromaDB | 0.6.3 | Almacenamiento y búsqueda semántica |
| Extracción PDF | PyPDF2 | 3.0.1 | Lectura de documentos internos |
| Búsqueda web | Tavily | 0.5.0 | Complemento web opcional |
| Frontend | React 18 + Vite | 18 / 5.4 | Interfaz de usuario |
| Estilos | Tailwind CSS | 3.4 | Diseño del frontend |
| Routing | React Router v6 | 6.21 | Navegación por páginas |
| Iconos | Lucide React | 0.469 | Íconos del sistema |
| Pruebas | pytest + FastAPI TestClient | 8.3 | Suite de pruebas QA |
| Contenedores | Docker + Docker Compose | — | Despliegue reproducible |

---

## Arquitectura

El proyecto sigue **arquitectura hexagonal** (Ports & Adapters) tanto en el backend como en el frontend.

### Principio central

El dominio no depende de ningún framework externo. Las dependencias concretas (Cohere, ChromaDB, archivos JSON) se inyectan desde el Composition Root (`orchestrator.py`) hacia adentro, nunca al revés.

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│  Login → Dashboard → Chat → Documentos → Perfil → Admin     │
│               servicios/api.js  (capa HTTP)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP / JSON
┌──────────────────────▼──────────────────────────────────────┐
│                   BACKEND (FastAPI)                          │
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  api.py  │───▶│ Orquestador  │───▶│  ServicioAgente  │  │
│  │(endpoints)│   │(Compos. Root)│    │  ServicioRag     │  │
│  └──────────┘    └──────────────┘    └────────┬─────────┘  │
│                                               │              │
│  ┌─────────────────────────────────────────────▼──────────┐ │
│  │                    DOMINIO (puro)                       │ │
│  │  entities.py  ·  ports.py  (interfaces abstractas)     │ │
│  └────────────────────────┬────────────────────────────── ┘ │
│                            │ implementado por                │
│  ┌─────────────────────────▼────────────────────────────┐   │
│  │               INFRAESTRUCTURA (adaptadores)           │   │
│  │  ClienteIA (Cohere)  ·  RepositorioVectorialChroma    │   │
│  │  RepositorioDocumentosLocal  ·  RepositorioUsuarios   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Estructura del proyecto

```
Enterprise_AI_Knowledge_Agent/
│
├── .env                          ← Variables de entorno (claves API, rutas)
│
├── BackEnd/
│   ├── requirements.txt          ← Dependencias Python
│   ├── Dockerfile
│   ├── data/
│   │   └── usuarios.json         ← Usuarios y historial de chat (persistencia JSON)
│   └── app/
│       ├── main.py               ← Punto de entrada FastAPI (CORS, logging)
│       ├── api.py                ← Todos los endpoints REST
│       ├── orchestrator.py       ← Composition Root (inyección de dependencias)
│       ├── schemas.py            ← Contratos Pydantic entrada/salida
│       │
│       ├── domain/               ← NÚCLEO — sin dependencias externas
│       │   ├── entities.py       ← FragmentoDocumento, ResultadoConsulta, EstadoApiKey
│       │   └── ports.py          ← Interfaces abstractas (puertos)
│       │
│       ├── infrastructure/       ← ADAPTADORES DE SALIDA
│       │   ├── repositorio_documentos.py   ← Lee PDFs del disco
│       │   ├── repositorio_vectorial.py    ← ChromaDB (embeddings + búsqueda)
│       │   └── repositorio_usuarios.py     ← Usuarios y chat (JSON local)
│       │
│       └── services/             ← CASOS DE USO
│           ├── cliente_ia.py               ← Cohere (embeddings + chat)
│           ├── servicio_agente.py          ← Caso de uso principal
│           ├── servicio_rag.py             ← Pipeline RAG completo
│           ├── servicio_tavily.py          ← Búsqueda web complementaria
│           └── procesamiento_documentos.py ← Extracción y chunking de PDFs
│
├── FrontEnd/
│   ├── package.json
│   ├── vite.config.js            ← Proxy /api → localhost:8000 en desarrollo
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx               ← Rutas protegidas con React Router v6
│       ├── main.jsx              ← Punto de entrada React
│       ├── styles.css            ← Estilos globales + clases utilitarias
│       │
│       ├── contextos/
│       │   └── AuthContexto.jsx  ← Estado de autenticación global
│       │
│       ├── servicios/
│       │   └── api.js            ← Todas las llamadas al backend
│       │
│       ├── componentes/
│       │   ├── Sidebar.jsx       ← Barra lateral con nav + historial + usuario
│       │   └── RutaProtegida.jsx ← Layout con sidebar para rutas autenticadas
│       │
│       └── paginas/
│           ├── Login.jsx         ← Pantalla de inicio de sesión
│           ├── Dashboard.jsx     ← Panel principal con métricas
│           ├── Chat.jsx          ← Chat IA con historial de conversaciones
│           ├── Documentos.jsx    ← Lista de documentos del índice
│           ├── IndiceVectorial.jsx ← Gestión de ChromaDB (indexar/reindexar)
│           ├── Perfil.jsx        ← Editar perfil y cambiar contraseña
│           └── Admin.jsx         ← Panel de administración (solo admin)
│
├── Docs/                         ← PDFs fuente de conocimiento (5 documentos)
│   ├── Manual de Onboarding para Nuevos Desarrolladores.pdf
│   ├── Santo Pegasus Soluciones Guía Oficial de Ingeniería Backend.pdf
│   ├── Santo Pegasus Soluciones Guía Oficial de Ingeniería FrontEnd.pdf
│   ├── PROTOCOLO DE RESPUESTA A INCIDENTES Y POST-MORTEMS.pdf
│   └── Arquitectura de Microservicios y Mapa de Dominios.pdf
│
├── QA/
│   ├── pytest.ini
│   └── tests/
│       ├── conftest.py           ← Configuración de paths para pytest
│       └── test_api.py           ← 63 pruebas (integración + unitarias)
│
└── docker-compose.yml
```

---

## Pipeline RAG

Cuando un colaborador hace una pregunta, el sistema ejecuta este flujo:

```
Pregunta del usuario
        │
        ▼
1. EMBEDDING DE LA CONSULTA
   Cohere embed-multilingual-v3.0
   input_type = "search_query"
   → vector de 1024 dimensiones
        │
        ▼
2. BÚSQUEDA SEMÁNTICA EN CHROMADB
   Métrica: similitud coseno (HNSW)
   Se recuperan los 5 fragmentos más similares
   Umbral mínimo: similitud ≥ 0.25
        │
        ▼
3. FILTRO DE RELEVANCIA
   Se descartan fragmentos por debajo del umbral
   Si no hay nada relevante → respuesta de fallback
        │
        ▼
4. BÚSQUEDA WEB (opcional)
   Tavily busca en dominios confiables predefinidos
   Solo si: Tavily habilitado + consulta técnica + confianza docs ≥ 0.25
        │
        ▼
5. CONSTRUCCIÓN DEL PROMPT
   Sistema: rol del agente Santos Pegasus
   Historial: últimos 4 mensajes de la conversación
   Contexto: fragmentos internos + fuentes web
   Pregunta actual
        │
        ▼
6. GENERACIÓN CON COHERE command-a-03-2025
   temperatura = 0.2 (respuestas factuales)
   max_tokens = 1024
        │
        ▼
7. RESPUESTA AL USUARIO
   Texto + fuente principal + lista de citas + nivel de confianza
```

### Chunking de documentos

Los PDFs se dividen en fragmentos antes de indexar:

- **Método**: división por palabras con solapamiento
- **Tamaño**: 400 palabras por fragmento (configurable via `CHUNK_TAMANO`)
- **Solapamiento**: 60 palabras (configurable via `CHUNK_SOLAPAMIENTO`)
- **Deduplicación**: los fragmentos ya indexados no se reinsertan (control por ID)
- **Batch embeddings**: Cohere acepta 96 textos por llamada — se usan lotes de 90 para respetar el límite del plan trial

---

## Sistema de usuarios y roles

Los usuarios se almacenan en `BackEnd/data/usuarios.json` (persistencia JSON, sin base de datos externa).

### Usuarios disponibles

| Usuario | Contraseña | Rol | Descripción |
|---------|-----------|-----|-------------|
| `admin` | `admin` | admin | Acceso completo a todas las funciones |
| `backend` | `Backend2024!` | backend | Acceso a documentación backend |
| `frontend` | `Frontend2024!` | frontend | Acceso a documentación frontend |
| `fullstack` | `Fullstack2024!` | fullstack | Acceso completo a documentación técnica |

### Visibilidad de documentos por rol

| Documento | admin | fullstack | backend | frontend |
|-----------|:-----:|:---------:|:-------:|:--------:|
| Manual de Onboarding | ✓ | ✓ | ✓ | ✓ |
| Guía de Ingeniería Backend | ✓ | ✓ | ✓ | — |
| Guía de Ingeniería FrontEnd | ✓ | ✓ | — | ✓ |
| Protocolo de Incidentes | ✓ | ✓ | — | — |
| Arquitectura y Microservicios | ✓ | ✓ | ✓ | ✓ |

### Permisos del admin

El usuario `admin` puede desde el panel de administración:
- Ver estadísticas de uso (conversaciones, mensajes por usuario)
- Editar el perfil de cualquier usuario
- Cambiar la contraseña de cualquier usuario
- Activar o inactivar cuentas
- Subir nuevos documentos al directorio `Docs/`

---

## Requisitos previos

- **Python 3.12** (no 3.14 — ChromaDB no soporta 3.14 aún)
- **Node.js 20+**
- **Clave de API de Cohere** — [dashboard.cohere.com/api-keys](https://dashboard.cohere.com/api-keys)
- **Clave de API de Tavily** (opcional) — [app.tavily.com](https://app.tavily.com)
- **Docker** (solo para despliegue con contenedores)

Para verificar la versión de Python disponible:
```cmd
py -0
```
Debe aparecer `Python 3.12` en la lista.

---

## Configuración

Edita el archivo `.env` en la raíz del proyecto:

```env
# ── Cohere (obligatorio) ─────────────────────────────────────
COHERE_API_KEY=tu-clave-cohere-aqui
COHERE_MODELO_CHAT=command-a-03-2025
COHERE_MODELO_EMBEDDING=embed-multilingual-v3.0

# ── Tavily (opcional — búsqueda web complementaria) ──────────
TAVILY_API_KEY=tu-clave-tavily-aqui
TAVILY_HABILITADO=false
TAVILY_DOMINIOS_PERMITIDOS=docs.python.org,fastapi.tiangolo.com,owasp.org,kubernetes.io

# ── ChromaDB ─────────────────────────────────────────────────
CHROMA_DIRECTORIO_PERSISTENCIA=./chroma_db
CHROMA_COLECCION=santos_pegasus_conocimiento

# ── Documentos ───────────────────────────────────────────────
DOCUMENTOS_DIRECTORIO=../Docs
CHUNK_TAMANO=400
CHUNK_SOLAPAMIENTO=60

# ── General ──────────────────────────────────────────────────
AMBIENTE=development
LOG_NIVEL=INFO
```

> **Importante:** La clave de Cohere del plan trial tiene límite de 100 llamadas/minuto. El sistema maneja esto automáticamente con backoff exponencial y batch embeddings.

---

## Ejecución local

### 1. Clonar / ubicarse en el proyecto

```cmd
cd C:\ruta\al\proyecto\Enterprise_AI_Knowledge_Agent
```

### 2. Crear entorno virtual con Python 3.12

```cmd
py -3.12 -m venv .venv
.venv\Scripts\activate
```

Debe aparecer `(.venv)` al inicio del prompt.

### 3. Instalar dependencias del backend

```cmd
pip install -r BackEnd\requirements.txt
```

### 4. Configurar la clave de API

Editar `.env` y poner la clave real de Cohere:
```
COHERE_API_KEY=tu-clave-aqui
```

### 5. Iniciar el backend

```cmd
cd BackEnd
py -3.12 -m uvicorn app.main:app --reload --port 8000
```

La primera vez tarda 1–3 minutos porque indexa los 5 PDFs automáticamente:
```
INFO | Orquestador iniciando...
INFO | Coleccion vacia — iniciando ingesta automatica...
INFO | Generando embeddings para 103 fragmentos nuevos...
INFO | Ingesta completada: 103 fragmentos.
INFO | Uvicorn running on http://127.0.0.1:8000
```

Las siguientes veces arranca en segundos porque ChromaDB ya tiene los datos en disco.

### 6. Iniciar el frontend (segunda terminal)

```cmd
cd FrontEnd
npm install
npm run dev
```

### 7. Abrir en el navegador

```
http://localhost:5173
```

Inicia sesión con cualquier usuario de la tabla de la sección [Sistema de usuarios](#sistema-de-usuarios-y-roles).

---

## Ejecución con Docker

```cmd
docker compose up --build
```

- Frontend: `http://localhost:80`
- Backend: `http://localhost:8000`
- Documentación API: `http://localhost:8000/docs`

Para detener:
```cmd
docker compose down
```

---

## Endpoints de la API

Documentación interactiva completa en `http://localhost:8000/docs`.

### Sistema

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/salud` | Health check — verifica que el servidor esté activo |
| `GET` | `/api/validar-api` | Verifica que la clave de Cohere es válida |
| `GET` | `/api/estado-indice` | Fragmentos indexados, documentos disponibles |

### Documentos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/indexar` | Indexa o reindexar todos los documentos en ChromaDB |
| `GET` | `/api/documentos/listar/{username}` | Lista documentos visibles según el rol del usuario |
| `POST` | `/api/documentos/upload` | Sube un nuevo PDF (solo admin) |

### Agente RAG

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/agente/consultar` | Consulta al agente — ejecuta el pipeline RAG completo |

Body de ejemplo:
```json
{
  "pregunta": "¿Cuánto dura el proceso de onboarding?",
  "id_conversacion": "conv-20260101120000000000",
  "username": "backend"
}
```

Respuesta:
```json
{
  "respuesta": "El proceso de onboarding en Santos Pegasus dura 30 días...",
  "fuente_principal": "Manual de Onboarding para Nuevos Desarrolladores.pdf",
  "confianza": 0.87,
  "citas": ["Manual de Onboarding para Nuevos Desarrolladores.pdf"],
  "sin_respuesta": false,
  "id_conversacion": "conv-20260101120000000000"
}
```

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Inicia sesión — retorna nombre y rol del usuario |

### Usuarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/usuarios` | Lista todos los usuarios (sin contraseñas) |
| `GET` | `/api/usuarios/{username}` | Datos de un usuario específico |
| `POST` | `/api/usuarios/cambiar-contrasena` | Cambia la contraseña del usuario |
| `POST` | `/api/usuarios/actualizar-perfil` | Actualiza nombre, apellido y email |
| `POST` | `/api/usuarios/actualizar-estado` | Activa o inactiva una cuenta (admin) |

### Historial de chat

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/chat/conversacion` | Crea una nueva conversación |
| `GET` | `/api/chat/historial/{username}` | Lista todas las conversaciones del usuario |
| `GET` | `/api/chat/conversacion/{username}/{conv_id}` | Obtiene mensajes de una conversación |
| `DELETE` | `/api/chat/conversacion/{username}/{conv_id}` | Elimina una conversación |

### Administración

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/estadisticas` | Total usuarios, conversaciones, mensajes por usuario |

---

## Pruebas QA

Las pruebas están en `QA/tests/test_api.py`. Usan dobles de prueba (mocks) y no requieren claves de API reales.

```cmd
cd QA
py -3.12 -m pytest tests/ -v
```

Resultado esperado: **63 tests pasando**.

### Cobertura de pruebas

| Clase de prueba | Cantidad | Qué verifica |
|----------------|----------|-------------|
| `TestSalud` | 4 | Health check, versión, mensaje |
| `TestValidarApi` | 5 | Cohere configurado/no configurado, proveedor |
| `TestEstadoIndice` | 5 | Fragmentos, documentos, índice vacío |
| `TestDocumentosPorRol` | 6 | Visibilidad por rol (admin, frontend, backend, fullstack) |
| `TestConsultarAgente` | 11 | RAG completo, 422 por pregunta corta, persistencia de historial |
| `TestAuth` | 5 | Login correcto/incorrecto, roles, campos de respuesta |
| `TestHistorialChat` | 5 | Crear/obtener/eliminar conversaciones, 404 |
| `TestIndexar` | 3 | 503 sin clave, 200 con clave, campos de respuesta |
| `TestDominio` | 7 | Entidades puras, clampeo de confianza |
| `TestServicioRag` | 8 | Pipeline RAG, saludos, fuera de ámbito, fallback LLM |
| `TestServicioProcesamiento` | 3 | Chunking, IDs únicos, documento inexistente |
| `TestOrquestador` | 2 | Directorio de documentos existe y contiene PDFs |

---

## Agregar documentos

1. Copia el PDF al directorio `Docs/`
2. Reindexar desde el frontend: **Índice vectorial → Indexar nuevos documentos**

O desde la terminal:
```cmd
curl -X POST http://localhost:8000/api/indexar ^
  -H "Content-Type: application/json" ^
  -d "{\"forzar_reindexacion\": false}"
```

Para reindexar todo desde cero (útil si cambiaste el tamaño de chunk):
```json
{ "forzar_reindexacion": true }
```

---

## Búsqueda web con Tavily

Por defecto está **deshabilitada**. Para activarla:

1. Obtén una clave en [app.tavily.com](https://app.tavily.com)
2. En `.env`:
```env
TAVILY_API_KEY=tvly-tu-clave
TAVILY_HABILITADO=true
```
3. Reinicia el backend

El sistema solo consulta la web cuando:
- La pregunta tiene temas técnicos reconocidos (tecnología, software, arquitectura, etc.)
- Los documentos internos tienen confianza ≥ 0.25 (la web complementa, no reemplaza)
- La consulta no está en la lista de temas bloqueados (deportes, entretenimiento, etc.)

Los dominios permitidos por defecto son: `docs.python.org`, `fastapi.tiangolo.com`, `owasp.org`, `kubernetes.io`, `docs.github.com`, `learn.microsoft.com`, `docs.aws.amazon.com`. Se pueden ampliar en `.env`.

---

## 🔄 Cambios Recientes (13 de Julio 2026)

### Limpieza de Código

- ✅ **Eliminados 7 archivos temporales** no necesarios del repositorio
- ✅ **Eliminados iconos SVG inline** — ahora usa imagen real `Logo_Menu.png`
- ✅ **Usuarios deprecated eliminados**: `admin.santos`, `carlos.dev`, `maria.dev`
- ✅ **Código no utilizado limpiado** de componentes React

### Mejoras de UI

- ✅ **Logo mejorado en Sidebar**: 
  - Expandido: `Logo (32px) + "Santos Pegasus" + "SOLUCIONES"` (naranja)
  - Colapsado: `Logo (40px)` — mucho más visible
- ✅ **Botón toggle movido a header global**: Aparece en todas las vistas (Dashboard, Chat, Documentos, Admin, etc.)
- ✅ **Sidebar consistente en todas las páginas**: Navegación disponible en todo el sistema

### Documentación

- ✅ **README.md actualizado** con usuarios actuales y cambios recientes
- ✅ **ARQUITECTURA.md creado**: Explicación completa del diseño hexagonal
- ✅ **INICIO_RAPIDO.md creado**: Guía de 5 pasos para ejecutar el sistema

### Estado del Sistema

- ✅ **63 pruebas QA pasando**
- ✅ **Código limpio y listo para producción**
- ✅ **Documentación completa y actualizada**
- ✅ **Hexagonal architecture implementada correctamente**
