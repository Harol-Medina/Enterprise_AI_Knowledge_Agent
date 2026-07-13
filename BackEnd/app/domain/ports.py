"""
Puertos del dominio — interfaces abstractas de la arquitectura hexagonal.
Definen los contratos que deben cumplir las implementaciones de infraestructura.
El dominio nunca importa las implementaciones concretas, solo estos puertos.
"""
from abc import ABC, abstractmethod
from typing import List

from app.domain.entities import FragmentoDocumento


class RepositorioDocumentosPort(ABC):
    """
    Puerto de entrada: acceso a los documentos originales en su fuente.
    La implementación concreta puede ser un directorio local, S3, SharePoint, etc.
    """

    @abstractmethod
    def listar_documentos(self) -> List[str]:
        """Retorna los nombres de todos los documentos disponibles."""
        raise NotImplementedError

    @abstractmethod
    def cargar_documento(self, nombre: str) -> str:
        """Carga el contenido de texto de un documento por su nombre."""
        raise NotImplementedError


class RepositorioFragmentosPort(ABC):
    """
    Puerto de salida: almacenamiento y recuperación de fragmentos indexados.
    La implementación concreta puede ser ChromaDB, Pinecone, pgvector, etc.
    """

    @abstractmethod
    def guardar_fragmentos(self, fragmentos: List[FragmentoDocumento]) -> None:
        """Persiste una lista de fragmentos en el almacén vectorial."""
        raise NotImplementedError

    @abstractmethod
    def buscar(self, consulta: str, top_k: int = 5) -> List[FragmentoDocumento]:
        """
        Busca fragmentos semánticamente relevantes para la consulta.
        Retorna los top_k más similares ordenados por relevancia descendente.
        """
        raise NotImplementedError

    @abstractmethod
    def contar_fragmentos(self) -> int:
        """Retorna el total de fragmentos indexados en la colección."""
        raise NotImplementedError

    @abstractmethod
    def limpiar_coleccion(self) -> None:
        """Elimina todos los fragmentos de la colección (útil para reindexación completa)."""
        raise NotImplementedError


class ClienteLLMPort(ABC):
    """
    Puerto de salida: cliente del modelo de lenguaje grande.
    La implementación concreta puede ser OpenAI, Anthropic, Gemini, etc.
    """

    @abstractmethod
    def esta_configurado(self) -> bool:
        """Verifica si la clave de API está presente y tiene formato válido."""
        raise NotImplementedError

    @abstractmethod
    def generar_respuesta(self, prompt: str) -> str:
        """Genera una respuesta de texto dado un prompt completo."""
        raise NotImplementedError

    @abstractmethod
    def generar_embedding(self, texto: str) -> List[float]:
        """Genera un vector de embedding para el texto dado."""
        raise NotImplementedError

    @abstractmethod
    def validar_api_key(self) -> bool:
        """
        Realiza una llamada real a la API para verificar que la clave es válida.
        Más costoso que esta_configurado() pero garantiza que la clave funciona.
        """
        raise NotImplementedError
