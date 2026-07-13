"""
Capa API — todos los endpoints REST del Agente Santos Pegasus Soluciones.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi import UploadFile, File, Form
from fastapi.responses import JSONResponse

from app.orchestrator import Orquestador
from app.schemas import (
    RespuestaConsulta, RespuestaEstadoIndice, RespuestaIngesta,
    RespuestaSalud, RespuestaValidacionApi,
    SolicitudConsulta, SolicitudIngesta,
    SolicitudLogin, RespuestaLogin,
    SolicitudCambiarContrasena, SolicitudActualizarPerfil, SolicitudActualizarEstado, RespuestaUsuario,
    SolicitudCrearConversacion, RespuestaConversacion, RespuestaHistorial,
    RespuestaEstadisticasAdmin, RespuestaListaDocumentos,
)

logger = logging.getLogger(__name__)
router = APIRouter()

_orquestador: Orquestador | None = None


def _documento_visible_para_rol(nombre_doc: str, rol: str) -> bool:
    texto = (nombre_doc or "").lower()
    if rol in {"admin", "fullstack"}:
        return True

    if any(token in texto for token in ["manual", "onboarding", "arquitectura", "microservicios", "mapa de dominios"]):
        return True

    if any(token in texto for token in ["frontend", "front-end", "front end", "ingenieria frontend"]):
        return rol == "frontend"

    if any(token in texto for token in ["backend", "back-end", "back end", "ingenieria backend"]):
        return rol == "backend"

    if any(token in texto for token in ["protocolo", "incidente"]):
        return False

    return False


def obtener_orquestador() -> Orquestador:
    global _orquestador
    if _orquestador is None:
        _orquestador = Orquestador()
    return _orquestador


# ══════════════════════════════════════════════════════════════════
# Sistema
# ══════════════════════════════════════════════════════════════════

@router.get("/salud", response_model=RespuestaSalud, tags=["Sistema"])
def salud():
    return RespuestaSalud(
        estado="ok",
        mensaje="Agente de Conocimiento Santos Pegasus Soluciones operativo",
        version="1.0.0",
    )


@router.get("/validar-api", response_model=RespuestaValidacionApi, tags=["Sistema"])
def validar_api(orq: Orquestador = Depends(obtener_orquestador)):
    c = orq.servicio.cliente_llm
    if not c.esta_configurado():
        return RespuestaValidacionApi(
            api_key_valida=False, proveedor="Cohere",
            modelo_chat=c.modelo_chat, modelo_embedding=c.modelo_embedding,
            mensaje="No se ha configurado la variable COHERE_API_KEY. Algunas funciones que usan Cohere no estarán disponibles.",
        )
    valida = c.validar_api_key()
    return RespuestaValidacionApi(
        api_key_valida=valida, proveedor="Cohere",
        modelo_chat=c.modelo_chat, modelo_embedding=c.modelo_embedding,
        mensaje="Cohere operativo" if valida else "Clave inválida — verifica COHERE_API_KEY",
    )


@router.get("/estado-indice", response_model=RespuestaEstadoIndice, tags=["Sistema"])
def estado_indice(orq: Orquestador = Depends(obtener_orquestador)):
    return RespuestaEstadoIndice(**orq.servicio.estado_indice())


# ─────────────────────────────────────────────────────────────────────────────
# Documentos: upload y listado filtrado por usuario
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/documentos/upload", tags=["Documentos"])
def upload_documento(username: str = Form(...), file: UploadFile = File(...), orq: Orquestador = Depends(obtener_orquestador)):
    # Solo administrador puede subir documentos
    if not orq.repo_usuarios.es_admin(username):
        raise HTTPException(403, detail="Acceso denegado. Necesitas permisos de administrador para subir documentos.")
    # Guardar archivo en el directorio de documentos
    repo_docs = orq.servicio.repositorio_documentos
    destino = repo_docs.directorio_raiz / file.filename
    try:
        with destino.open("wb") as f:
            content = file.file.read()
            f.write(content)
    except Exception as exc:
        raise HTTPException(500, detail="No fue posible guardar el archivo en el servidor.")
    return JSONResponse({"ok": True, "mensaje": f"Archivo {file.filename} subido correctamente."})


@router.get("/documentos/listar/{username}", response_model=RespuestaListaDocumentos, tags=["Documentos"])
def listar_documentos_usuario(username: str, orq: Orquestador = Depends(obtener_orquestador)):
    """Lista los documentos visibles para el rol del usuario autenticado."""
    todos = orq.servicio.repositorio_documentos.listar_documentos()
    usuario = orq.repo_usuarios.obtener_usuario(username) or {}
    rol = usuario.get("rol", "usuario")
    visibles = [d for d in todos if _documento_visible_para_rol(d, rol)]
    return {"documentos": visibles}


# ══════════════════════════════════════════════════════════════════
# Documentos
# ══════════════════════════════════════════════════════════════════

@router.post("/indexar", response_model=RespuestaIngesta, tags=["Documentos"])
def indexar(solicitud: SolicitudIngesta, orq: Orquestador = Depends(obtener_orquestador)):
    if not orq.servicio.cliente_llm.esta_configurado():
        raise HTTPException(503, detail="Para indexar documentos debes configurar la variable COHERE_API_KEY.")
    total = orq.servicio.ingestar_documentos(forzar_reindexacion=solicitud.forzar_reindexacion)
    accion = "Reindexación" if solicitud.forzar_reindexacion else "Ingesta"
    return RespuestaIngesta(fragmentos_indexados=total, mensaje=f"{accion} completada. {total} fragmentos.")


# ══════════════════════════════════════════════════════════════════
# Agente RAG
# ══════════════════════════════════════════════════════════════════

@router.post("/agente/consultar", response_model=RespuestaConsulta, tags=["Agente"])
def consultar(solicitud: SolicitudConsulta, orq: Orquestador = Depends(obtener_orquestador)):
    """
    Pipeline RAG completo:
    1. Búsqueda semántica en ChromaDB (Cohere embeddings)
    2. Complemento web con Tavily si está habilitado y la consulta es relevante
    3. Generación de respuesta con Cohere command-a-03-2025
    4. Persiste el mensaje en el historial si se provee id_conversacion
    """
    try:
        username = (solicitud.username or "").strip() or "__anon__"

        # Obtener historial si hay conversación activa
        historial = []
        if solicitud.id_conversacion:
            conv = orq.repo_usuarios.obtener_conversacion(username, solicitud.id_conversacion)
            if conv:
                historial = conv.get("mensajes", [])

        resultado = orq.servicio.responder_consulta(solicitud.pregunta, historial=historial)

        # Persistir mensajes en el historial
        conv_id = solicitud.id_conversacion
        if conv_id:
            orq.repo_usuarios.agregar_mensaje(username, conv_id, "usuario", solicitud.pregunta)
            orq.repo_usuarios.agregar_mensaje(
                username, conv_id, "agente", resultado.respuesta,
                metadatos={"confianza": resultado.confianza, "citas": resultado.citas},
            )

        return RespuestaConsulta(
            respuesta=resultado.respuesta,
            fuente_principal=resultado.fuente_principal,
            confianza=resultado.confianza,
            citas=resultado.citas,
            sin_respuesta=resultado.sin_respuesta,
            id_conversacion=conv_id,
        )
    except Exception as exc:
        logger.error("Error procesando consulta: %s", exc, exc_info=True)
        return RespuestaConsulta(
            respuesta="Lo siento — ocurrió un error interno al procesar tu consulta. Por favor inténtalo de nuevo más tarde.",
            fuente_principal="Error",
            confianza=0.0,
            citas=[],
            sin_respuesta=True,
        )


# ══════════════════════════════════════════════════════════════════
# Autenticación
# ══════════════════════════════════════════════════════════════════

@router.post("/auth/login", response_model=RespuestaLogin, tags=["Auth"])
def login(solicitud: SolicitudLogin, orq: Orquestador = Depends(obtener_orquestador)):
    usuario = orq.repo_usuarios.autenticar(solicitud.username, solicitud.contrasena)
    if not usuario:
        return RespuestaLogin(ok=False, mensaje="No fue posible iniciar sesión. Verifica usuario y contraseña.")
    return RespuestaLogin(
        ok=True,
        username=solicitud.username,
        nombre=usuario.get("nombre", ""),
        rol=usuario.get("rol", "usuario"),
        mensaje="Inicio de sesión exitoso",
    )


# ══════════════════════════════════════════════════════════════════
# Usuarios
# ══════════════════════════════════════════════════════════════════

@router.get("/usuarios", tags=["Usuarios"])
def listar_usuarios(orq: Orquestador = Depends(obtener_orquestador)):
    return {"usuarios": orq.repo_usuarios.listar_usuarios()}


@router.get("/usuarios/{username}", tags=["Usuarios"])
def obtener_usuario(username: str, orq: Orquestador = Depends(obtener_orquestador)):
    u = orq.repo_usuarios.obtener_usuario(username)
    if not u:
        raise HTTPException(404, detail="Usuario no encontrado")
    return u


@router.post("/usuarios/cambiar-contrasena", response_model=RespuestaUsuario, tags=["Usuarios"])
def cambiar_contrasena(s: SolicitudCambiarContrasena, orq: Orquestador = Depends(obtener_orquestador)):
    ok = orq.repo_usuarios.cambiar_contrasena(s.username, s.contrasena_actual, s.nueva_contrasena)
    if not ok:
        return RespuestaUsuario(ok=False, mensaje="La contraseña actual no coincide. Intenta de nuevo.")
    return RespuestaUsuario(ok=True, mensaje="Contraseña actualizada correctamente")


@router.post("/usuarios/actualizar-perfil", response_model=RespuestaUsuario, tags=["Usuarios"])
def actualizar_perfil(s: SolicitudActualizarPerfil, orq: Orquestador = Depends(obtener_orquestador)):
    ok = orq.repo_usuarios.actualizar_perfil(s.username, s.nombre, s.apellido, s.email)
    if not ok:
        return RespuestaUsuario(ok=False, mensaje="No se encontró el usuario solicitado.")
    return RespuestaUsuario(ok=True, mensaje="Perfil actualizado correctamente")


@router.post("/usuarios/actualizar-estado", response_model=RespuestaUsuario, tags=["Usuarios"])
def actualizar_estado(s: SolicitudActualizarEstado, orq: Orquestador = Depends(obtener_orquestador)):
    ok = orq.repo_usuarios.actualizar_estado_usuario(s.username, s.activo)
    if not ok:
        return RespuestaUsuario(ok=False, mensaje="No se encontró el usuario solicitado.")
    return RespuestaUsuario(ok=True, mensaje="Estado actualizado correctamente")


# ══════════════════════════════════════════════════════════════════
# Historial de chat
# ══════════════════════════════════════════════════════════════════

@router.post("/chat/conversacion", tags=["Chat"])
def crear_conversacion(s: SolicitudCrearConversacion, orq: Orquestador = Depends(obtener_orquestador)):
    conv_id = orq.repo_usuarios.crear_conversacion(s.username, s.titulo)
    return {"id_conversacion": conv_id}


@router.get("/chat/historial/{username}", response_model=RespuestaHistorial, tags=["Chat"])
def obtener_historial(username: str, orq: Orquestador = Depends(obtener_orquestador)):
    convs = orq.repo_usuarios.obtener_conversaciones(username)
    return RespuestaHistorial(
        conversaciones=[
            RespuestaConversacion(
                id=c["id"],
                titulo=c["titulo"],
                creado_en=c["creado_en"],
                actualizado_en=c["actualizado_en"],
                total_mensajes=len(c.get("mensajes", [])),
            )
            for c in convs
        ]
    )


@router.get("/chat/conversacion/{username}/{conv_id}", tags=["Chat"])
def obtener_conversacion(username: str, conv_id: str, orq: Orquestador = Depends(obtener_orquestador)):
    conv = orq.repo_usuarios.obtener_conversacion(username, conv_id)
    if not conv:
        raise HTTPException(404, detail="Conversación no encontrada")
    return conv


@router.delete("/chat/conversacion/{username}/{conv_id}", tags=["Chat"])
def eliminar_conversacion(username: str, conv_id: str, orq: Orquestador = Depends(obtener_orquestador)):
    ok = orq.repo_usuarios.eliminar_conversacion(username, conv_id)
    if not ok:
        raise HTTPException(404, detail="Conversación no encontrada")
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════
# Admin
# ══════════════════════════════════════════════════════════════════

@router.get("/admin/estadisticas", response_model=RespuestaEstadisticasAdmin, tags=["Admin"])
def estadisticas_admin(orq: Orquestador = Depends(obtener_orquestador)):
    return RespuestaEstadisticasAdmin(**orq.repo_usuarios.estadisticas_admin())
