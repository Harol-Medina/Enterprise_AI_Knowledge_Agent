"""
Orquestador — Composition Root de la arquitectura hexagonal.
Único punto donde se instancian y conectan todos los adaptadores.
"""
import logging
import os
from pathlib import Path

from dotenv import load_dotenv

from app.infrastructure.repositorio_documentos import RepositorioDocumentosLocal
from app.infrastructure.repositorio_vectorial import RepositorioVectorialChroma
from app.infrastructure.repositorio_usuarios import RepositorioUsuarios
from app.services.cliente_ia import ClienteIA
from app.services.servicio_agente import ServicioAgente

_RAIZ = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=_RAIZ / ".env")

logger = logging.getLogger(__name__)


def _resolver_directorio_documentos() -> Path:
    """Resuelve la ruta al directorio de documentos desde .env o variantes conocidas."""
    env = os.getenv("DOCUMENTOS_DIRECTORIO", "../Docs")
    ruta = Path(env) if Path(env).is_absolute() else (_RAIZ / env).resolve()
    for candidato in [ruta, _RAIZ / "Docs", _RAIZ / "Doc"]:
        if candidato.exists():
            return candidato
    return ruta


def _resolver_directorio_chroma() -> str:
    """Resuelve y crea el directorio de persistencia de ChromaDB."""
    env = os.getenv("CHROMA_DIRECTORIO_PERSISTENCIA", "./chroma_db")
    ruta = Path(env) if Path(env).is_absolute() else (_RAIZ / env).resolve()
    ruta.mkdir(parents=True, exist_ok=True)
    return str(ruta)


class Orquestador:
    """
    Composition Root de la arquitectura hexagonal.
    Instancia y conecta: ClienteIA → RepositorioVectorialChroma → ServicioAgente.
    También gestiona el RepositorioUsuarios para autenticación e historial.
    """

    def __init__(self):
        dir_docs   = _resolver_directorio_documentos()
        dir_chroma = _resolver_directorio_chroma()
        coleccion  = os.getenv("CHROMA_COLECCION", "santos_pegasus_conocimiento")

        logger.info("Orquestador iniciando — docs: %s  chroma: %s", dir_docs, dir_chroma)

        cliente_llm = ClienteIA()
        repo_docs   = RepositorioDocumentosLocal(dir_docs)
        repo_vec    = RepositorioVectorialChroma(
            cliente_llm=cliente_llm,
            directorio_persistencia=dir_chroma,
            nombre_coleccion=coleccion,
        )

        self.servicio = ServicioAgente(
            repositorio_documentos=repo_docs,
            repositorio_fragmentos=repo_vec,
            cliente_llm=cliente_llm,
        )
        self.repo_usuarios = RepositorioUsuarios()

        # Ingesta automática solo si la colección está vacía
        if repo_vec.contar_fragmentos() == 0 and cliente_llm.esta_configurado():
            logger.info("Coleccion vacia — iniciando ingesta automatica...")
            total = self.servicio.ingestar_documentos()
            logger.info("Ingesta completada: %d fragmentos.", total)
        else:
            logger.info("Coleccion con %d fragmentos existentes.", repo_vec.contar_fragmentos())
