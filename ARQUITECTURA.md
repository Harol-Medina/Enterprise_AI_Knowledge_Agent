# 🏗️ Arquitectura del Sistema — Agente de Conocimiento

## 📋 Contenidos

1. [Visión General](#visión-general)
2. [Diagrama de Capas](#diagrama-de-capas)
3. [Backend: Arquitectura Hexagonal](#backend-arquitectura-hexagonal)
4. [Frontend: Componentes React](#frontend-componentes-react)
5. [Pipeline RAG Detallado](#pipeline-rag-detallado)
6. [Flujos de Datos](#flujos-de-datos)

---

## 🎯 Visión General

El **Agente de Conocimiento** es un sistema de IA conversacional que permite a los colaboradores de Santos Pegasus consultar documentación interna. Su arquitectura separa claramente:

- **Presentación** (React UI)
- **API REST** (FastAPI)
- **Lógica de Negocio** (Servicios)
- **Persistencia** (BD Vectorial, JSON, PDFs)

### Principios Clave

✅ **Hexagonal** — Dominio puro sin dependencias externas  
✅ **Async-First** — No bloquea en I/O  
✅ **Stateless** — Facilita horizontal scaling  
✅ **Type-Safe** — Pydantic + TypeScript (parcial)  
✅ **Reproducible** — Docker + Docker Compose  

---

## 🔳 Diagrama de Capas

```
┌────────────────────────────────────────────────────────────────────┐
│                           PRESENTACIÓN                             │
├────────────────────────────────────────────────────────────────────┤
│  React 18 Components (Vite 5 + Tailwind CSS)                      │
│  ├─ Paginas (Login, Chat, Dashboard, Admin, etc)                 │
│  ├─ Componentes (Sidebar, RutaProtegida)                         │
│  ├─ Contextos (AuthContexto global)                             │
│  └─ Servicios (api.js - HTTP client)                             │
└─────────────────────┬──────────────────────────────────────────────┘
                      │ HTTP/REST (JSON)
                      ↓
┌────────────────────────────────────────────────────────────────────┐
│                    API REST (FastAPI 0.115+)                       │
├────────────────────────────────────────────────────────────────────┤
│  app/api.py — Todos los endpoints                                  │
│  ├─ POST /auth/login                    (autenticación)          │
│  ├─ POST /agente/consultar              (RAG principal)          │
│  ├─ GET /documentos/listar              (lista por rol)          │
│  ├─ POST /documentos/upload             (cargar PDF)            │
│  ├─ POST /indexar                       (reindexar)             │
│  ├─ GET /chat/historial                 (historial chat)        │
│  └─ [más endpoints...]                                          │
│                                                                    │
│  Middleware: CORS, Logging, Error handling                        │
└─────────────────────┬──────────────────────────────────────────────┘
                      │ Inyección de dependencias
                      ↓
┌────────────────────────────────────────────────────────────────────┐
│                 LÓGICA DE NEGOCIO (Servicios)                      │
├────────────────────────────────────────────────────────────────────┤
│  app/services/                                                     │
│  ├─ ServicioRag             ← Orquesta RAG (retrieval→gen)        │
│  ├─ ServicioAgente          ← Conversación + contexto            │
│  ├─ ServicioProcesamiento   ← Chunking de PDFs                   │
│  ├─ ClienteIA               ← Adapter a Cohere                   │
│  ├─ ServicioTavily          ← Búsqueda web (opcional)            │
│  └─ Validaciones            ← Reglas de negocio                  │
└─────────────────────┬──────────────────────────────────────────────┘
                      │ Implementa ports.py
                      ↓
┌────────────────────────────────────────────────────────────────────┐
│              DOMINIO (Lógica Pura - SIN frameworks)               │
├────────────────────────────────────────────────────────────────────┤
│  app/domain/                                                       │
│  ├─ entities.py             ← FragmentoDoc, Consulta, Respuesta  │
│  ├─ ports.py                ← Interfaces abstractas              │
│  └─ value_objects.py        ← Tipos de valor (Confianza, etc)    │
│                                                                    │
│  ⚠️ CERO dependencias externas — solo lógica pura                │
└─────────────────────┬──────────────────────────────────────────────┘
                      │ Adaptado por infrastructure
                      ↓
┌────────────────────────────────────────────────────────────────────┐
│            INFRAESTRUCTURA (Adaptadores concretos)                │
├────────────────────────────────────────────────────────────────────┤
│  app/infrastructure/                                               │
│  ├─ RepositorioVectorialChroma  ← ChromaDB 0.6.3                │
│  ├─ RepositorioDocumentosLocal  ← Lectura de PDFs (PyPDF2)     │
│  ├─ RepositorioUsuariosJSON     ← Persistencia en JSON         │
│  └─ ClienteIA (Cohere adapter)  ← API Cohere 5.11             │
└─────────────────────┬──────────────────────────────────────────────┘
                      │
                      ↓
┌────────────────────────────────────────────────────────────────────┐
│                     SERVICIOS EXTERNOS                             │
├────────────────────────────────────────────────────────────────────┤
│  🤖 Cohere API              (embeddings + chat)                   │
│  📊 ChromaDB                (base de datos vectorial)             │
│  📁 ./Docs                  (archivos PDF)                        │
│  💾 ./chroma_db             (persistencia local)                  │
│  👥 data/usuarios.json      (usuarios + conversaciones)          │
│  🌐 Tavily API              (búsqueda web - opcional)            │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Backend: Arquitectura Hexagonal

### Principio Central

**El Dominio NO conoce al mundo exterior.** Solo los Adaptadores conocen el Dominio.

```
EXTERIOR (API REST, Cohere, ChromaDB)
    │
    ▼
PUERTOS (interfaces abstractas)
    │
    ▼
NÚCLEO (entities, value objects, reglas)
    │
    ▼
ADAPTADORES (implementan puertos)
    │
    ▼
EXTERIOR (servicios reales)
```

### Estructura de Directorios

```
BackEnd/app/
│
├── main.py                      ← FastAPI app + CORS + logging
├── api.py                       ← Todos los @router (endpoints)
├── orchestrator.py              ← Composition Root (DI)
├── schemas.py                   ← Pydantic (validación)
│
├── domain/                      ← NÚCLEO (lógica pura)
│   ├── entities.py              ← Modelos: Consulta, Respuesta
│   └── ports.py                 ← Interfaces abstractas
│
├── services/                    ← LÓGICA DE NEGOCIO
│   ├── servicio_rag.py
│   ├── servicio_agente.py
│   ├── cliente_ia.py
│   ├── procesamiento_documentos.py
│   └── servicio_tavily.py
│
└── infrastructure/              ← ADAPTADORES CONCRETOS
    ├── repositorio_vectorial.py     ← ChromaDB
    ├── repositorio_documentos.py    ← PDFs
    └── repositorio_usuarios.py      ← JSON
```

---

## 🎨 Frontend: Componentes React

### Estructura

```
FrontEnd/src/
│
├── paginas/                     ← PAGES (mapean rutas)
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Chat.jsx                 ← Main feature (RAG)
│   ├── Documentos.jsx
│   ├── Admin.jsx
│   └── [otros...]
│
├── componentes/                 ← COMPONENTS reutilizables
│   ├── Sidebar.jsx              ← Menu lateral colapsable
│   └── RutaProtegida.jsx        ← Wrapper autenticación
│
├── contextos/                   ← STATE MANAGEMENT
│   └── AuthContexto.jsx         ← Token + usuario global
│
├── servicios/                   ← API CLIENT
│   └── api.js                   ← fetch wrapper
│
└── styles.css                   ← Global + Tailwind
```

---

## 🔄 Pipeline RAG Detallado

### Fase 1: Retrieval (Búsqueda)

```
INPUT: pregunta = "¿Cómo configuro el ambiente?"

1. EMBEDDING DE LA PREGUNTA
   ├─ Model: Cohere embed-multilingual-v3.0
   ├─ input_type: "search_query"
   └─ Output: vector[1024 dimensiones]

2. BÚSQUEDA EN CHROMADB
   ├─ Métrica: similitud coseno (HNSW)
   ├─ Top N: 5 fragmentos
   ├─ Threshold: similitud ≥ 0.25
   └─ Output: fragmentos_relevantes[]

3. FILTRADO
   ├─ Descartar similitud < 0.25
   └─ Si 0 fragmentos → respuesta fallback
```

### Fase 2: Augmentation (Enriquecimiento)

```
1. RECUPERAR HISTORIAL
   └─ Últimos 4 mensajes de la conversación

2. CONSTRUIR PROMPT
   ├─ System role: "Eres asistente de Santos Pegasus"
   ├─ Historial: últimos 4 mensajes
   ├─ Contexto: 5 fragmentos del retrieval
   ├─ Búsqueda web: Tavily (opcional)
   └─ Pregunta actual: "¿Cómo configuro...?"
```

### Fase 3: Generation (Generación)

```
LLM: Cohere command-a-03-2025

Parámetros:
├─ temperature: 0.2  (respuestas factuales)
├─ max_tokens: 1024  (respuestas moderadas)
└─ modelo: command-a-03-2025

Output: respuesta + confianza + citas
```

---

## 📊 Flujos de Datos

### Flujo 1: Chat (RAG Principal)

```
Frontend: POST /api/agente/consultar
  {
    "pregunta": "¿Cómo configuro?",
    "id_conversacion": "conv-123",
    "username": "usuario"
  }
           │
           ▼
Backend: api.py → orchestrator.py → ServicioRag
           │
           ├─ Verificar usuario
           ├─ Cargar historial
           ├─ Embedding → ChromaDB (retrieval)
           ├─ Construir prompt
           ├─ Llamar Cohere (generation)
           ├─ Guardar en historial
           └─ Return respuesta + metadata
           │
           ▼
Frontend: {
  "respuesta": "Para configurar...",
  "confianza": 0.85,
  "citas": ["setup-guide.pdf"]
}
```

### Flujo 2: Login

```
Frontend: POST /api/auth/login
  { "username": "usuario", "contraseña": "pass" }
           │
           ▼
Backend: Verificar en usuarios.json
           │
           ├─ Usuario no existe → 401
           ├─ Contraseña incorrecta → 401
           └─ OK → generar token JWT
           │
           ▼
Frontend: Guardar token en localStorage
          Redirect a /chat
```

---

**Última actualización**: 13 de Julio, 2026
