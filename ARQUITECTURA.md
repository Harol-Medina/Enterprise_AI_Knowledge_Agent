# Arquitectura — Santos Pegasus Knowledge Agent

Este documento explica **cómo está construido** el sistema, qué decisiones de diseño se tomaron y por qué. Está pensado para que cualquier desarrollador que se incorpore al proyecto pueda entenderlo sin necesidad de leer todo el código.

---

## Índice

1. [Principio de diseño](#1-principio-de-diseño)
2. [Arquitectura hexagonal](#2-arquitectura-hexagonal)
3. [Capas del backend](#3-capas-del-backend)
4. [Pipeline RAG paso a paso](#4-pipeline-rag-paso-a-paso)
5. [Capas del frontend](#5-capas-del-frontend)
6. [Flujo de una consulta completa](#6-flujo-de-una-consulta-completa)
7. [Persistencia de datos](#7-persistencia-de-datos)
8. [Decisiones técnicas](#8-decisiones-técnicas)

---

## 1. Principio de diseño

El sistema sigue la **Arquitectura Hexagonal** (también llamada Ports & Adapters), propuesta por Alistair Cockburn.

La idea central es simple: **el núcleo del negocio no depende de nada externo**.

```
Lo que NUNCA cambia:          Lo que SÍ puede cambiar:
┌─────────────────────┐       ┌──────────────────────────┐
│  Reglas de negocio  │       │  Base de datos           │
│  Entidades          │  ←──  │  Proveedor de IA         │
│  Casos de uso       │       │  Framework web           │
└─────────────────────┘       │  Archivos JSON / SQLite  │
                               └──────────────────────────┘
```

Si mañana Cohere cierra y hay que migrar a OpenAI, solo se cambia el archivo `cliente_ia.py`. El resto del sistema no se toca.

---

## 2. Arquitectura hexagonal

El backend tiene tres anillos concéntricos:

```
╔══════════════════════════════════════════════════════╗
║                  INFRAESTRUCTURA                      ║
║  (adaptadores concretos — pueden cambiar)            ║
║  ┌────────────────────────────────────────────────┐  ║
║  │              SERVICIOS / CASOS DE USO          │  ║
║  │  (orquestan el dominio)                        │  ║
║  │  ┌──────────────────────────────────────────┐  │  ║
║  │  │           DOMINIO (núcleo puro)          │  │  ║
║  │  │   entities.py · ports.py                │  │  ║
║  │  │   Sin imports de FastAPI, Cohere, etc.  │  │  ║
║  │  └──────────────────────────────────────────┘  │  ║
║  └────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════╝
```

### Regla fundamental

Las flechas de dependencia solo apuntan **hacia adentro**:
- La infraestructura conoce el dominio
- El dominio no conoce la infraestructura

---

## 3. Capas del backend

### Capa 1 — Dominio (`BackEnd/app/domain/`)

El corazón del sistema. No importa nada externo.

**`entities.py`** — Las estructuras de datos del negocio:
- `FragmentoDocumento` — Un trozo de texto extraído de un PDF con su fuente y metadatos
- `ResultadoConsulta` — La respuesta del agente: texto, fuente, confianza, citas
- `EstadoApiKey` — Estado de la validación de credenciales

**`ports.py`** — Los contratos (interfaces abstractas):
- `RepositorioDocumentosPort` — "Algo que sabe listar y cargar documentos"
- `RepositorioFragmentosPort` — "Algo que sabe guardar y buscar fragmentos"
- `ClienteLLMPort` — "Algo que sabe generar embeddings y respuestas"

Nadie sabe qué hay detrás de esas interfaces. El dominio solo habla con puertos.

---

### Capa 2 — Servicios (`BackEnd/app/services/`)

Los casos de uso: **qué hace el sistema**.

**`servicio_agente.py`** — Caso de uso principal. Dos responsabilidades:
1. `ingestar_documentos()` — Lee PDFs, los divide en fragmentos, los indexa
2. `responder_consulta()` — Recibe una pregunta y ejecuta el pipeline RAG

**`servicio_rag.py`** — El pipeline de recuperación y generación:
1. Recupera fragmentos relevantes con búsqueda semántica
2. Filtra por umbral de similitud (≥ 0.25)
3. Opcionalmente busca en la web con Tavily
4. Construye el prompt con todo el contexto
5. Llama al LLM para generar la respuesta

**`procesamiento_documentos.py`** — Extrae y trocea PDFs:
- Limpieza de texto (elimina ruido de la extracción)
- División en fragmentos de 400 palabras con 60 de solapamiento

**`cliente_ia.py`** — Adaptador de Cohere:
- `generar_embeddings_lote()` — 90 textos por llamada (respeta el rate limit)
- `generar_respuesta()` — Chat con temperatura 0.2 (respuestas factuales)
- Reintentos automáticos con backoff exponencial ante errores 429

**`servicio_tavily.py`** — Búsqueda web opcional:
- Solo se activa si la consulta es técnica
- Solo complementa (no reemplaza) los documentos internos
- Lista cerrada de dominios confiables

---

### Capa 3 — Infraestructura (`BackEnd/app/infrastructure/`)

Las implementaciones concretas de los puertos.

**`repositorio_documentos.py`** — Lee PDFs del disco:
- Implementa `RepositorioDocumentosPort`
- Soporta `.pdf`, `.txt`, `.md`
- Extrae texto página por página con PyPDF2

**`repositorio_vectorial.py`** — ChromaDB:
- Implementa `RepositorioFragmentosPort`
- Persiste los embeddings en disco (`chroma_db/`)
- Búsqueda por similitud coseno (índice HNSW)
- Deduplicación por ID — no reindexar lo que ya está

**`repositorio_usuarios.py`** — Usuarios y chat en JSON:
- Autenticación con SHA-256
- 4 usuarios iniciales con roles
- Historial de conversaciones por usuario
- Sin base de datos externa — un solo archivo `data/usuarios.json`

---

### Capa 4 — API y orquestador

**`orchestrator.py`** — El Composition Root:

```python
# Aquí se construyen TODAS las dependencias y se inyectan
cliente_llm = ClienteIA()                    # Cohere
repo_docs   = RepositorioDocumentosLocal()   # PDFs del disco
repo_vec    = RepositorioVectorialChroma()   # ChromaDB
servicio    = ServicioAgente(repo_docs, repo_vec, cliente_llm)
```

Es el único lugar donde se instancian las clases concretas. Todo lo demás trabaja con interfaces.

**`api.py`** — Los endpoints REST. Recibe peticiones HTTP, llama al orquestador, devuelve JSON. No contiene lógica de negocio.

**`schemas.py`** — Los contratos de la API (Pydantic). Validación automática de entrada y salida.

---

## 4. Pipeline RAG paso a paso

RAG = Retrieval-Augmented Generation. Genera respuestas basadas en documentos reales, no en el conocimiento interno del modelo de IA.

```
Usuario: "¿Cuánto dura el onboarding?"
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  PASO 1 — Embedding de la consulta                       │
│  Cohere convierte la pregunta en un vector de 1024 nums  │
│  Ejemplo: [0.12, -0.34, 0.87, ...]                       │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  PASO 2 — Búsqueda semántica en ChromaDB                 │
│  Se compara el vector de la pregunta con los vectores    │
│  de los 103 fragmentos almacenados                       │
│  → Retorna los 5 fragmentos más similares (coseno ≥ 0.25)│
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  PASO 3 — Búsqueda web (si Tavily está habilitado)       │
│  Solo si la consulta es técnica y hay docs relevantes    │
│  Dominios: docs.python.org, kubernetes.io, etc.          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  PASO 4 — Construcción del prompt                        │
│  Sistema: "Eres el asistente de Santos Pegasus..."       │
│  Historial: últimos 4 mensajes de la conversación        │
│  Contexto: fragmentos internos + fuentes web             │
│  Pregunta: "¿Cuánto dura el onboarding?"                 │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  PASO 5 — Generación con Cohere command-a-03-2025         │
│  temperatura=0.2 (determinista, factual)                 │
│  max_tokens=1024                                         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  PASO 6 — Respuesta                                      │
│  "El proceso de onboarding dura 30 días e incluye..."    │
│  Fuente: Manual de Onboarding.pdf                        │
│  Confianza: 0.87                                         │
└─────────────────────────────────────────────────────────┘
```

### Cómo se procesan los documentos antes de indexar

```
PDF original (50 páginas)
        │
        ▼
Extracción de texto con PyPDF2
        │
        ▼
Limpieza (elimina ruido, números de página, espacios extra)
        │
        ▼
Chunking: división en fragmentos de 400 palabras
          con 60 palabras de solapamiento entre fragmentos
          [para no cortar ideas a la mitad]
        │
        ▼
~20 fragmentos por documento → ~103 en total para los 5 PDFs
        │
        ▼
Cohere genera un vector 1024-dimensional para cada fragmento
(en lotes de 90 para no superar el rate limit del plan trial)
        │
        ▼
ChromaDB almacena: ID + texto + vector + metadatos (fuente, índice)
```

---

## 5. Capas del frontend

El frontend también aplica separación de responsabilidades:

```
┌──────────────────────────────────────────────────────────┐
│                      PÁGINAS                              │
│  Login · Dashboard · Chat · Documentos · Perfil · Admin   │
│  Cada página = un caso de uso del usuario                 │
└──────────────────┬───────────────────────────────────────┘
                   │ usa
┌──────────────────▼───────────────────────────────────────┐
│                    COMPONENTES                            │
│  Sidebar — navegación, historial, usuario                 │
│  RutaProtegida — layout autenticado con outlet            │
└──────────────────┬───────────────────────────────────────┘
                   │ usa
┌──────────────────▼───────────────────────────────────────┐
│                    SERVICIOS                              │
│  servicios/api.js — todas las llamadas al backend         │
│  Un solo lugar para cambiar la URL base                   │
└──────────────────┬───────────────────────────────────────┘
                   │ usa
┌──────────────────▼───────────────────────────────────────┐
│                    CONTEXTOS                              │
│  AuthContexto — estado global de autenticación            │
│  usuario · nombre · rol · esAdmin                        │
└──────────────────────────────────────────────────────────┘
```

### Sistema de rutas (React Router v6)

```
/login              → público
/dashboard          → protegido (cualquier rol)
/chat               → protegido (cualquier rol)
/documentos         → protegido (cualquier rol)
/indice             → protegido (cualquier rol)
/perfil             → protegido (cualquier rol)
/admin              → protegido (solo admin)
```

`RutaProtegida` envuelve todas las rutas autenticadas. Si no hay sesión, redirige a `/login`. También gestiona el estado de conversación activa que comparten el Sidebar y el Chat.

---

## 6. Flujo de una consulta completa

De principio a fin, desde que el usuario escribe hasta que recibe la respuesta:

```
1. Usuario escribe en el Chat y presiona Enter

2. Chat.jsx llama a api.consultar(pregunta, convId, username)

3. api.js hace POST /api/agente/consultar con el body JSON

4. Vite proxy redirige la llamada a http://localhost:8000

5. FastAPI recibe la request en api.py → endpoint consultar()

6. Llama a Orquestador.servicio.responder_consulta(pregunta, historial)

7. ServicioAgente → ServicioRag.recuperar(pregunta)
   └─ RepositorioVectorialChroma.buscar()
      └─ ClienteIA.generar_embedding_consulta()  [Cohere API]
      └─ ChromaDB.query()  [búsqueda coseno local]

8. ServicioRag.generar(pregunta, fragmentos, historial)
   └─ ServicioTavily.buscar()  [Tavily API, si habilitado]
   └─ ClienteIA.generar_respuesta(prompt)  [Cohere API]

9. api.py persiste los mensajes en RepositorioUsuarios

10. FastAPI devuelve JSON con respuesta, fuente, confianza, citas

11. Chat.jsx actualiza el estado → React renderiza la burbuja

12. El mensaje aparece en pantalla con badge de confianza y citas
```

---

## 7. Persistencia de datos

El sistema usa dos mecanismos de persistencia, sin base de datos relacional:

### ChromaDB (vectores)
- Directorio: `chroma_db/` en la raíz del proyecto
- Contiene los embeddings de los 103 fragmentos
- Persiste entre reinicios del servidor
- Si se borra, el sistema reindexará automáticamente al arrancar

### JSON local (usuarios e historial)
- Archivo: `BackEnd/data/usuarios.json`
- Contiene usuarios, contraseñas (SHA-256) e historial completo de chat
- Estructura:

```json
{
  "usuarios": {
    "admin": { "nombre": "...", "rol": "admin", "activo": true, ... }
  },
  "historial": {
    "backend": [
      {
        "id": "conv-20260101120000",
        "titulo": "¿Cómo funciona el onboarding?",
        "mensajes": [
          { "rol": "usuario", "texto": "...", "timestamp": "..." },
          { "rol": "agente",  "texto": "...", "metadatos": { "confianza": 0.87 } }
        ]
      }
    ]
  }
}
```

---

## 8. Decisiones técnicas

### ¿Por qué Cohere y no OpenAI?

Cohere ofrece un plan trial gratuito con embeddings multilingües. El modelo `embed-multilingual-v3.0` funciona bien en español sin configuración adicional.

### ¿Por qué ChromaDB y no Pinecone o Weaviate?

ChromaDB es local y no requiere cuenta ni API key externa. Persiste en disco y es suficiente para la escala de este proyecto (103 fragmentos).

### ¿Por qué JSON y no SQLite o PostgreSQL?

Para mantener el sistema sin dependencias externas de base de datos. Un único archivo JSON es fácil de inspeccionar, respaldar y entender. Para producción a gran escala se reemplazaría por una BD real sin cambiar el dominio (solo el adaptador).

### ¿Por qué arquitectura hexagonal?

Permite cambiar cualquier tecnología externa (IA, BD, framework) sin tocar la lógica de negocio. También hace las pruebas mucho más simples — los mocks reemplazan los adaptadores sin afectar el dominio.

### ¿Por qué batch embeddings?

El plan trial de Cohere tiene límite de 100 llamadas/minuto. Enviar 103 fragmentos de a 1 = 103 llamadas. Enviarlos en lotes de 90 = 2 llamadas. Esto hace la indexación 50× más rápida y evita errores 429.
