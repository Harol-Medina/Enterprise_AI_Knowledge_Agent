"""Consulta web complementaria y restringida mediante Tavily."""
import logging
import os
from dataclasses import dataclass
from typing import List

import httpx

logger = logging.getLogger(__name__)

DOMINIOS_CONFIABLES_POR_DEFECTO = [
    "docs.python.org", "fastapi.tiangolo.com", "owasp.org", "nist.gov",
    "kubernetes.io", "cncf.io", "docs.github.com", "learn.microsoft.com",
    "docs.aws.amazon.com",
]


@dataclass
class ResultadoWeb:
    contexto: str
    citas: List[str]


class ServicioWebTavily:
    """Adaptador de Tavily; la web nunca es la fuente principal."""

    def __init__(self):
        self.api_key = os.getenv("TAVILY_API_KEY", "").strip()
        self.habilitado = os.getenv("TAVILY_HABILITADO", "false").strip().lower() == "true"
        dominios = os.getenv("TAVILY_DOMINIOS_PERMITIDOS", "").strip()
        self.dominios_permitidos = (
            [d.strip() for d in dominios.split(",") if d.strip()]
            if dominios else DOMINIOS_CONFIABLES_POR_DEFECTO
        )

    def esta_configurado(self) -> bool:
        return self.habilitado and bool(self.api_key) and not self.api_key.startswith("your_")

    def buscar_contexto(self, consulta: str, max_resultados: int = 3) -> ResultadoWeb:
        """Busca únicamente en la lista cerrada de dominios permitidos."""
        if not self.esta_configurado():
            return ResultadoWeb(contexto="", citas=[])
        try:
            respuesta = httpx.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": self.api_key,
                    "query": consulta,
                    "search_depth": "advanced",
                    "max_results": max_resultados,
                    "include_domains": self.dominios_permitidos,
                    "include_answer": False,
                    "include_raw_content": False,
                },
                timeout=12.0,
            )
            respuesta.raise_for_status()
            resultados = respuesta.json().get("results", [])
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("No se pudo obtener contexto de Tavily: %s", exc)
            return ResultadoWeb(contexto="", citas=[])

        bloques, citas = [], []
        for resultado in resultados[:max_resultados]:
            url = resultado.get("url", "")
            contenido = resultado.get("content", "").strip()
            if not url or not contenido:
                continue
            bloques.append(
                f"Fuente: {resultado.get('title', 'Fuente web confiable')}\\n"
                f"URL: {url}\\nContenido: {contenido[:1200]}"
            )
            citas.append(url)
        return ResultadoWeb(contexto="\\n\\n".join(bloques), citas=citas)
