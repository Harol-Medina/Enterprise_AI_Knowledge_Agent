"""
Adaptador de infraestructura — Repositorio vectorial con ChromaDB.
Implementa RepositorioFragmentosPort usando ChromaDB como base de datos
vectorial persistente y embeddings de OpenAI para la búsqueda semántica.
"""
import logging
import os
from typing import List

import chromadb
from chromadb.config import Settings

from app.domain.entities import FragmentoDocumento
from app.domain.ports import ClienteLLMPort, RepositorioFragmentosPort

logger = logging.getLogger(__name__)


class RepositorioVectorialChroma(RepositorioFragmentosPort):
    """
    Almacena y recupera fragmentos de documentos usando ChromaDB.

    - Los embeddings se generan mediante el ClienteLLMPort (OpenAI).
    - La colección persiste en disco entre reinicios del servidor.
    - La búsqueda es semántica: encuentra fragmentos por significado,
      no solo por palabras clave.
    """

    def __init__(self, cliente_llm: ClienteLLMPort, directorio_persistencia: str, nombre_coleccion: str):
        self.cliente_llm = cliente_llm

        # Inicializar cliente ChromaDB con persistencia en disco
        self.cliente_chroma = chromadb.PersistentClient(
            path=directorio_persistencia,
            settings=Settings(anonymized_telemetry=False),
        )

        # Obtener o crear la colección (sin función de embedding propia —
        # nosotros generamos los embeddings externamente para tener control total)
        self.coleccion = self.cliente_chroma.get_or_create_collection(
            name=nombre_coleccion,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            "ChromaDB inicializado — colección: '%s', fragmentos existentes: %d",
            nombre_coleccion,
            self.coleccion.count(),
        )

    # ------------------------------------------------------------------
    # Implementación del puerto
    # ------------------------------------------------------------------

    def guardar_fragmentos(self, fragmentos: List[FragmentoDocumento]) -> None:
        """
        Genera embeddings para cada fragmento y los almacena en ChromaDB.
        Solo guarda fragmentos que aún no existen (evita duplicados por ID).
        """
        if not fragmentos:
            return

        # Filtrar los que ya están indexados
        ids_existentes = set(self._obtener_ids_existentes())
        nuevos = [f for f in fragmentos if f.id not in ids_existentes]

        if not nuevos:
            logger.info("Todos los fragmentos ya están indexados, nada que agregar.")
            return

        logger.info("Generando embeddings para %d fragmentos nuevos...", len(nuevos))

        # Procesar en lotes para no superar límites de la API
        tamano_lote = 50
        for inicio in range(0, len(nuevos), tamano_lote):
            lote = nuevos[inicio: inicio + tamano_lote]
            self._guardar_lote(lote)

        logger.info("Fragmentos guardados en ChromaDB: %d nuevos.", len(nuevos))

    def buscar(self, consulta: str, top_k: int = 5) -> List[FragmentoDocumento]:
        """
        Busca fragmentos semánticamente relevantes para la consulta.
        Genera el embedding de la consulta y lo compara contra la colección.
        """
        total = self.coleccion.count()
        if total == 0:
            logger.warning("La colección está vacía. No hay documentos indexados.")
            return []

        # Asegurarnos de no pedir más de lo que hay
        k_real = min(top_k, total)

        try:
            # Usar input_type search_query para la consulta si el cliente lo soporta
            if hasattr(self.cliente_llm, "generar_embedding_consulta"):
                embedding_consulta = self.cliente_llm.generar_embedding_consulta(consulta)
            else:
                embedding_consulta = self.cliente_llm.generar_embedding(consulta)
            resultados = self.coleccion.query(
                query_embeddings=[embedding_consulta],
                n_results=k_real,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:
            logger.error("Error en búsqueda vectorial: %s", exc)
            return []

        fragmentos = []
        documentos = resultados.get("documents", [[]])[0]
        metadatos = resultados.get("metadatas", [[]])[0]
        distancias = resultados.get("distances", [[]])[0]
        ids = resultados.get("ids", [[]])[0]

        for id_frag, texto, meta, distancia in zip(ids, documentos, metadatos, distancias):
            # Convertir distancia coseno a similitud (ChromaDB retorna distancia, no similitud)
            similitud = 1.0 - distancia
            fragmentos.append(
                FragmentoDocumento(
                    id=id_frag,
                    texto=texto,
                    fuente=meta.get("fuente", "Desconocido"),
                    metadatos={**meta, "similitud": round(similitud, 4)},
                )
            )

        logger.info("Búsqueda completada: %d fragmentos recuperados para la consulta.", len(fragmentos))
        return fragmentos

    def contar_fragmentos(self) -> int:
        """Retorna el total de fragmentos almacenados en la colección."""
        return self.coleccion.count()

    def limpiar_coleccion(self) -> None:
        """Elimina todos los fragmentos de la colección para reindexación completa."""
        nombre = self.coleccion.name
        self.cliente_chroma.delete_collection(nombre)
        self.coleccion = self.cliente_chroma.get_or_create_collection(
            name=nombre,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("Colección '%s' limpiada completamente.", nombre)

    # ------------------------------------------------------------------
    # Métodos internos
    # ------------------------------------------------------------------

    def _guardar_lote(self, fragmentos: List[FragmentoDocumento]) -> None:
        """
        Genera embeddings para todos los fragmentos del lote en UNA sola llamada
        a Cohere (batch embedding), lo que minimiza las llamadas a la API y
        evita el rate limit del plan trial (100 llamadas/minuto).
        """
        if not fragmentos:
            return

        textos = [f.texto for f in fragmentos]

        # Una sola llamada para todo el lote — Cohere acepta hasta 96 textos
        try:
            if hasattr(self.cliente_llm, "generar_embeddings_lote"):
                embeddings = self.cliente_llm.generar_embeddings_lote(textos, "search_document")
            else:
                embeddings = [self.cliente_llm.generar_embedding(t) for t in textos]
        except Exception as exc:
            logger.error("Error generando embeddings para lote: %s", exc)
            return

        ids       = []
        docs      = []
        embs      = []
        metadatos = []

        for fragmento, embedding in zip(fragmentos, embeddings):
            ids.append(fragmento.id)
            docs.append(fragmento.texto)
            embs.append(embedding)
            metadatos.append({
                "fuente": fragmento.fuente,
                **{k: str(v) for k, v in fragmento.metadatos.items()},
            })

        self.coleccion.add(
            ids=ids,
            documents=docs,
            embeddings=embs,
            metadatas=metadatos,
        )
        logger.info("Lote guardado: %d fragmentos.", len(ids))

    def _obtener_ids_existentes(self) -> List[str]:
        """Obtiene todos los IDs ya almacenados en la colección."""
        try:
            resultado = self.coleccion.get(include=[])
            return resultado.get("ids", [])
        except Exception:
            return []
