"""
Repositorio de usuarios y historial de chat.
Persiste en un archivo JSON local — simple, sin base de datos extra.
Los usuarios y el historial se guardan en BackEnd/data/usuarios.json
"""
import hashlib
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

_DIRECTORIO_DATOS = Path(__file__).resolve().parent.parent.parent / "data"
_ARCHIVO_USUARIOS = _DIRECTORIO_DATOS / "usuarios.json"

# ── Estructura inicial con 4 usuarios por rol ────────────────────────────
_USUARIOS_INICIALES = {
    "admin": {
        "nombre": "Administrador",
        "apellido": "General",
        "email": "admin@santospegasus.com",
        "rol": "admin",
        "contrasena_hash": None,
        "activo": True,
        "creado_en": "2024-01-01T00:00:00",
    },
    "backend": {
        "nombre": "Carlos",
        "apellido": "Ramirez",
        "email": "backend@santospegasus.com",
        "rol": "backend",
        "contrasena_hash": None,
        "activo": True,
        "creado_en": "2024-01-15T00:00:00",
    },
    "frontend": {
        "nombre": "Maria",
        "apellido": "Gonzalez",
        "email": "frontend@santospegasus.com",
        "rol": "frontend",
        "contrasena_hash": None,
        "activo": True,
        "creado_en": "2024-01-20T00:00:00",
    },
    "fullstack": {
        "nombre": "Ana",
        "apellido": "Martinez",
        "email": "fullstack@santospegasus.com",
        "rol": "fullstack",
        "contrasena_hash": None,
        "activo": True,
        "creado_en": "2024-02-01T00:00:00",
    },
}

_CONTRASENAS_INICIALES = {
    "admin": "Admin2024!",
    "backend": "Backend2024!",
    "frontend": "Frontend2024!",
    "fullstack": "Fullstack2024!",
}


def _hash_contrasena(contrasena: str) -> str:
    return hashlib.sha256(contrasena.encode()).hexdigest()


def _inicializar_usuarios() -> dict:
    """Crea la estructura inicial de usuarios con contraseñas hasheadas."""
    usuarios = {}
    for username, datos in _USUARIOS_INICIALES.items():
        u = dict(datos)
        u["contrasena_hash"] = _hash_contrasena(_CONTRASENAS_INICIALES[username])
        usuarios[username] = u
    return usuarios


def _normalizar_usuarios(datos: dict) -> dict:
    """Asegura que existan los usuarios base aunque el archivo JSON ya exista."""
    usuarios = datos.setdefault("usuarios", {})
    cambiado = False
    for username, plantilla in _USUARIOS_INICIALES.items():
        if username not in usuarios:
            u = dict(plantilla)
            u["contrasena_hash"] = _hash_contrasena(_CONTRASENAS_INICIALES[username])
            usuarios[username] = u
            cambiado = True
    if cambiado:
        datos["usuarios"] = usuarios
    return datos


def _cargar_datos() -> dict:
    """Carga usuarios.json o crea el archivo con datos iniciales."""
    _DIRECTORIO_DATOS.mkdir(parents=True, exist_ok=True)
    if not _ARCHIVO_USUARIOS.exists():
        datos = {
            "usuarios": _inicializar_usuarios(),
            "historial": {},   # { username: [ {id, titulo, mensajes, creado_en} ] }
        }
        _guardar_datos(datos)
        logger.info("Archivo de usuarios creado con 4 usuarios iniciales.")
        return datos
    with open(_ARCHIVO_USUARIOS, "r", encoding="utf-8") as f:
        datos = json.load(f)
    datos = _normalizar_usuarios(datos)
    if datos.get("usuarios") and any(u not in datos["usuarios"] for u in _USUARIOS_INICIALES):
        _guardar_datos(datos)
    return datos


def _guardar_datos(datos: dict) -> None:
    _DIRECTORIO_DATOS.mkdir(parents=True, exist_ok=True)
    with open(_ARCHIVO_USUARIOS, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)


class RepositorioUsuarios:
    """
    Gestión de usuarios y historial de chat.
    Thread-safe para uso con FastAPI (las operaciones son atómicas sobre JSON).
    """

    # ── Autenticación ──────────────────────────────────────────────────────

    def autenticar(self, username: str, contrasena: str) -> Optional[dict]:
        """Retorna el usuario si las credenciales son correctas, None si no."""
        datos = _cargar_datos()
        usuario = datos["usuarios"].get(username)
        if not usuario:
            return None
        if not usuario.get("activo", True):
            return None
        if usuario["contrasena_hash"] != _hash_contrasena(contrasena):
            return None
        return {k: v for k, v in usuario.items() if k != "contrasena_hash"}

    def obtener_usuario(self, username: str) -> Optional[dict]:
        """Retorna datos del usuario sin la contraseña."""
        datos = _cargar_datos()
        u = datos["usuarios"].get(username)
        if not u:
            return None
        return {k: v for k, v in u.items() if k != "contrasena_hash"}

    def listar_usuarios(self) -> List[dict]:
        """Lista todos los usuarios (sin contraseñas)."""
        datos = _cargar_datos()
        return [
            {"username": uname, **{k: v for k, v in u.items() if k != "contrasena_hash"}}
            for uname, u in datos["usuarios"].items()
        ]

    def cambiar_contrasena(self, username: str, contrasena_actual: str, nueva_contrasena: str) -> bool:
        """Cambia la contraseña si la actual es correcta."""
        datos = _cargar_datos()
        usuario = datos["usuarios"].get(username)
        if not usuario:
            return False
        if usuario["contrasena_hash"] != _hash_contrasena(contrasena_actual):
            return False
        datos["usuarios"][username]["contrasena_hash"] = _hash_contrasena(nueva_contrasena)
        _guardar_datos(datos)
        return True

    def actualizar_perfil(self, username: str, nombre: str, apellido: str, email: str) -> bool:
        """Actualiza nombre, apellido y email del usuario."""
        datos = _cargar_datos()
        if username not in datos["usuarios"]:
            return False
        datos["usuarios"][username]["nombre"]   = nombre
        datos["usuarios"][username]["apellido"] = apellido
        datos["usuarios"][username]["email"]    = email
        _guardar_datos(datos)
        return True

    def actualizar_estado_usuario(self, username: str, activo: bool) -> bool:
        """Activa o desactiva un usuario desde el panel de administración."""
        datos = _cargar_datos()
        if username not in datos["usuarios"]:
            return False
        datos["usuarios"][username]["activo"] = activo
        _guardar_datos(datos)
        return True

    def es_admin(self, username: str) -> bool:
        datos = _cargar_datos()
        u = datos["usuarios"].get(username)
        return u is not None and u.get("rol") == "admin"
    
    def obtener_rol(self, username: str) -> str:
        datos = _cargar_datos()
        u = datos["usuarios"].get(username)
        if not u:
            return "usuario"
        return u.get("rol", "usuario")

    # ── Historial de chat ──────────────────────────────────────────────────

    def crear_conversacion(self, username: str, titulo: str = "Nueva conversación") -> str:
        """Crea una nueva conversación y retorna su ID."""
        datos = _cargar_datos()
        if "historial" not in datos:
            datos["historial"] = {}
        if username not in datos["historial"]:
            datos["historial"][username] = []

        conv_id = f"conv-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        datos["historial"][username].append({
            "id": conv_id,
            "titulo": titulo,
            "mensajes": [],
            "creado_en": datetime.now().isoformat(),
            "actualizado_en": datetime.now().isoformat(),
        })
        _guardar_datos(datos)
        return conv_id

    def agregar_mensaje(self, username: str, conv_id: str, rol: str, texto: str,
                        metadatos: dict = None) -> bool:
        """Agrega un mensaje a una conversación existente."""
        datos = _cargar_datos()
        conversaciones = datos.get("historial", {}).get(username, [])
        for conv in conversaciones:
            if conv["id"] == conv_id:
                conv["mensajes"].append({
                    "rol":       rol,   # "usuario" o "agente"
                    "texto":     texto,
                    "timestamp": datetime.now().isoformat(),
                    "metadatos": metadatos or {},
                })
                conv["actualizado_en"] = datetime.now().isoformat()
                # Actualizar título dinámicamente con cada mensaje del usuario
                if rol == "usuario":
                    conv["titulo"] = texto[:50] + ("..." if len(texto) > 50 else "")
                _guardar_datos(datos)
                return True
        return False

    def obtener_conversaciones(self, username: str) -> List[dict]:
        """Lista las conversaciones del usuario, ordenadas por fecha (más reciente primero)."""
        datos = _cargar_datos()
        convs = datos.get("historial", {}).get(username, [])
        return sorted(convs, key=lambda c: c.get("actualizado_en", ""), reverse=True)

    def obtener_conversacion(self, username: str, conv_id: str) -> Optional[dict]:
        """Retorna una conversación completa con sus mensajes."""
        datos = _cargar_datos()
        for conv in datos.get("historial", {}).get(username, []):
            if conv["id"] == conv_id:
                return conv
        return None

    def eliminar_conversacion(self, username: str, conv_id: str) -> bool:
        datos = _cargar_datos()
        convs = datos.get("historial", {}).get(username, [])
        nueva_lista = [c for c in convs if c["id"] != conv_id]
        if len(nueva_lista) == len(convs):
            return False
        datos["historial"][username] = nueva_lista
        _guardar_datos(datos)
        return True

    def estadisticas_admin(self) -> dict:
        """Estadísticas generales para el panel de administración."""
        datos = _cargar_datos()
        usuarios = datos["usuarios"]
        historial = datos.get("historial", {})

        total_mensajes = sum(
            len(conv["mensajes"])
            for convs in historial.values()
            for conv in convs
        )
        total_conversaciones = sum(len(convs) for convs in historial.values())

        return {
            "total_usuarios": len(usuarios),
            "usuarios_activos": sum(1 for u in usuarios.values() if u.get("activo")),
            "total_conversaciones": total_conversaciones,
            "total_mensajes": total_mensajes,
            "por_usuario": [
                {
                    "username": uname,
                    "nombre": u.get("nombre", ""),
                    "rol": u.get("rol", "usuario"),
                    "conversaciones": len(historial.get(uname, [])),
                    "mensajes": sum(len(c["mensajes"]) for c in historial.get(uname, [])),
                    "activo": u.get("activo", True),
                }
                for uname, u in usuarios.items()
            ],
        }
