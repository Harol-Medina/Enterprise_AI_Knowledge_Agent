"""
Servicio RAG con Tavily complementario.
Pipeline:
  1. Búsqueda semántica en ChromaDB (documentos internos — fuente principal)
  2. Si Tavily está habilitado y la consulta es relevante, complementa con web
  3. Generación de respuesta con Cohere usando todo el contexto
  4. Control temático: bloquea consultas totalmente fuera de ámbito
"""
import logging
from typing import List, Optional

from app.domain.entities import FragmentoDocumento, ResultadoConsulta
from app.domain.ports import ClienteLLMPort, RepositorioFragmentosPort
from app.services.servicio_tavily import ServicioTavily

logger = logging.getLogger(__name__)

UMBRAL_SIMILITUD = 0.25

# Palabras que indican consulta totalmente fuera del ámbito empresarial/técnico
_PALABRAS_FUERA_AMBITO = [
    "pokemon", "naruto", "dragon ball", "fútbol", "gol", "partido de",
    "quien ganará", "quién ganará", "canción de", "letra de", "horóscopo",
    "receta de", "cocinar", "moda", "ropa", "farándula", "novela",
    "actor", "actriz", "cantante",
]

PROMPT_SISTEMA = """Eres el asistente de conocimiento interno de Santos Pegasus Soluciones,
empresa especializada en microservicios e Inteligencia Artificial.

Tu función es responder preguntas de los colaboradores basándote principalmente en
los fragmentos de documentos internos, y cuando esté disponible, complementar con
fuentes web técnicas confiables.

Reglas:
1. Los DOCUMENTOS INTERNOS son tu fuente principal y más confiable.
2. Las FUENTES WEB solo complementan y amplían — nunca contradicen los documentos.
3. Si la información no está en ninguna fuente, di claramente:
   "No encontré esta información en los documentos disponibles de Santos Pegasus Soluciones."
4. Cita siempre qué documento o fuente usaste.
5. Responde en español, de forma clara y con ejemplos cuando sea útil.
6. No inventes datos, fechas ni procedimientos.
7. Si la pregunta está completamente fuera del ámbito empresarial o técnico, indícalo amablemente.
"""

def _es_consulta_saludo(consulta: str) -> bool:
    texto = consulta.lower()
    saludos = ["hola", "buenos días", "buenas tardes", "buenas noches", "gracias", "ayuda", "necesito ayuda"]
    return any(s in texto for s in saludos)

class ServicioRag:
    def __init__(
        self,
        repositorio_fragmentos: RepositorioFragmentosPort,
        cliente_llm: ClienteLLMPort,
        top_k: int = 5,
        servicio_tavily: Optional[ServicioTavily] = None,
    ):
        self.repositorio_fragmentos = repositorio_fragmentos
        self.cliente_llm = cliente_llm
        self.top_k = top_k
        self.tavily = servicio_tavily or ServicioTavily()

    def recuperar(self, consulta: str) -> List[FragmentoDocumento]:
        candidatos = self.repositorio_fragmentos.buscar(consulta, top_k=self.top_k)
        relevantes = [
            f for f in candidatos
            if f.metadatos.get("similitud", 1.0) >= UMBRAL_SIMILITUD
        ]
        logger.info("Recuperacion: %d candidatos -> %d relevantes", len(candidatos), len(relevantes))
        return relevantes

    def generar(
        self,
        consulta: str,
        fragmentos: List[FragmentoDocumento],
        historial: Optional[List[dict]] = None,
        perfil: Optional[str] = None,
    ) -> ResultadoConsulta:

        # Control de ámbito: bloquear consultas irrelevantes
        consulta_lower = consulta.lower()
        for palabra in _PALABRAS_FUERA_AMBITO:
            if palabra in consulta_lower:
                # Preparar mensaje amistoso y, si hay LLM configurado, generar
                # una respuesta general que complemente la advertencia.
                prefacio = (
                    "Esa consulta está fuera de mi ámbito. Soy el asistente de conocimiento "
                    "interno de Santos Pegasus Soluciones y normalmente respondo sobre "
                    "tecnología, ingeniería de software, microservicios, onboarding, "
                    "protocolos internos y arquitectura. Si necesitas ayuda con documentos internos, "
                    "puedo orientarte sobre esos temas."
                )
                respuesta_completa = prefacio
                if self.cliente_llm.esta_configurado():
                    try:
                        prompt_general = (
                            "Actúa como un asistente general y responde brevemente a la siguiente pregunta: \n"
                            f"{consulta}\n\nRespuesta:"
                        )
                        general = self.cliente_llm.generar_respuesta(prompt_general)
                        if general:
                            respuesta_completa = f"{prefacio}\n\nRespuesta general:\n{general}"
                    except Exception:
                        # Si falla el LLM, devolvemos solo el prefacio amistoso
                        respuesta_completa = prefacio

                return ResultadoConsulta(
                    respuesta=respuesta_completa,
                    fuente_principal="Fuera de ámbito",
                    confianza=0.0,
                    citas=[],
                    sin_respuesta=False,
                )

        if not self.cliente_llm.esta_configurado():
            return ResultadoConsulta(
                respuesta="El agente no tiene COHERE_API_KEY configurada. Configúrala en el .env.",
                fuente_principal="Sin fuente",
                confianza=0.0,
                citas=[],
                sin_respuesta=True,
            )

        confianza_docs = 0.0
        if fragmentos:
            sims = [f.metadatos.get("similitud", 0.5) for f in fragmentos]
            confianza_docs = round(sum(sims) / len(sims), 3)

        # Intentar complementar con Tavily si la confianza documental es suficiente
        contexto_web = self.tavily.buscar(consulta, confianza_documentos=confianza_docs)

        if not fragmentos and not contexto_web:
            if _es_consulta_saludo(consulta):
                return ResultadoConsulta(
                    respuesta=(
                        "Hola, soy el asistente de conocimiento interno de Santos Pegasus Soluciones. "
                        "Puedo ayudarte con preguntas sobre onboarding, arquitectura, procesos internos y buenas prácticas."
                    ),
                    fuente_principal="Respuesta guiada",
                    confianza=0.1,
                    citas=[],
                    sin_respuesta=False,
                )
            return ResultadoConsulta(
                respuesta=(
                    "No encontré información suficiente en los documentos disponibles "
                    "de Santos Pegasus Soluciones para responder esta pregunta. "
                    "Verifica que los documentos estén indexados o contacta al área responsable."
                ),
                fuente_principal="Sin fuente",
                confianza=0.0,
                citas=[],
                sin_respuesta=True,
            )

        contexto = self._construir_contexto(fragmentos, contexto_web)
        prompt   = self._construir_prompt(consulta, contexto, historial, perfil=perfil)

        try:
            respuesta = self.cliente_llm.generar_respuesta(prompt)
        except Exception as exc:
            logger.error("Error LLM: %s", exc)
            respuesta_fallback = (
                f"No pude completar la respuesta con el modelo en este momento. "
                f"Para '{consulta}', revisa los documentos internos de Santos Pegasus Soluciones "
                f"y, si es necesario, amplía la consulta con más contexto."
            )
            return ResultadoConsulta(
                respuesta=respuesta_fallback,
                fuente_principal="Fallback",
                confianza=0.0,
                citas=fuentes if 'fuentes' in locals() else [],
                sin_respuesta=False,
            )

        fuentes = list(dict.fromkeys(f.fuente for f in fragmentos))
        if contexto_web:
            fuentes.append("Fuentes web (Tavily)")

        return ResultadoConsulta(
            respuesta=respuesta,
            fuente_principal=fuentes[0] if fuentes else "Sin fuente",
            confianza=confianza_docs,
            citas=fuentes,
            sin_respuesta=False,
        )

    def _construir_contexto(self, fragmentos: List[FragmentoDocumento], contexto_web: Optional[str]) -> str:
        partes = []
        if fragmentos:
            partes.append("=== DOCUMENTOS INTERNOS (fuente principal) ===")
            for i, f in enumerate(fragmentos, 1):
                sim = f.metadatos.get("similitud", "—")
                partes.append(f"[{i}] Documento: {f.fuente} | Relevancia: {sim}\n{f.texto}")
        if contexto_web:
            partes.append("\n=== FUENTES WEB CONFIABLES (complementario) ===")
            partes.append(contexto_web)
        return "\n\n".join(partes)

    def _construir_prompt(
        self,
        consulta: str,
        contexto: str,
        historial: Optional[List[dict]],
        perfil: Optional[str] = None,
    ) -> str:
        hist_texto = ""
        if historial:
            ultimos = historial[-4:]  # últimos 4 mensajes para contexto de conversación
            hist_texto = "\nHISTORIAL DE LA CONVERSACIÓN:\n"
            for m in ultimos:
                rol = "Usuario" if m["rol"] == "usuario" else "Asistente"
                hist_texto += f"{rol}: {m['texto'][:200]}\n"
            hist_texto += "\n"

        perfil_texto = f"\nPERFIL DEL USUARIO: {perfil}\n" if perfil else ""

        return (
            f"{PROMPT_SISTEMA}\n\n"
            f"{hist_texto}"
            f"{perfil_texto}"
            f"CONTEXTO:\n{contexto}\n\n"
            f"PREGUNTA ACTUAL:\n{consulta}\n\n"
            f"RESPUESTA:"
        )
