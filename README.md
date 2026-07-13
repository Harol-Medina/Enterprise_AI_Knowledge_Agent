# Agente de Conocimiento Empresarial — Santos Pegasus Soluciones

Sistema de inteligencia artificial RAG que permite a los colaboradores de Santos Pegasus Soluciones consultar documentación interna en lenguaje natural. Combina búsqueda vectorial semántica, generación de respuestas con Cohere e interfaz web moderna con historial de conversaciones.

[![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Arquitectura](https://img.shields.io/badge/docs-Arquitectura-blue)](ARQUITECTURA.md)
[![Inicio Rápido](https://img.shields.io/badge/docs-Inicio_Rápido-orange)](INICIO_RAPIDO.md)
[![QA](https://img.shields.io/badge/tests-63%20pasando-brightgreen)](#pruebas-qa)

---

## Demo

> Haz clic en la imagen para ver el video de demostración:

[![Demo del sistema](https://img.youtube.com/vi/TU_ID_DE_YOUTUBE/maxresdefault.jpg)](https://www.youtube.com/watch?v=TU_ID_DE_YOUTUBE)

*(Reemplaza `TU_ID_DE_YOUTUBE` con el ID real de tu video — es la parte después de `v=` en la URL de YouTube)*

---

## Documentación

| Archivo | Qué contiene |
|---------|-------------|
| **[README.md](README.md)** | Presentación, tecnologías, usuarios, endpoints, ejecución |
| **[ARQUITECTURA.md](ARQUITECTURA.md)** | Diseño hexagonal, capas, pipeline RAG, decisiones técnicas |
| **[INICIO_RAPIDO.md](INICIO_RAPIDO.md)** | 6 pasos para tener el sistema funcionando |
| **[LICENSE](LICENSE)** | Licencia MIT |

---

## ¿Qué hace este sistema?

El agente permite hacer preguntas como:

- *"¿Cuánto dura el proceso de onboarding?"*
- *"¿Cuáles son los estándares de ingeniería backend?"*
- *"¿Cómo se gestiona un incidente de producción?"*

Y responde basándose en los documentos internos de la empresa, citando la fuente exacta de cada respuesta.

---

## Tecnologías

| Capa | Tecnología | Para qué |
|------|-----------|----------|
| Backend | Python 3.12 + FastAPI | API REST y lógica de negocio |
| Chat | Cohere command-a-03-2025 | Genera respuestas en lenguaje natural |
| Embeddings | Cohere embed-multilingual-v3.0 | Convierte texto en vectores 1024 dims |
| Base vectorial | ChromaDB 0.6.3 | Almacena y busca fragmentos por similitud semántica |
| PDFs | PyPDF2 | Extrae texto de los documentos internos |
| Búsqueda web | Tavily (opcional) | Complementa respuestas con fuentes técnicas externas |
| Frontend | React 18 + Vite | Interfaz de usuario |
| Estilos | Tailwind CSS | Diseño visual |
| Pruebas | pytest + FastAPI TestClient | 63 pruebas automatizadas sin API keys |
| Contenedores | Docker + Compose | Despliegue reproducible |

---

## Documentos indexados

Estos son los 5 PDFs que el agente usa como fuente de conocimiento:

| # | Documento | Visible para |
|---|-----------|-------------|
| 1 | Manual de Onboarding para Nuevos Desarrolladores.pdf | Todos |
| 2 | Santo Pegasus Soluciones Guía Oficial de Ingeniería Backend.pdf | admin, fullstack, backend |
| 3 | Santo Pegasus Soluciones Guía Oficial de Ingeniería FrontEnd.pdf | admin, fullstack, frontend |
| 4 | PROTOCOLO DE RESPUESTA A INCIDENTES Y POST-MORTEMS.pdf | admin, fullstack |
| 5 | Arquitectura de Microservicios y Mapa de Dominios.pdf | admin, fullstack, backend |

---

## Usuarios y roles

| Usuario | Contraseña | Rol | Acceso |
|---------|-----------|-----|--------|
| `admin` | `Admin2024!` | Administrador | Todo el sistema + panel admin |
| `backend` | `Backend2024!` | Desarrollador backend | Docs de backend + generales |
| `frontend` | `Frontend2024!` | Desarrollador frontend | Docs de frontend + generales |
| `fullstack` | `Fullstack2024!` | Desarrollador fullstack | Todos los documentos técnicos |

El panel de administración (`/admin`) permite al usuario `admin`: ver estadísticas de uso, editar perfiles, cambiar contraseñas, activar/inactivar cuentas y subir nuevos documentos.

---

## Ejecución rápida

> Ver guía completa en **[INICIO_RAPIDO.md](INICIO_RAPIDO.md)**

```cmd
# 1. Crear entorno virtual con Python 3.12
py -3.12 -m venv .venv
.venv\Scripts\activate

# 2. Instalar dependencias
pip install -r BackEnd\requirements.txt

# 3. Configurar clave en .env
#    COHERE_API_KEY=tu-clave-aqui

# 4. Iniciar backend
cd BackEnd
py -3.12 -m uvicorn app.main:app --reload --port 8000

# 5. Iniciar frontend (nueva terminal)
cd FrontEnd
npm install && npm run dev
```

Abre `http://localhost:5173` e inicia sesión.

---

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/salud` | Health check |
| `POST` | `/api/auth/login` | Iniciar sesión |
| `POST` | `/api/agente/consultar` | Consultar al agente RAG |
| `POST` | `/api/indexar` | Indexar documentos en ChromaDB |
| `GET` | `/api/documentos/listar/{username}` | Documentos según rol |
| `GET` | `/api/admin/estadisticas` | Panel de administración |

Documentación interactiva completa: `http://localhost:8000/docs`

---

## Pruebas QA

```cmd
cd QA
py -3.12 -m pytest tests/ -v
```

**63 pruebas pasando** — sin claves de API reales, usan dobles de prueba.

| Grupo | Tests |
|-------|-------|
| Salud y API | 9 |
| Documentos por rol | 6 |
| Consulta RAG | 11 |
| Autenticación | 5 |
| Historial de chat | 5 |
| Indexación | 3 |
| Dominio y servicios | 24 |

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

---

## Licencia

MIT © 2026 Santos Pegasus Soluciones — ver [LICENSE](LICENSE)
