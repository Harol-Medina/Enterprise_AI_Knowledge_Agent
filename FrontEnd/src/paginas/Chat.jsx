import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Send, Loader2, FileText, AlertCircle, Sparkles, Globe } from 'lucide-react'
import { api } from '../servicios/api'
import { useAuth } from '../contextos/AuthContexto'

function BadgeConfianza({ confianza }) {
  if (!confianza || confianza <= 0) return null
  const pct   = Math.round(confianza * 100)
  const clase = confianza >= 0.7 ? 'badge-alta' : confianza >= 0.4 ? 'badge-media' : 'badge-baja'
  return <span className={`inline-flex items-center ${clase}`}>{pct}% relevancia</span>
}

function Citas({ citas }) {
  if (!citas?.length) return null
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {citas.map(c => (
        <span key={c} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px]"
              style={{ background: '#0f1320', border: '1px solid #1a2236', color: '#8899b4' }}>
          {c.includes('web') || c.includes('Tavily')
            ? <Globe size={10} style={{ color: '#818cf8' }} />
            : <FileText size={10} style={{ color: '#f97316' }} />}
          {c}
        </span>
      ))}
    </div>
  )
}

function BurbujaCargando() {
  return (
    <div className="flex items-start gap-3 animar-entrada">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden">
        <img src="/assets/Logo_Menu.png" alt="Pegasus" width="28" height="28" className="shrink-0" />
      </div>
      <div className="burbuja-agente">
        <div className="flex items-center gap-1.5 px-1">
          {[0, 180, 360].map(d => (
            <span key={d} className="pulso h-1.5 w-1.5 rounded-full"
              style={{ background: '#f97316', animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function limpiarMarkdown(texto) {
  // Remove markdown bold: **text** → text
  return texto.replace(/\*\*(.*?)\*\*/g, '$1')
}

function BurbujaAgente({ msg }) {
  const textoLimpio = limpiarMarkdown(msg.texto)
  return (
    <div className="flex items-start gap-3 animar-entrada">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden">
        <img src="/assets/Logo_Menu.png" alt="Pegasus" width="28" height="28" className="shrink-0" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="burbuja-agente" style={msg.sinRespuesta ? { borderColor: 'rgba(245,158,11,0.35)' } : {}}>
          {msg.sinRespuesta && (
            <div className="flex items-center gap-1.5 text-[11px] mb-2" style={{ color: '#fbbf24' }}>
              <AlertCircle size={12} />
              <span>Sin información suficiente</span>
            </div>
          )}
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{textoLimpio}</p>
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap pl-1">
          <BadgeConfianza confianza={msg.confianza} />
          <Citas citas={msg.citas} />
        </div>
      </div>
    </div>
  )
}

function BurbujaUsuario({ texto, iniciales }) {
  return (
    <div className="flex items-end justify-end gap-2.5 animar-entrada">
      <div className="burbuja-usuario max-w-[72%]">{texto}</div>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
           style={{ background: '#f97316' }}>
        {iniciales}
      </div>
    </div>
  )
}

const SUGERENCIAS = [
  '¿Cuál es el proceso de onboarding para nuevos desarrolladores?',
  '¿Cómo se gestiona un incidente de producción crítico?',
  '¿Cuáles son los estándares de ingeniería back-end de Santos Pegasus?',
  '¿Qué microservicios componen la arquitectura de la empresa?',
]

export default function Chat() {
  const { usuario, nombre } = useAuth()
  const contexto = useOutletContext() || {}
  const { convActiva, setConvActiva, onActualizarHistorial } = contexto

  const [mensajes, setMensajes] = useState([])
  const [pregunta, setPregunta] = useState('')
  const [cargando, setCargando] = useState(false)
  const finalRef  = useRef(null)
  const inputRef  = useRef(null)

  const iniciales = nombre ? nombre.slice(0, 2).toUpperCase() : (usuario || 'U').slice(0, 2).toUpperCase()

  // Cargar mensajes cuando cambia la conversación activa
  useEffect(() => {
    if (convActiva && usuario) {
      api.obtenerConversacion(usuario, convActiva)
        .then(conv => {
          const msgs = (conv.mensajes || []).map((m, i) => ({
            tipo: m.rol === 'usuario' ? 'usuario' : 'agente',
            texto: m.texto,
            confianza: m.metadatos?.confianza || 0,
            citas: m.metadatos?.citas || [],
            sinRespuesta: false,
            id: i,
          }))
          setMensajes(msgs)
        })
        .catch(() => setMensajes([]))
    } else {
      setMensajes([])
    }
  }, [convActiva, usuario])

  useEffect(() => {
    finalRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargando])

  async function asegurarConversacion() {
    if (convActiva) return convActiva
    // Crear nueva conversación automáticamente al enviar el primer mensaje
    try {
      const datos = await api.crearConversacion(usuario)
      if (setConvActiva) setConvActiva(datos.id_conversacion)
      return datos.id_conversacion
    } catch {
      return null
    }
  }

  async function enviar(texto = pregunta) {
    const q = texto.trim()
    if (!q || cargando) return
    setPregunta('')

    const idMsg = Date.now()
    setMensajes(p => [...p, { tipo: 'usuario', texto: q, id: idMsg }])
    setCargando(true)

    const idConv = await asegurarConversacion()

    try {
      const d = await api.consultar(q, idConv, usuario)
      setMensajes(p => [...p, {
        tipo: 'agente', texto: d.respuesta, confianza: d.confianza,
        citas: d.citas, sinRespuesta: d.sin_respuesta, id: idMsg + 1,
      }])
    } catch (err) {
      setMensajes(p => [...p, {
        tipo: 'agente', texto: `Error: ${err.message}`,
        confianza: 0, citas: [], sinRespuesta: true, id: idMsg + 1,
      }])
    } finally {
      setCargando(false)
      // Actualizar el historial del Sidebar para mostrar el título actualizado
      if (onActualizarHistorial) onActualizarHistorial()
    }
  }

  return (
    <div className="flex h-full flex-col" style={{ background: '#07090f' }}>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {mensajes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-5 overflow-hidden"
                 style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
              <Sparkles size={28} style={{ color: '#f97316' }} />
            </div>
            <h2 className="text-[1.05rem] font-semibold text-white">¿En qué puedo ayudarte?</h2>
            <p className="mt-2 text-[13px] max-w-sm" style={{ color: '#8899b4' }}>
              Consulta la documentación interna de Santos Pegasus.
            </p>
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGERENCIAS.map(s => (
                <button key={s} onClick={() => enviar(s)}
                  className="rounded-xl px-4 py-3 text-left text-[12px] transition-all"
                  style={{ border: '1px solid #1a2236', background: '#0f1320', color: '#8899b4' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.35)'; e.currentTarget.style.color = '#e8edf5' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a2236'; e.currentTarget.style.color = '#8899b4' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-5">
            {mensajes.map(m =>
              m.tipo === 'usuario'
                ? <BurbujaUsuario key={m.id} texto={m.texto} iniciales={iniciales} />
                : <BurbujaAgente  key={m.id} msg={m} />
            )}
            {cargando && <BurbujaCargando />}
            <div ref={finalRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-6 py-4" style={{ borderTop: '1px solid #1a2236', background: '#0b0e18' }}>
        <div className="mx-auto max-w-2xl flex items-end gap-3">
          <textarea ref={inputRef} rows={1} value={pregunta}
            onChange={e => setPregunta(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
            placeholder="Escribe tu pregunta… (Enter para enviar)"
            disabled={cargando}
            className="chat-input flex-1"
            style={{ maxHeight: '110px', overflowY: 'auto' }}
          />
          <button onClick={() => enviar()}
            disabled={!pregunta.trim() || cargando}
            className="btn-primario shrink-0 px-4 py-3.5" aria-label="Enviar">
            {cargando ? <Loader2 size={16} className="girando" /> : <Send size={16} />}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px]" style={{ color: '#2a3550' }}>
          Fuente principal: documentos internos Santos Pegasus. Web confiable como complemento.
        </p>
      </div>
    </div>
  )
}
