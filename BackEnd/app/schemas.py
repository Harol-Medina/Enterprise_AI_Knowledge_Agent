"""
Esquemas Pydantic para todos los endpoints de la API.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Consulta al agente ────────────────────────────────────────────────────

class SolicitudConsulta(BaseModel):
    pregunta: str = Field(..., min_length=3, max_length=2000)
    id_conversacion: Optional[str] = None
    username: Optional[str] = None


class RespuestaConsulta(BaseModel):
    respuesta: str
    fuente_principal: str
    confianza: float
    citas: List[str] = []
    sin_respuesta: bool = False
    id_conversacion: Optional[str] = None


# ── Sistema ───────────────────────────────────────────────────────────────

class RespuestaSalud(BaseModel):
    estado: str
    mensaje: str
    version: str = "1.0.0"


class RespuestaValidacionApi(BaseModel):
    api_key_valida: bool
    proveedor: str
    modelo_chat: str
    modelo_embedding: str
    mensaje: str


class RespuestaEstadoIndice(BaseModel):
    fragmentos_indexados: int
    documentos_disponibles: int
    nombres_documentos: List[str]
    llm_configurado: bool
    busqueda_web_habilitada: bool = False


# ── Ingesta ───────────────────────────────────────────────────────────────

class SolicitudIngesta(BaseModel):
    forzar_reindexacion: bool = Field(default=False)


class RespuestaIngesta(BaseModel):
    fragmentos_indexados: int
    mensaje: str


# ── Autenticación ─────────────────────────────────────────────────────────

class SolicitudLogin(BaseModel):
    username: str = Field(..., min_length=1)
    contrasena: str = Field(..., min_length=1)


class RespuestaLogin(BaseModel):
    ok: bool
    username: str = ""
    nombre: str = ""
    rol: str = ""
    mensaje: str = ""


# ── Usuarios ──────────────────────────────────────────────────────────────

class SolicitudCambiarContrasena(BaseModel):
    username: str
    contrasena_actual: str
    nueva_contrasena: str = Field(..., min_length=6)


class SolicitudActualizarPerfil(BaseModel):
    username: str
    nombre: str
    apellido: str
    email: str


class SolicitudActualizarEstado(BaseModel):
    username: str
    activo: bool


class RespuestaUsuario(BaseModel):
    ok: bool
    mensaje: str = ""


# ── Documentos ────────────────────────────────────────────────────────────

class RespuestaListaDocumentos(BaseModel):
    documentos: List[str]


# ── Historial de chat ─────────────────────────────────────────────────────

class SolicitudCrearConversacion(BaseModel):
    username: str
    titulo: str = "Nueva conversación"


class RespuestaConversacion(BaseModel):
    id: str
    titulo: str
    creado_en: str
    actualizado_en: str
    total_mensajes: int = 0


class RespuestaMensaje(BaseModel):
    rol: str
    texto: str
    timestamp: str
    metadatos: Dict[str, Any] = {}


class RespuestaHistorial(BaseModel):
    conversaciones: List[RespuestaConversacion]


# ── Admin ─────────────────────────────────────────────────────────────────

class RespuestaEstadisticasAdmin(BaseModel):
    total_usuarios: int
    usuarios_activos: int
    total_conversaciones: int
    total_mensajes: int
    por_usuario: List[Dict[str, Any]]
