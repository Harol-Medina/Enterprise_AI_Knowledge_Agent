import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  Database, FileText, MessageSquare, CheckCircle2,
  XCircle, Loader2, ArrowRight, Zap, Bot,
} from 'lucide-react'
import { api } from '../servicios/api'
import { useAuth } from '../contextos/AuthContexto'

function Metrica({ icono: I, titulo, valor, sub, color = '#818cf8' }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3"
         style={{ background: '#0a0f1c', border: '1px solid #1e2a3d' }}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl"
           style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
        <I size={16} strokeWidth={1.8} style={{ color }} />
      </div>
      <div>
        <p className="text-[1.7rem] font-bold text-white leading-none">{valor}</p>
        <p className="text-[12.5px] font-medium mt-1" style={{ color: '#c8d5e8' }}>{titulo}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: '#4a6080' }}>{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { usuario, nombre, esAdmin } = useAuth()
  if (!esAdmin) return <Navigate to="/documentos" replace />

  const [estado,    setEstado]    = useState(null)
  const [validacion,setValidacion]= useState(null)
  const [cargando,  setCargando]  = useState(true)

  useEffect(() => {
    Promise.all([api.estadoIndice(), api.validarApi()])
      .then(([e, v]) => { setEstado(e); setValidacion(v) })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  const saludo = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'
  }

  return (
    <div className="min-h-full p-7 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[12.5px]" style={{ color: '#4a6080' }}>{saludo()},</p>
        <h1 className="text-xl font-bold text-white mt-0.5">
          {nombre || usuario}
          <span className="font-normal text-base" style={{ color: '#4a6080' }}> — Panel principal</span>
        </h1>
        <p className="text-[12.5px] mt-1" style={{ color: '#4a6080' }}>
          Santos Pegasus Soluciones · Plataforma de Conocimiento Interno
        </p>
      </div>

      {/* Métricas */}
      {cargando ? (
        <div className="flex items-center gap-2 py-8" style={{ color: '#4a6080' }}>
          <Loader2 size={15} className="girando" />
          <span>Cargando estado del sistema...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <Metrica icono={Database}     titulo="Fragmentos indexados" valor={estado?.fragmentos_indexados ?? '—'} sub="ChromaDB"          color="#f97316" />
          <Metrica icono={FileText}     titulo="Documentos"           valor={estado?.documentos_disponibles ?? '—'} sub="En Docs/"        color="#818cf8" />
          <Metrica icono={Bot}          titulo="Embeddings"           valor="Cohere"  sub="multilingual-v3"       color="#34d399" />
          <Metrica icono={MessageSquare}titulo="Chat"                 valor="Activo"  sub="command-a-03-2025"     color="#60a5fa" />
        </div>
      )}

      {/* Estado API */}
      {validacion && (
        <div className="rounded-2xl p-4 mb-7 flex items-center gap-4"
             style={{
               background: validacion.api_key_valida ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
               border: `1px solid ${validacion.api_key_valida ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
             }}>
          {validacion.api_key_valida
            ? <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            : <XCircle      size={18} className="shrink-0 text-red-400" />}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold"
               style={{ color: validacion.api_key_valida ? '#6ee7b7' : '#fca5a5' }}>
              {validacion.api_key_valida ? 'Cohere conectado y operativo' : 'API de Cohere no configurada'}
            </p>
            <p className="text-[11.5px] mt-0.5" style={{ color: '#4a6080' }}>{validacion.mensaje}</p>
          </div>
          {validacion.api_key_valida && (
            <div className="text-right shrink-0">
              <p className="text-[11.5px] text-white">{validacion.modelo_chat}</p>
              <p className="text-[10.5px]" style={{ color: '#4a6080' }}>{validacion.modelo_embedding}</p>
            </div>
          )}
        </div>
      )}

      {/* Documentos indexados */}
      {estado?.nombres_documentos?.length > 0 && (
        <div className="rounded-2xl p-5 mb-7"
             style={{ background: '#0a0f1c', border: '1px solid #1e2a3d' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-4"
             style={{ color: '#4a6080' }}>
            Documentos en el índice
          </p>
          <div className="space-y-1.5">
            {estado.nombres_documentos.map(n => (
              <div key={n} className="flex items-center gap-3 rounded-xl px-4 py-2.5 transition"
                   style={{ background: '#060a12' }}
                   onMouseEnter={e => e.currentTarget.style.background = '#0d1525'}
                   onMouseLeave={e => e.currentTarget.style.background = '#060a12'}>
                <FileText size={13} style={{ color: '#f97316' }} className="shrink-0" />
                <span className="text-[12.5px] truncate flex-1" style={{ color: '#c8d5e8' }}>{n}</span>
                <span className="text-[10px] rounded-full px-2.5 py-0.5 shrink-0"
                      style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399',
                               border: '1px solid rgba(16,185,129,0.2)' }}>
                  Activo
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { to: '/chat',   I: MessageSquare, color: '#f97316', titulo: 'Abrir chat', sub: 'Consulta en lenguaje natural' },
          { to: '/indice', I: Zap, color: '#818cf8', titulo: 'Gestionar índice', sub: 'Indexar o reindexar documentos' },
        ].map(({ to, I, color, titulo, sub }) => (
          <Link key={to} to={to}
            className="group flex items-center justify-between rounded-2xl p-5 transition-all"
            style={{ background: '#0a0f1c', border: '1px solid #1e2a3d' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}55`; e.currentTarget.style.background = `${color}08` }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2a3d'; e.currentTarget.style.background = '#0a0f1c' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                   style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <I size={18} strokeWidth={1.8} style={{ color }} />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-white">{titulo}</p>
                <p className="text-[11.5px] mt-0.5" style={{ color: '#4a6080' }}>{sub}</p>
              </div>
            </div>
            <ArrowRight size={16} style={{ color: '#1e2a3d' }}
              className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ))}
      </div>
    </div>
  )
}
