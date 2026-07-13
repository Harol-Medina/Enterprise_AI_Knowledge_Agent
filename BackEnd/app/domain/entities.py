"""
Entidades del dominio — núcleo de la arquitectura hexagonal.
Estas clases no dependen de ningún framework externo.
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class FragmentoDocumento:
    """
    Unidad mínima de texto extraída de un documento.
    Contiene el texto limpio y los metadatos necesarios para trazabilidad.
    """
    id: str
    texto: str
    fuente: str
    metadatos: dict = field(default_factory=dict)

    def es_valido(self) -> bool:
        """Verifica que el fragmento tiene contenido útil."""
        return bool(self.texto and self.texto.strip() and len(self.texto.strip()) >= 20)


@dataclass
class ResultadoConsulta:
    """
    Resultado completo generado por el pipeline RAG para una consulta del usuario.
    Incluye la respuesta, fuentes citadas y nivel de confianza.
    """
    respuesta: str
    fuente_principal: str
    confianza: float
    citas: list = field(default_factory=list)
    sin_respuesta: bool = False

    def __post_init__(self):
        # Garantiza que la confianza esté en el rango [0.0, 1.0]
        self.confianza = max(0.0, min(1.0, self.confianza))


@dataclass
class EstadoApiKey:
    """
    Resultado de la validación de una clave de API.
    Usado por el endpoint de salud extendido.
    """
    valida: bool
    proveedor: str
    mensaje: str
    modelo_chat: Optional[str] = None
    modelo_embedding: Optional[str] = None
