"""
Servicio de procesamiento de documentos.
Extrae texto de los documentos fuente y los divide en fragmentos
con solapamiento para preservar el contexto entre fragmentos.
No depende de tiktoken — usa división por palabras simple.
"""
import logging
import os
import re
from typing import List

from app.domain.entities import FragmentoDocumento
from app.domain.ports import RepositorioDocumentosPort

logger = logging.getLogger(__name__)


def _limpiar_texto(texto: str) -> str:
    """Elimina ruidos comunes de la extracción de PDFs."""
    # Colapsar espacios múltiples
    texto = re.sub(r"[^\S\n]+", " ", texto)
    # Colapsar más de 2 saltos de línea
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    # Eliminar líneas que sean solo números (números de página)
    texto = re.sub(r"^\s*\d+\s*$", "", texto, flags=re.MULTILINE)
    return texto.strip()


def _dividir_en_fragmentos(
    texto: str,
    tamano_palabras: int = 400,
    solapamiento_palabras: int = 60,
) -> List[str]:
    """
    Divide el texto en fragmentos de tamaño fijo (en palabras) con solapamiento.
    No requiere ninguna dependencia externa.
    """
    palabras = texto.split()
    total = len(palabras)
    if total == 0:
        return []

    fragmentos = []
    inicio = 0
    while inicio < total:
        fin = min(inicio + tamano_palabras, total)
        fragmento = " ".join(palabras[inicio:fin]).strip()
        if fragmento:
            fragmentos.append(fragmento)
        if fin == total:
            break
        inicio += tamano_palabras - solapamiento_palabras

    return fragmentos


class ServicioProcesamiento:
    """
    Orquesta la extracción y el troceado de documentos.
    Produce FragmentoDocumento listos para ser indexados con embeddings.
    """

    def __init__(
        self,
        repositorio: RepositorioDocumentosPort,
        tamano_chunk: int = 400,
        solapamiento_chunk: int = 60,
    ):
        self.repositorio = repositorio
        self.tamano_chunk = int(os.getenv("CHUNK_TAMANO", tamano_chunk))
        self.solapamiento_chunk = int(os.getenv("CHUNK_SOLAPAMIENTO", solapamiento_chunk))

    def procesar_documento(self, nombre_documento: str) -> List[FragmentoDocumento]:
        """Extrae, limpia y divide un documento en fragmentos indexables."""
        logger.info("Procesando documento: %s", nombre_documento)

        try:
            texto_crudo = self.repositorio.cargar_documento(nombre_documento)
        except FileNotFoundError as exc:
            logger.error("Documento no encontrado: %s", exc)
            return []

        texto_limpio = _limpiar_texto(texto_crudo)
        if not texto_limpio:
            logger.warning("Documento vacío o sin texto extraíble: %s", nombre_documento)
            return []

        textos_fragmentos = _dividir_en_fragmentos(
            texto_limpio,
            tamano_palabras=self.tamano_chunk,
            solapamiento_palabras=self.solapamiento_chunk,
        )

        fragmentos = []
        for idx, texto in enumerate(textos_fragmentos):
            fragmento = FragmentoDocumento(
                id=f"{nombre_documento}::chunk-{idx:04d}",
                texto=texto,
                fuente=nombre_documento,
                metadatos={
                    "nombre_documento": nombre_documento,
                    "indice_chunk": idx,
                    "total_chunks": len(textos_fragmentos),
                    "palabras": len(texto.split()),
                },
            )
            if fragmento.es_valido():
                fragmentos.append(fragmento)

        logger.info(
            "Documento '%s' → %d fragmentos válidos.",
            nombre_documento,
            len(fragmentos),
        )
        return fragmentos

    def procesar_todos(self) -> List[FragmentoDocumento]:
        """Procesa todos los documentos disponibles en el repositorio."""
        todos: List[FragmentoDocumento] = []
        documentos = self.repositorio.listar_documentos()
        logger.info("Procesando %d documentos...", len(documentos))
        for nombre in documentos:
            todos.extend(self.procesar_documento(nombre))
        logger.info("Total fragmentos generados: %d", len(todos))
        return todos
