"""
Adaptador de infraestructura — Cliente IA unificado con Cohere.
Usa Cohere para:
  - Embeddings en lote → embed-multilingual-v3.0 (1024 dims, máx 96 textos/llamada)
  - Chat               → command-a-03-2025
  - Validación         → llamada mínima a la API

Maneja automáticamente el rate limit (429) con backoff exponencial.
"""
import logging
import os
import time
from pathlib import Path
from typing import List

import cohere
from cohere.errors import TooManyRequestsError
from dotenv import load_dotenv

from app.domain.ports import ClienteLLMPort

_RAIZ = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(dotenv_path=_RAIZ / ".env")

logger = logging.getLogger(__name__)

# Cohere trial: 100 llamadas/minuto → esperar 0.7s entre llamadas es seguro
_DELAY_ENTRE_LLAMADAS = 0.7
_MAX_REINTENTOS = 5


def _con_reintento(fn, *args, **kwargs):
    """Ejecuta fn con backoff exponencial ante rate limit 429."""
    espera = 5
    for intento in range(_MAX_REINTENTOS):
        try:
            return fn(*args, **kwargs)
        except TooManyRequestsError:
            if intento == _MAX_REINTENTOS - 1:
                raise
            logger.warning("Rate limit Cohere — esperando %ds (intento %d/%d)...",
                           espera, intento + 1, _MAX_REINTENTOS)
            time.sleep(espera)
            espera = min(espera * 2, 60)
        except Exception:
            raise


class ClienteIA(ClienteLLMPort):
    """
    Cliente 100% Cohere.
    Los embeddings se generan en lotes (máx 96 textos) para minimizar
    la cantidad de llamadas a la API y evitar el rate limit del plan trial.
    """

    TAMANO_LOTE_EMBED = 90  # seguro bajo el límite de 96

    def __init__(self):
        self.cohere_api_key   = os.getenv("COHERE_API_KEY", "").strip()
        self.modelo_chat      = os.getenv("COHERE_MODELO_CHAT", "command-a-03-2025")
        self.modelo_embedding = os.getenv("COHERE_MODELO_EMBEDDING", "embed-multilingual-v3.0")

        self._ok = bool(self.cohere_api_key and not self.cohere_api_key.startswith("your_"))
        self._cliente: cohere.Client | None = None

        if self._ok:
            self._cliente = cohere.Client(api_key=self.cohere_api_key)
            logger.info("Cohere configurado — chat: %s  embedding: %s",
                        self.modelo_chat, self.modelo_embedding)
        else:
            logger.warning("COHERE_API_KEY no configurada.")

    # ------------------------------------------------------------------
    # Puerto ClienteLLMPort
    # ------------------------------------------------------------------

    def esta_configurado(self) -> bool:
        return self._ok and self._cliente is not None

    def generar_embedding(self, texto: str) -> List[float]:
        """Genera embedding para un solo texto (input_type=search_document)."""
        return self.generar_embeddings_lote([texto], "search_document")[0]

    def generar_embedding_consulta(self, texto: str) -> List[float]:
        """Genera embedding optimizado para consultas (input_type=search_query)."""
        return self.generar_embeddings_lote([texto], "search_query")[0]

    def generar_embeddings_lote(self, textos: List[str], input_type: str = "search_document") -> List[List[float]]:
        """
        Genera embeddings para múltiples textos en una sola llamada a la API.
        Cohere acepta hasta 96 textos por llamada — esto es la forma eficiente
        de indexar documentos sin superar el rate limit del plan trial.
        """
        self._verificar()
        todos_embeddings = []

        for i in range(0, len(textos), self.TAMANO_LOTE_EMBED):
            lote = textos[i: i + self.TAMANO_LOTE_EMBED]
            try:
                r = _con_reintento(
                    self._cliente.embed,
                    texts=lote,
                    model=self.modelo_embedding,
                    input_type=input_type,
                )
                todos_embeddings.extend(r.embeddings)
                # Pequeño delay entre lotes para no saturar el rate limit
                if i + self.TAMANO_LOTE_EMBED < len(textos):
                    time.sleep(_DELAY_ENTRE_LLAMADAS)
            except Exception as exc:
                logger.error("Error generando embeddings en lote: %s", exc, exc_info=True)
                raise RuntimeError(f"Error al generar embeddings: {exc}") from exc

        return todos_embeddings

    def generar_respuesta(self, prompt: str) -> str:
        """Genera respuesta con Cohere command-a-03-2025."""
        self._verificar()
        try:
            r = _con_reintento(
                self._cliente.chat,
                model=self.modelo_chat,
                message=prompt,
                temperature=0.2,
                max_tokens=1024,
            )
            return (r.text or "").strip()
        except Exception as exc:
            logger.error("Error chat Cohere: %s", exc, exc_info=True)
            raise RuntimeError(f"Error al generar respuesta: {exc}") from exc

    def validar_api_key(self) -> bool:
        """Valida la clave con una llamada mínima real."""
        if not self.esta_configurado():
            return False
        try:
            self._cliente.models.list()
            logger.info("Validacion Cohere: exitosa.")
            return True
        except Exception as exc:
            logger.warning("Validacion Cohere fallida: %s", exc)
            return False

    def _verificar(self) -> None:
        if not self.esta_configurado():
            raise RuntimeError("COHERE_API_KEY no configurada. Establécela en el archivo .env")
