import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Database, RefreshCw, Loader2, CheckCircle2, AlertCircle, RotateCcw, Zap } from 'lucide-react'
import { api } from '../servicios/api'
import { useAuth } from '../contextos/AuthContexto'

export default function IndiceVectorial() {
  const { esAdmin } = useAuth()
  const [estado,    setEstado]    = useState(null)
  const [cargando,  setCargando]  = useState(true)
  const [indexando, setIndexando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error,     setError]     = useState('')

  async function cargarEstado() {
    setCargando(true)
    try   { setEstado(await api.estadoIndice()) }
    catch (e) { setError('Error: ' + e.message) }
    finally   { setCargando(false) }
  }

  async function indexar(forzar) {
    setIndexando(true); setResultado(null); setError('')
    try {
      const d = await api.indexar(forzar)
      setResultado(d)
      await cargarEstado()
    } catch (e) { setError(e.message) }
    finally { setIndexando(false) }
  }

  if (!esAdmin) return <Navigate to="/dashboard" replace />

  useEffect(() => { cargarEstado() }, [])

  const llmOk = estado?.llm_configurado

  return (
    <div className="p-7 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-[1.2rem] font-bold text-white">Índice vectorial</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#8899b4' }}>
            ChromaDB · Gemini embedding-001 · 768 dimensiones
          </p>
        </div>
        <button onClick={cargarEstado} disabled={cargando}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] transition"
          style={{ border: '1px solid #1a2236', background: '#0f1320', color: '#8899b4' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = '#8899b4'}
        >
          <RefreshCw size={12} className={cargando ? 'girando' : ''} />
          Actualizar
        </button>
      </div>

      {/* Métricas */}
      {estado && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Fragmentos', val: estado.fragmentos_indexados },
            { label: 'Documentos', val: estado.documentos_disponibles },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-2xl p-5"
                 style={{ background: '#0f1320', border: '1px solid #1a2236' }}>
              <p className="text-[1.5rem] font-bold text-white">{val}</p>
              <p className="text-[12px] mt-1" style={{ color: '#8899b4' }}>{label}</p>
            </div>
          ))}
          <div className="rounded-2xl p-5"
               style={{ background: '#0f1320', border: '1px solid #1a2236' }}>
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                 style={llmOk
                   ? { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }
                   : { background: 'rgba(239,68,68,0.1)',  color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {llmOk ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
              {llmOk ? 'Conectado' : 'Sin clave'}
            </div>
            <p className="text-[12px] mt-2" style={{ color: '#8899b4' }}>Gemini + Cohere</p>
          </div>
        </div>
      )}

      {/* Notificaciones */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4 mb-4"
             style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <p className="text-[13px] text-red-300">{error}</p>
        </div>
      )}
      {resultado && (
        <div className="flex items-start gap-3 rounded-2xl px-5 py-4 mb-4 animar-entrada"
             style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-emerald-300">{resultado.mensaje}</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#8899b4' }}>
              {resultado.fragmentos_indexados} fragmentos disponibles para búsqueda semántica.
            </p>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="rounded-2xl overflow-hidden mb-5"
           style={{ background: '#0f1320', border: '1px solid #1a2236' }}>

        {/* Incremental */}
        <div className="flex items-center justify-between p-5"
             style={{ borderBottom: '1px solid #1a2236' }}>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                 style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
              <Zap size={15} style={{ color: '#f97316' }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">Indexar nuevos documentos</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#8899b4' }}>
                Agrega solo los fragmentos que aún no están en el índice.
              </p>
            </div>
          </div>
          <button onClick={() => indexar(false)} disabled={indexando || !llmOk}
            className="btn-primario shrink-0 ml-4 px-4 py-2.5 text-[12px]">
            {indexando ? <><Loader2 size={12} className="girando" /> Indexando...</> : 'Indexar'}
          </button>
        </div>

        {/* Reindexación total */}
        <div className="flex items-center justify-between p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                 style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <RotateCcw size={15} style={{ color: '#fbbf24' }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">Reindexación completa</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#8899b4' }}>
                Limpia el índice existente y reprocesa todos los documentos desde cero.
              </p>
            </div>
          </div>
          <button onClick={() => indexar(true)} disabled={indexando || !llmOk}
            className="shrink-0 ml-4 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white transition
                       disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#d97706' }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#b45309' }}
            onMouseLeave={e => e.currentTarget.style.background = '#d97706'}
          >
            {indexando ? <><Loader2 size={12} className="girando inline mr-1" /> Procesando...</> : 'Reindexar'}
          </button>
        </div>
      </div>

      {!llmOk && (
        <p className="text-[11px] flex items-center gap-1.5 mb-5" style={{ color: '#fbbf24' }}>
          <AlertCircle size={12} />
          Configura <code className="text-white">GEMINI_API_KEY</code> y{' '}
          <code className="text-white">COHERE_API_KEY</code> en el archivo <code className="text-white">.env</code>.
        </p>
      )}

      {/* Info técnica */}
      <div className="rounded-2xl p-5"
           style={{ background: '#0f1320', border: '1px solid #1a2236' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-4"
           style={{ color: '#8899b4' }}>
          Configuración técnica
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {[
            ['Motor vectorial',     'ChromaDB (persistente)'],
            ['Modelo embedding',    'Gemini embedding-001'],
            ['Dimensiones',         '768'],
            ['Métrica similitud',   'Coseno (HNSW)'],
            ['Modelo generación',   'Cohere command-r'],
            ['Tamaño de chunk',     '600 tokens'],
            ['Solapamiento',        '100 tokens'],
            ['Umbral relevancia',   '≥ 0.30'],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[11px]" style={{ color: '#4a5a7a' }}>{k}</p>
              <p className="text-[12px] font-medium text-white mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
