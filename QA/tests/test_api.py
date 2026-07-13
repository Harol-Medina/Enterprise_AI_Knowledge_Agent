"""
Pruebas de integración y unitarias — Santos Pegasus Soluciones.
Usan dobles de prueba (mocks) para aislar la capa HTTP de Cohere y ChromaDB,
sin necesidad de claves de API reales ni conexiones externas.
"""
import sys
from pathlib import Path
from typing import List
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "BackEnd"))

from app.domain.entities import EstadoApiKey, FragmentoDocumento, ResultadoConsulta
from app.domain.ports import ClienteLLMPort, RepositorioDocumentosPort, RepositorioFragmentosPort
from app.main import app


# ==============================================================================
# Dobles de prueba
# ==============================================================================

class ClienteIAFalso(ClienteLLMPort):
    """
    Simula ClienteIA (Cohere) sin llamadas reales a la API.
    Cohere embed-multilingual-v3.0 produce vectores de 1024 dimensiones.
    """

    def __init__(self, configurado: bool = True):
        self._configurado     = configurado
        self.modelo_chat      = "command-a-03-2025-test"
        self.modelo_embedding = "embed-multilingual-v3.0-test"

    def esta_configurado(self) -> bool:
        return self._configurado

    def generar_respuesta(self, prompt: str) -> str:
        return "Respuesta de prueba generada por el doble de Cohere."

    def generar_embedding(self, texto: str) -> List[float]:
        # Cohere embed-multilingual-v3.0 → 1024 dimensiones
        return [0.05] * 1024

    def generar_embedding_consulta(self, texto: str) -> List[float]:
        return [0.05] * 1024

    def generar_embeddings_lote(self, textos: List[str], input_type: str = "search_document") -> List[List[float]]:
        return [[0.05] * 1024 for _ in textos]

    def validar_api_key(self) -> bool:
        return self._configurado


class RepositorioDocumentosFalso(RepositorioDocumentosPort):
    """Los 5 documentos reales de Santos Pegasus Soluciones."""

    def listar_documentos(self) -> List[str]:
        return [
            "Manual de Onboarding para Nuevos Desarrolladores.pdf",
            "Santo Pegasus Soluciones Guía Oficial de Ingeniería Backend.pdf",
            "Santo Pegasus Soluciones Guía Oficial de Ingeniería FrontEnd.pdf",
            "PROTOCOLO DE RESPUESTA A INCIDENTES Y POST-MORTEMS.pdf",
            "Arquitectura de Microservicios y Mapa de Dominios.pdf",
        ]

    def cargar_documento(self, nombre: str) -> str:
        return f"Contenido de prueba del documento interno de Santos Pegasus: {nombre}"


class RepositorioFragmentosFalso(RepositorioFragmentosPort):
    def __init__(self, fragmentos: List[FragmentoDocumento] = None):
        self._fragmentos = fragmentos or [
            FragmentoDocumento(
                id="Manual de Onboarding::chunk-0000",
                texto="El proceso de onboarding en Santos Pegasus dura 30 días e incluye capacitación técnica.",
                fuente="Manual de Onboarding para Nuevos Desarrolladores.pdf",
                metadatos={"similitud": 0.88},
            ),
            FragmentoDocumento(
                id="Guia Backend::chunk-0000",
                texto="La arquitectura backend usa FastAPI con patrón hexagonal y microservicios.",
                fuente="Santo Pegasus Soluciones Guía Oficial de Ingeniería Backend.pdf",
                metadatos={"similitud": 0.76},
            ),
        ]

    def guardar_fragmentos(self, fragmentos: List[FragmentoDocumento]) -> None:
        self._fragmentos.extend(fragmentos)

    def buscar(self, consulta: str, top_k: int = 5) -> List[FragmentoDocumento]:
        return self._fragmentos[:top_k]

    def contar_fragmentos(self) -> int:
        return len(self._fragmentos)

    def limpiar_coleccion(self) -> None:
        self._fragmentos.clear()


# ==============================================================================
# Fixtures
# ==============================================================================

def _crear_orquestador_falso(configurado: bool = True, fragmentos: list = None):
    """Crea un orquestador completamente falso con todos los repositorios mockeados."""
    from app.orchestrator import Orquestador
    from app.services.servicio_agente import ServicioAgente
    from app.infrastructure.repositorio_usuarios import RepositorioUsuarios

    orq = MagicMock(spec=Orquestador)
    orq.servicio = ServicioAgente(
        repositorio_documentos=RepositorioDocumentosFalso(),
        repositorio_fragmentos=RepositorioFragmentosFalso(fragmentos=fragmentos),
        cliente_llm=ClienteIAFalso(configurado=configurado),
    )
    # repo_usuarios real para que los endpoints de auth/historial funcionen
    orq.repo_usuarios = RepositorioUsuarios()
    return orq


@pytest.fixture
def cliente():
    from app.api import obtener_orquestador
    orq = _crear_orquestador_falso(configurado=True)
    app.dependency_overrides[obtener_orquestador] = lambda: orq
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def cliente_sin_api_key():
    from app.api import obtener_orquestador
    orq = _crear_orquestador_falso(configurado=False)
    app.dependency_overrides[obtener_orquestador] = lambda: orq
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def cliente_indice_vacio():
    from app.api import obtener_orquestador
    from app.orchestrator import Orquestador
    from app.infrastructure.repositorio_usuarios import RepositorioUsuarios

    orq = MagicMock(spec=Orquestador)
    servicio = MagicMock()
    servicio.cliente_llm = ClienteIAFalso(configurado=True)
    servicio.estado_indice.return_value = {
        "fragmentos_indexados": 0,
        "documentos_disponibles": 0,
        "nombres_documentos": [],
        "llm_configurado": True,
        "busqueda_web_habilitada": False,
    }
    servicio.responder_consulta.return_value = ResultadoConsulta(
        respuesta="No encontré información suficiente en los documentos disponibles.",
        fuente_principal="Sin fuente",
        confianza=0.0,
        citas=[],
        sin_respuesta=True,
    )
    servicio.ingestar_documentos.return_value = 0
    orq.servicio = servicio
    orq.repo_usuarios = RepositorioUsuarios()
    app.dependency_overrides[obtener_orquestador] = lambda: orq
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ==============================================================================
# Tests: salud del sistema
# ==============================================================================

class TestSalud:
    def test_responde_200(self, cliente):
        assert cliente.get("/api/salud").status_code == 200

    def test_estado_ok(self, cliente):
        assert cliente.get("/api/salud").json()["estado"] == "ok"

    def test_version_presente(self, cliente):
        assert cliente.get("/api/salud").json()["version"] == "1.0.0"

    def test_mensaje_menciona_santos_pegasus(self, cliente):
        assert "Santos Pegasus" in cliente.get("/api/salud").json()["mensaje"]


# ==============================================================================
# Tests: validación de API (Cohere)
# ==============================================================================

class TestValidarApi:
    def test_clave_valida_retorna_true(self, cliente):
        datos = cliente.get("/api/validar-api").json()
        assert datos["api_key_valida"] is True

    def test_clave_invalida_retorna_false(self, cliente_sin_api_key):
        datos = cliente_sin_api_key.get("/api/validar-api").json()
        assert datos["api_key_valida"] is False

    def test_proveedor_es_cohere(self, cliente):
        datos = cliente.get("/api/validar-api").json()
        assert datos["proveedor"] == "Cohere"

    def test_incluye_modelos(self, cliente):
        datos = cliente.get("/api/validar-api").json()
        assert "modelo_chat" in datos
        assert "modelo_embedding" in datos

    def test_mensaje_informativo_presente(self, cliente_sin_api_key):
        datos = cliente_sin_api_key.get("/api/validar-api").json()
        assert len(datos["mensaje"]) > 0


# ==============================================================================
# Tests: estado del índice
# ==============================================================================

class TestEstadoIndice:
    def test_responde_200(self, cliente):
        assert cliente.get("/api/estado-indice").status_code == 200

    def test_tiene_fragmentos_esperados(self, cliente):
        datos = cliente.get("/api/estado-indice").json()
        assert datos["fragmentos_indexados"] == 2

    def test_cuenta_los_5_documentos(self, cliente):
        datos = cliente.get("/api/estado-indice").json()
        assert datos["documentos_disponibles"] == 5

    def test_nombres_documentos_es_lista(self, cliente):
        datos = cliente.get("/api/estado-indice").json()
        assert isinstance(datos["nombres_documentos"], list)

    def test_indice_vacio_reporta_cero(self, cliente_indice_vacio):
        datos = cliente_indice_vacio.get("/api/estado-indice").json()
        assert datos["fragmentos_indexados"] == 0


# ==============================================================================
# Tests: visibilidad de documentos por rol
# ==============================================================================

class TestDocumentosPorRol:
    def test_admin_ve_todos_los_documentos(self, cliente):
        docs = cliente.get("/api/documentos/listar/admin").json()["documentos"]
        assert len(docs) == 5

    def test_fullstack_ve_todos_los_documentos(self, cliente):
        docs = cliente.get("/api/documentos/listar/fullstack").json()["documentos"]
        assert len(docs) == 5

    def test_frontend_ve_guia_frontend_y_generales(self, cliente):
        docs = cliente.get("/api/documentos/listar/frontend").json()["documentos"]
        assert any("FrontEnd" in d for d in docs)
        assert any("Onboarding" in d for d in docs)
        assert any("Arquitectura" in d or "Microservicios" in d for d in docs)

    def test_backend_ve_guia_backend_y_generales(self, cliente):
        docs = cliente.get("/api/documentos/listar/backend").json()["documentos"]
        assert any("Backend" in d for d in docs)
        assert any("Onboarding" in d for d in docs)

    def test_frontend_no_ve_guia_backend(self, cliente):
        docs = cliente.get("/api/documentos/listar/frontend").json()["documentos"]
        assert not any("Backend" in d and "FrontEnd" not in d for d in docs)

    def test_backend_no_ve_guia_frontend(self, cliente):
        docs = cliente.get("/api/documentos/listar/backend").json()["documentos"]
        assert not any("FrontEnd" in d for d in docs)


# ==============================================================================
# Tests: consulta al agente RAG
# ==============================================================================

class TestConsultarAgente:
    def test_responde_200(self, cliente):
        r = cliente.post("/api/agente/consultar",
                         json={"pregunta": "¿Cuánto dura el onboarding?"})
        assert r.status_code == 200

    def test_respuesta_no_vacia(self, cliente):
        datos = cliente.post("/api/agente/consultar",
                             json={"pregunta": "¿Cuánto dura el onboarding?"}).json()
        assert len(datos["respuesta"]) > 0

    def test_fuente_principal_presente(self, cliente):
        datos = cliente.post("/api/agente/consultar",
                             json={"pregunta": "arquitectura backend"}).json()
        assert "fuente_principal" in datos

    def test_confianza_dentro_del_rango(self, cliente):
        datos = cliente.post("/api/agente/consultar",
                             json={"pregunta": "¿Qué es el onboarding?"}).json()
        assert 0.0 <= datos["confianza"] <= 1.0

    def test_citas_es_lista(self, cliente):
        datos = cliente.post("/api/agente/consultar",
                             json={"pregunta": "protocolos de incidentes"}).json()
        assert isinstance(datos["citas"], list)

    def test_sin_fragmentos_retorna_sin_respuesta(self, cliente_indice_vacio):
        datos = cliente_indice_vacio.post("/api/agente/consultar",
                                          json={"pregunta": "¿Cuáles son las políticas?"}).json()
        assert datos["sin_respuesta"] is True

    def test_sin_api_key_retorna_sin_respuesta(self, cliente_sin_api_key):
        datos = cliente_sin_api_key.post("/api/agente/consultar",
                                          json={"pregunta": "onboarding"}).json()
        assert datos["sin_respuesta"] is True

    def test_pregunta_demasiado_corta_retorna_422(self, cliente):
        assert cliente.post("/api/agente/consultar",
                            json={"pregunta": "ab"}).status_code == 422

    def test_pregunta_vacia_retorna_422(self, cliente):
        assert cliente.post("/api/agente/consultar",
                            json={"pregunta": ""}).status_code == 422

    def test_consulta_con_historial_persiste_mensajes(self):
        """Verifica que los mensajes se guardan en la conversación correcta del usuario."""
        from app.api import obtener_orquestador
        from app.infrastructure.repositorio_usuarios import RepositorioUsuarios

        orq = _crear_orquestador_falso(configurado=True)
        repo = RepositorioUsuarios()
        orq.repo_usuarios = repo
        app.dependency_overrides[obtener_orquestador] = lambda: orq

        with TestClient(app) as c:
            # Crear conversación
            conv = c.post("/api/chat/conversacion",
                          json={"username": "carlos.dev", "titulo": "Test persistencia"})
            assert conv.status_code == 200
            conv_id = conv.json()["id_conversacion"]

            # Enviar pregunta con la conversación activa
            c.post("/api/agente/consultar", json={
                "pregunta": "¿Cuánto dura el onboarding?",
                "id_conversacion": conv_id,
                "username": "carlos.dev",
            })

            # Verificar que se guardó con el usuario correcto
            guardada = repo.obtener_conversacion("carlos.dev", conv_id)
            assert guardada is not None
            assert any(m["rol"] == "usuario" and "onboarding" in m["texto"].lower()
                       for m in guardada["mensajes"])
            # No debe estar en otro usuario
            assert repo.obtener_conversacion("__anon__", conv_id) is None

        app.dependency_overrides.clear()


# ==============================================================================
# Tests: autenticación
# ==============================================================================

class TestAuth:
    def test_login_admin_exitoso(self, cliente):
        r = cliente.post("/api/auth/login",
                         json={"username": "admin", "contrasena": "Admin2024!"})
        assert r.status_code == 200
        datos = r.json()
        assert datos["ok"] is True
        assert datos["rol"] == "admin"

    def test_login_usuario_normal_exitoso(self, cliente):
        r = cliente.post("/api/auth/login",
                         json={"username": "backend", "contrasena": "Backend2024!"})
        datos = r.json()
        assert datos["ok"] is True
        assert datos["rol"] == "backend"

    def test_login_credenciales_incorrectas(self, cliente):
        r = cliente.post("/api/auth/login",
                         json={"username": "admin", "contrasena": "clave-incorrecta"})
        datos = r.json()
        assert datos["ok"] is False

    def test_login_usuario_inexistente(self, cliente):
        r = cliente.post("/api/auth/login",
                         json={"username": "noexiste", "contrasena": "cualquier"})
        datos = r.json()
        assert datos["ok"] is False

    def test_login_retorna_nombre_y_rol(self, cliente):
        r = cliente.post("/api/auth/login",
                         json={"username": "frontend", "contrasena": "Frontend2024!"})
        datos = r.json()
        assert datos["ok"] is True
        assert len(datos["nombre"]) > 0
        assert datos["rol"] == "frontend"


# ==============================================================================
# Tests: historial de chat
# ==============================================================================

class TestHistorialChat:
    def test_crear_conversacion_retorna_id(self, cliente):
        r = cliente.post("/api/chat/conversacion",
                         json={"username": "carlos.dev", "titulo": "Test"})
        assert r.status_code == 200
        assert "id_conversacion" in r.json()

    def test_historial_retorna_lista(self, cliente):
        r = cliente.get("/api/chat/historial/carlos.dev")
        assert r.status_code == 200
        assert "conversaciones" in r.json()
        assert isinstance(r.json()["conversaciones"], list)

    def test_obtener_conversacion_creada(self, cliente):
        conv_id = cliente.post("/api/chat/conversacion",
                               json={"username": "maria.dev", "titulo": "Mi consulta"}).json()["id_conversacion"]
        r = cliente.get(f"/api/chat/conversacion/maria.dev/{conv_id}")
        assert r.status_code == 200
        assert r.json()["id"] == conv_id

    def test_eliminar_conversacion(self, cliente):
        conv_id = cliente.post("/api/chat/conversacion",
                               json={"username": "carlos.dev", "titulo": "Para borrar"}).json()["id_conversacion"]
        r = cliente.delete(f"/api/chat/conversacion/carlos.dev/{conv_id}")
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_obtener_conversacion_inexistente_retorna_404(self, cliente):
        r = cliente.get("/api/chat/conversacion/carlos.dev/conv-inexistente-000")
        assert r.status_code == 404


# ==============================================================================
# Tests: indexación
# ==============================================================================

class TestIndexar:
    def test_sin_api_key_retorna_503(self, cliente_sin_api_key):
        r = cliente_sin_api_key.post("/api/indexar", json={"forzar_reindexacion": False})
        assert r.status_code == 503

    def test_con_api_key_retorna_200(self, cliente):
        r = cliente.post("/api/indexar", json={"forzar_reindexacion": False})
        assert r.status_code == 200

    def test_respuesta_tiene_campos_correctos(self, cliente):
        datos = cliente.post("/api/indexar", json={"forzar_reindexacion": False}).json()
        assert "fragmentos_indexados" in datos
        assert "mensaje" in datos
        assert isinstance(datos["fragmentos_indexados"], int)


# ==============================================================================
# Tests unitarios: dominio
# ==============================================================================

class TestDominio:
    def test_fragmento_valido(self):
        f = FragmentoDocumento(
            id="doc::chunk-0",
            texto="Contenido suficientemente largo para ser válido en el sistema.",
            fuente="doc.pdf",
            metadatos={},
        )
        assert f.es_valido() is True

    def test_fragmento_invalido_texto_corto(self):
        f = FragmentoDocumento(id="x", texto="Corto", fuente="doc.pdf", metadatos={})
        assert f.es_valido() is False

    def test_fragmento_invalido_texto_vacio(self):
        f = FragmentoDocumento(id="x", texto="", fuente="doc.pdf", metadatos={})
        assert f.es_valido() is False

    def test_confianza_clampea_por_arriba(self):
        r = ResultadoConsulta(respuesta="R", fuente_principal="f.pdf", confianza=2.5)
        assert r.confianza == 1.0

    def test_confianza_clampea_por_abajo(self):
        r = ResultadoConsulta(respuesta="R", fuente_principal="f.pdf", confianza=-1.0)
        assert r.confianza == 0.0

    def test_estado_api_key_valida(self):
        e = EstadoApiKey(valida=True, proveedor="Cohere", mensaje="OK")
        assert e.valida is True
        assert e.proveedor == "Cohere"

    def test_resultado_sin_respuesta_por_defecto_false(self):
        r = ResultadoConsulta(respuesta="texto", fuente_principal="doc.pdf", confianza=0.5)
        assert r.sin_respuesta is False


# ==============================================================================
# Tests unitarios: servicio RAG
# ==============================================================================

class TestServicioRag:
    def test_sin_fragmentos_retorna_sin_respuesta(self):
        from app.services.servicio_rag import ServicioRag
        rag = ServicioRag(RepositorioFragmentosFalso(fragmentos=[]), ClienteIAFalso())
        resultado = rag.generar("¿Política de vacaciones?", fragmentos=[])
        assert resultado.sin_respuesta is True
        assert resultado.confianza == 0.0

    def test_saludo_hola_responde_de_forma_amigable(self):
        from app.services.servicio_rag import ServicioRag
        rag = ServicioRag(RepositorioFragmentosFalso(fragmentos=[]), ClienteIAFalso())
        resultado = rag.generar("hola", fragmentos=[])
        assert resultado.sin_respuesta is False

    def test_fuera_de_ambito_responde_con_redireccion(self):
        from app.services.servicio_rag import ServicioRag
        rag = ServicioRag(RepositorioFragmentosFalso(fragmentos=[]), ClienteIAFalso())
        resultado = rag.generar("dime qué pokemon es el número 1", fragmentos=[])
        assert resultado.sin_respuesta is False
        assert "ámbito" in resultado.respuesta.lower() or "santos pegasus" in resultado.respuesta.lower()

    def test_sin_api_key_retorna_sin_respuesta(self):
        from app.services.servicio_rag import ServicioRag
        rag = ServicioRag(RepositorioFragmentosFalso(), ClienteIAFalso(configurado=False))
        resultado = rag.generar("onboarding", fragmentos=RepositorioFragmentosFalso()._fragmentos)
        assert resultado.sin_respuesta is True

    def test_con_todo_ok_genera_respuesta(self):
        from app.services.servicio_rag import ServicioRag
        rag = ServicioRag(RepositorioFragmentosFalso(), ClienteIAFalso(configurado=True))
        resultado = rag.generar("onboarding", fragmentos=RepositorioFragmentosFalso()._fragmentos)
        assert resultado.sin_respuesta is False
        assert len(resultado.respuesta) > 0
        assert resultado.confianza > 0.0

    def test_prompt_incluye_historial_y_perfil(self):
        from app.services.servicio_rag import ServicioRag

        prompts_capturados = []

        class ClienteCaptura(ClienteIAFalso):
            def generar_respuesta(self, prompt: str) -> str:
                prompts_capturados.append(prompt)
                return "respuesta"

        rag = ServicioRag(RepositorioFragmentosFalso(), ClienteCaptura())
        rag.generar(
            "¿Cuál es el proceso de onboarding?",
            fragmentos=RepositorioFragmentosFalso()._fragmentos,
            historial=[{"rol": "usuario", "texto": "Soy Carlos"}],
            perfil="Carlos",
        )
        assert len(prompts_capturados) == 1
        assert "Carlos" in prompts_capturados[0]
        assert "HISTORIAL" in prompts_capturados[0]

    def test_error_llm_devuelve_fallback_no_vacio(self):
        from app.services.servicio_rag import ServicioRag

        class ClienteConFallo(ClienteIAFalso):
            def generar_respuesta(self, prompt: str) -> str:
                raise RuntimeError("Error simulado 429")

        rag = ServicioRag(RepositorioFragmentosFalso(), ClienteConFallo())
        resultado = rag.generar(
            "¿Cuánto dura el onboarding?",
            fragmentos=RepositorioFragmentosFalso()._fragmentos,
        )
        assert resultado.sin_respuesta is False
        assert len(resultado.respuesta) > 0

    def test_recuperar_retorna_lista(self):
        from app.services.servicio_rag import ServicioRag
        rag = ServicioRag(RepositorioFragmentosFalso(), ClienteIAFalso())
        assert isinstance(rag.recuperar("onboarding"), list)


# ==============================================================================
# Tests unitarios: procesamiento de documentos
# ==============================================================================

class TestServicioProcesamiento:
    def test_procesar_documento_genera_fragmentos(self):
        from app.services.procesamiento_documentos import ServicioProcesamiento
        servicio = ServicioProcesamiento(
            RepositorioDocumentosFalso(), tamano_chunk=50, solapamiento_chunk=10
        )
        fragmentos = servicio.procesar_documento(
            "Manual de Onboarding para Nuevos Desarrolladores.pdf"
        )
        assert isinstance(fragmentos, list)
        assert len(fragmentos) >= 1

    def test_documento_inexistente_retorna_lista_vacia(self):
        from app.services.procesamiento_documentos import ServicioProcesamiento

        class RepoConError(RepositorioDocumentosPort):
            def listar_documentos(self): return []
            def cargar_documento(self, nombre): raise FileNotFoundError("no existe")

        servicio = ServicioProcesamiento(RepoConError())
        assert servicio.procesar_documento("inexistente.pdf") == []

    def test_todos_los_fragmentos_tienen_ids_unicos(self):
        from app.services.procesamiento_documentos import ServicioProcesamiento
        servicio = ServicioProcesamiento(RepositorioDocumentosFalso())
        fragmentos = servicio.procesar_todos()
        ids = [f.id for f in fragmentos]
        assert len(ids) == len(set(ids)), "Todos los IDs de fragmentos deben ser únicos"


# ==============================================================================
# Tests: orquestador
# ==============================================================================

class TestOrquestador:
    def test_resolver_directorio_documentos_existe(self):
        from app.orchestrator import _resolver_directorio_documentos
        ruta = _resolver_directorio_documentos()
        assert ruta.exists(), f"El directorio de documentos debe existir: {ruta}"

    def test_resolver_directorio_documentos_contiene_pdfs(self):
        from app.orchestrator import _resolver_directorio_documentos
        ruta = _resolver_directorio_documentos()
        pdfs = list(ruta.glob("*.pdf"))
        assert len(pdfs) > 0, f"Deben existir PDFs en {ruta}"
