"""
Punto de entrada principal de la aplicación FastAPI.
Configura middlewares, logging y monta el router de la API.
"""
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router as api_router

# ------------------------------------------------------------------
# Configuración de logging
# ------------------------------------------------------------------
logging.basicConfig(
    level=os.getenv("LOG_NIVEL", "INFO"),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# ------------------------------------------------------------------
# Aplicación FastAPI
# ------------------------------------------------------------------
app = FastAPI(
    title="Agente de Conocimiento Empresarial — Santos Pegasus",
    description=(
        "API RAG para consultar documentación interna empresarial en lenguaje natural. "
        "Usa ChromaDB para búsqueda vectorial, Cohere para embeddings y generación de respuestas."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ------------------------------------------------------------------
# CORS — permite peticiones desde el frontend
# ------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Rutas
# ------------------------------------------------------------------
app.include_router(api_router, prefix="/api")
