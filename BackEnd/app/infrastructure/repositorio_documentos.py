"""
Adaptador de infraestructura — Repositorio de documentos locales.
Implementa RepositorioDocumentosPort para leer archivos PDF y texto
desde un directorio local en disco.
"""
import logging
from pathlib import Path
from typing import List

from PyPDF2 import PdfReader

from app.domain.ports import RepositorioDocumentosPort

logger = logging.getLogger(__name__)

EXTENSIONES_SOPORTADAS = {".pdf", ".txt", ".md"}


class RepositorioDocumentosLocal(RepositorioDocumentosPort):
    """
    Lee documentos desde un directorio local.
    Soporta PDF (extracción de texto nativo) y archivos de texto plano.
    """

    def __init__(self, directorio_raiz: Path):
        self.directorio_raiz = Path(directorio_raiz)
        if not self.directorio_raiz.exists():
            raise FileNotFoundError(
                f"El directorio de documentos no existe: {self.directorio_raiz}"
            )

    def listar_documentos(self) -> List[str]:
        """Retorna los nombres de todos los archivos soportados en el directorio."""
        archivos = [
            archivo.name
            for archivo in self.directorio_raiz.iterdir()
            if archivo.is_file() and archivo.suffix.lower() in EXTENSIONES_SOPORTADAS
        ]
        logger.info("Documentos encontrados en %s: %d", self.directorio_raiz, len(archivos))
        return archivos

    def guardar_documento(self, nombre: str, contenido: bytes) -> None:
        """Guarda un archivo binario en el directorio de documentos."""
        destino = self.directorio_raiz / nombre
        with destino.open("wb") as f:
            f.write(contenido)

    def cargar_documento(self, nombre: str) -> str:
        """Carga el contenido de un documento. Para PDF usa extracción nativa."""
        ruta = self.directorio_raiz / nombre
        if not ruta.is_file():
            raise FileNotFoundError(f"Documento no encontrado: {ruta}")

        sufijo = ruta.suffix.lower()
        if sufijo == ".pdf":
            return self._extraer_pdf(ruta)
        else:
            return ruta.read_text(encoding="utf-8", errors="ignore")

    def _extraer_pdf(self, ruta: Path) -> str:
        """Extrae texto de todas las páginas de un PDF nativo."""
        try:
            lector = PdfReader(str(ruta))
            paginas = []
            for i, pagina in enumerate(lector.pages):
                texto = pagina.extract_text() or ""
                if texto.strip():
                    paginas.append(f"[Página {i + 1}]\n{texto}")
            contenido = "\n\n".join(paginas)
            logger.info("PDF extraído: %s — %d páginas, %d caracteres", ruta.name, len(lector.pages), len(contenido))
            return contenido
        except Exception as exc:
            logger.error("Error extrayendo PDF %s: %s", ruta.name, exc)
            return ""
