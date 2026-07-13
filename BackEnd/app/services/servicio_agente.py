"""
Servicio de agente — caso de uso principal.
"""
import logging
from typing import List, Optional

from app.domain.entities import ResultadoConsulta
from app.domain.ports import ClienteLLMPort, RepositorioDocumentosPort, RepositorioFragmentosPort
from app.services.procesamiento_documentos import ServicioProcesamiento
from app.services.servicio_rag import ServicioRag
from app.services.servicio_tavily import ServicioTavily

logger = logging.getLogger(__name__)


class ServicioAgente:
    def __init__(
        self,
        repositorio_documentos: RepositorioDocumentosPort,
        repositorio_fragmentos: RepositorioFragmentosPort,
        cliente_llm: ClienteLLMPort,
    ):
        self.repositorio_documentos = repositorio_documentos
        self.repositorio_fragmentos = repositorio_fragmentos
        self.cliente_llm = cliente_llm
        self._procesamiento = ServicioProcesamiento(repositorio_documentos)
        self._tavily = ServicioTavily()
        self._rag = ServicioRag(repositorio_fragmentos, cliente_llm, servicio_tavily=self._tavily)

    def ingestar_documentos(self, forzar_reindexacion: bool = False) -> int:
        if forzar_reindexacion:
            self.repositorio_fragmentos.limpiar_coleccion()
        fragmentos = self._procesamiento.procesar_todos()
        if not fragmentos:
            return 0
        self.repositorio_fragmentos.guardar_fragmentos(fragmentos)
        return self.repositorio_fragmentos.contar_fragmentos()

    def responder_consulta(
        self,
        pregunta: str,
        historial: Optional[List[dict]] = None,
    ) -> ResultadoConsulta:
        fragmentos = self._rag.recuperar(pregunta)
        return self._rag.generar(pregunta, fragmentos, historial=historial)

    def estado_indice(self) -> dict:
        total = self.repositorio_fragmentos.contar_fragmentos()
        docs = self.repositorio_documentos.listar_documentos()
        return {
            "fragmentos_indexados": total,
            "documentos_disponibles": len(docs),
            "nombres_documentos": docs,
            "llm_configurado": self.cliente_llm.esta_configurado(),
            "busqueda_web_habilitada": self._tavily.esta_habilitado(),
        }
