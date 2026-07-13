"""
Servicio de búsqueda web con Tavily.
Solo se activa cuando:
  1. TAVILY_HABILITADO=true en .env
  2. La consulta está relacionada con los temas documentados (control temático)
  3. Los documentos internos ya tienen contenido relevante (no reemplaza, complementa)

Control de tema: bloquea consultas fuera de ámbito como deportes,
entretenimiento, política, etc.
"""
import logging
import os
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

_RAIZ = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(dotenv_path=_RAIZ / ".env")

logger = logging.getLogger(__name__)

# Temas relacionados con el dominio de la empresa — consultas fuera de esto se bloquean
_TEMAS_PERMITIDOS = [
    "tecnología", "software", "programación", "desarrollo", "backend", "frontend",
    "microservicios", "arquitectura", "api", "base de datos", "cloud", "kubernetes",
    "devops", "ci/cd", "seguridad", "onboarding", "recursos humanos", "incidentes",
    "post-mortem", "ingeniería", "infraestructura", "contenedor", "docker",
    "python", "javascript", "typescript", "react", "fastapi", "oci", "oracle",
    "autenticación", "autorización", "jwt", "oauth", "rest", "graphql",
    "testing", "pruebas", "deployment", "monitoreo", "logs", "métricas",
    "santos pegasus", "empresa", "colaborador", "proceso", "metodología",
    "agile", "scrum", "sprint", "documentación", "estándar",
]

_TEMAS_BLOQUEADOS = [
    "fútbol", "béisbol", "deporte", "pokemon", "anime", "película", "serie",
    "música", "cantante", "actor", "farándula", "política", "elecciones",
    "presidente", "gobierno", "partido", "receta", "cocina", "moda",
    "criptomoneda", "bitcoin", "casino", "apuesta", "horóscopo",
]


def _es_consulta_relevante(pregunta: str) -> bool:
    """
    Control de relevancia temática.
    Retorna True si la consulta es técnica/empresarial y no está bloqueada.
    """
    pregunta_lower = pregunta.lower()

    # Bloquear primero temas explícitamente fuera de ámbito
    for tema in _TEMAS_BLOQUEADOS:
        if tema in pregunta_lower:
            logger.info("Tavily bloqueado: consulta fuera de ámbito ('%s')", tema)
            return False

    # Verificar que hay al menos un tema relevante
    for tema in _TEMAS_PERMITIDOS:
        if tema in pregunta_lower:
            return True

    # Si no hay match explícito, solo buscar si la pregunta parece técnica
    indicadores_tecnicos = ["cómo", "qué es", "cuál", "implementar", "configurar",
                            "instalar", "usar", "buenas prácticas", "diferencia entre"]
    for ind in indicadores_tecnicos:
        if ind in pregunta_lower:
            return True

    logger.info("Tavily omitido: consulta no tiene temas técnicos reconocidos.")
    return False


class ServicioTavily:
    """
    Busca información web complementaria usando Tavily.
    Solo actúa como refuerzo cuando los documentos internos ya tienen contexto relevante.
    """

    def __init__(self):
        self.habilitado = os.getenv("TAVILY_HABILITADO", "false").lower() == "true"
        self.api_key = os.getenv("TAVILY_API_KEY", "").strip()
        dominios_raw = os.getenv(
            "TAVILY_DOMINIOS_PERMITIDOS",
            "docs.python.org,fastapi.tiangolo.com,owasp.org,kubernetes.io,docs.github.com,learn.microsoft.com",
        )
        self.dominios_permitidos = [d.strip() for d in dominios_raw.split(",") if d.strip()]
        self._cliente = None

        if self.habilitado and self.api_key:
            try:
                from tavily import TavilyClient
                self._cliente = TavilyClient(api_key=self.api_key)
                logger.info("Tavily habilitado — dominios: %s", self.dominios_permitidos)
            except ImportError:
                logger.warning("tavily-python no instalado. Búsqueda web deshabilitada.")
                self.habilitado = False
        elif self.habilitado:
            logger.warning("Tavily habilitado en .env pero TAVILY_API_KEY no configurada.")
            self.habilitado = False

    def esta_habilitado(self) -> bool:
        return self.habilitado and self._cliente is not None

    def buscar(self, pregunta: str, confianza_documentos: float = 0.0) -> Optional[str]:
        """
        Busca en la web solo si:
        - Tavily está habilitado
        - La consulta es temáticamente relevante
        - Los documentos tienen algo de contexto (confianza > 0.3) para que la búsqueda complemente

        Retorna texto de contexto web o None si no aplica.
        """
        if not self.esta_habilitado():
            return None

        if not _es_consulta_relevante(pregunta):
            return None

        # Solo complementar si hay algo en los docs — no reemplazar
        if confianza_documentos < 0.25:
            logger.info("Tavily omitido: confianza documental muy baja (%.2f)", confianza_documentos)
            return None

        try:
            logger.info("Tavily buscando: '%s'", pregunta[:60])
            resultado = self._cliente.search(
                query=pregunta,
                search_depth="basic",
                max_results=3,
                include_domains=self.dominios_permitidos,
            )
            resultados = resultado.get("results", [])
            if not resultados:
                return None

            fragmentos_web = []
            for r in resultados:
                titulo  = r.get("title", "")
                url     = r.get("url", "")
                contenido = r.get("content", "")
                if contenido:
                    fragmentos_web.append(
                        f"[Fuente web: {titulo}]({url})\n{contenido[:400]}"
                    )

            if not fragmentos_web:
                return None

            contexto_web = "\n\n".join(fragmentos_web)
            logger.info("Tavily retornó %d resultados.", len(fragmentos_web))
            return contexto_web

        except Exception as exc:
            logger.warning("Error en búsqueda Tavily: %s", exc)
            return None
