import { useEffect, useState } from 'react'
import { FileText, RefreshCw, Loader2, AlertCircle, Upload, Pencil, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '../servicios/api'
import { useAuth } from '../contextos/AuthContexto'

const DOCS_CONOCIDOS = [
  { nombre: 'Manual de Onboarding para Nuevos Desarrolladores.pdf', area: 'Recursos Humanos' },
  { nombre: 'Santo Pegasus Soluciones Guía Oficial de Ingeniería Backend.pdf', area: 'Ingeniería Backend' },
  { nombre: 'Santo Pegasus Soluciones Guía Oficial de Ingeniería FrontEnd.pdf', area: 'Ingeniería Frontend' },
  { nombre: 'PROTOCOLO DE RESPUESTA A INCIDENTES Y POST-MORTEMS.pdf', area: 'Operaciones' },
  { nombre: 'Arquitectura de Microservicios y Mapa de Dominios.pdf', area: 'Arquitectura' },
]

function areaColor(area) {
  const m = {
    'Recursos Humanos': { bg: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: 'rgba(139,92,246,0.25)' },
    'Ingeniería Backend': { bg: 'rgba(249,115,22,0.1)', color: '#fb923c', border: 'rgba(249,115,22,0.25)' },
    'Ingeniería Frontend': { bg: 'rgba(249,115,22,0.1)', color: '#fb923c', border: 'rgba(249,115,22,0.25)' },
    'Operaciones': { bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.25)' },
    'Arquitectura': { bg: 'rgba(16,185,129,0.1)', color: '#34d399', border: 'rgba(16,185,129,0.25)' },
  }
  return m[area] || { bg: 'rgba(99,102,241,0.1)', color: '#818cf8', border: 'rgba(99,102,241,0.25)' }
}

export default function Documentos() {
  const [estado, setEstado] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [docs, setDocs] = useState([])
  const [docEditando, setDocEditando] = useState(null)
  const [formDoc, setFormDoc] = useState({ nombre: '', area: 'General', activo: true })

  const { usuario, rol, esAdmin } = useAuth()

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      if (usuario) {
        const docsResp = await api.listarDocumentos(usuario)
        const lista = (docsResp.documentos || []).map((nombre) => {
          const match = DOCS_CONOCIDOS.find((d) => nombre.toLowerCase().includes(d.nombre.split('.')[0].substring(0, 20).toLowerCase()))
          return {
            nombre,
            area: match?.area ?? 'General',
            activo: true,
            indexado: true,
          }
        })
        setDocs(lista)
        setEstado({ documentos_disponibles: lista.length, nombres_documentos: lista.map((d) => d.nombre), fragmentos_indexados: lista.length })
      } else {
        setError('Debes iniciar sesión para ver tus documentos.')
        setEstado(null)
        setDocs([])
      }
    } catch (e) {
      setError('No se pudo conectar con el backend: ' + e.message)
      setEstado(null)
      setDocs([])
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [usuario])

  function abrirEdicion(doc) {
    setDocEditando(doc)
    setFormDoc({ nombre: doc.nombre, area: doc.area, activo: doc.activo })
  }

  function guardarEdicion(e) {
    e.preventDefault()
    if (!docEditando) return
    setDocs((prev) => prev.map((doc) => (doc.nombre === docEditando.nombre ? { ...doc, ...formDoc } : doc)))
    setMensaje('Documento actualizado correctamente')
    setDocEditando(null)
  }

  async function manejarUpload(e) {
    e.preventDefault()
    if (!archivo || !usuario) return
    setSubiendo(true)
    setMensaje('')
    try {
      const r = await api.uploadDocumento(usuario, archivo)
      setMensaje(r.mensaje || 'Documento subido correctamente')
      setArchivo(null)
      await cargar()
    } catch (e) {
      setMensaje(e.message || 'No se pudo subir el documento')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="p-7 max-w-5xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-7">
        <div>
          <h1 className="text-[1.2rem] font-bold text-white">Documentos</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#8899b4' }}>
            Tus documentos autorizados según tu rol de acceso, con estado y edición rápida.
          </p>
        </div>
        <button onClick={cargar} disabled={cargando}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] transition"
          style={{ border: '1px solid #1a2236', background: '#0f1320', color: '#8899b4' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = '#8899b4'}>
          <RefreshCw size={12} className={cargando ? 'girando' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4 mb-5"
             style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={15} className="text-red-400 shrink-0" />
          <p className="text-[13px] text-red-300">{error}</p>
        </div>
      )}

      {mensaje && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 mb-5"
             style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
          <CheckCircle2 size={14} />
          <span className="text-[12px]">{mensaje}</span>
        </div>
      )}

      {!cargando && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="rounded-2xl p-5" style={{ background: '#0f1320', border: '1px solid #1a2236' }}>
            <p className="text-[1.5rem] font-bold text-white">{estado?.documentos_disponibles ?? docs.length}</p>
            <p className="text-[12px] mt-1" style={{ color: '#8899b4' }}>Documentos disponibles</p>
          </div>
          <div className="rounded-2xl p-5" style={{ background: '#0f1320', border: '1px solid #1a2236' }}>
            <p className="text-[1.5rem] font-bold text-white">{rol || 'usuario'}</p>
            <p className="text-[12px] mt-1" style={{ color: '#8899b4' }}>Tu rol</p>
          </div>
        </div>
      )}

      {esAdmin && (
        <form onSubmit={manejarUpload} className="rounded-2xl p-5 mb-5" style={{ background: '#0f1320', border: '1px solid #1a2236' }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Subir documento</p>
              <p className="text-[11px] mt-1" style={{ color: '#8899b4' }}>Añade un PDF o archivo de texto a la base de conocimiento.</p>
            </div>
            <label className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] cursor-pointer"
                   style={{ border: '1px dashed #1e2a3d', color: '#4a6080' }}>
              <Upload size={13} />
              <span>{archivo ? archivo.name : 'Seleccionar archivo'}</span>
              <input type="file" className="hidden" accept=".pdf,.txt,.md" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
            </label>
          </div>
          <button type="submit" disabled={subiendo || !archivo} className="mt-4 rounded-xl px-4 py-2 text-[12px] font-semibold transition"
            style={{ background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.2)' }}>
            {subiendo ? 'Subiendo...' : 'Subir documento'}
          </button>
        </form>
      )}

      {cargando && !estado ? (
        <div className="flex items-center gap-2 py-8" style={{ color: '#8899b4' }}>
          <Loader2 size={15} className="girando" />
          <span className="text-sm">Cargando documentos...</span>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0f1320', border: '1px solid #1a2236' }}>
          {docs.length === 0 ? (
            <div className="px-5 py-8 text-center" style={{ color: '#8899b4' }}>No hay documentos autorizados para tu rol.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a2236' }}>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: '#4a6080' }}>Documento</th>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: '#4a6080' }}>Área</th>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: '#4a6080' }}>Estado</th>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: '#4a6080' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc, i) => {
                    const c = areaColor(doc.area)
                    return (
                      <tr key={doc.nombre} style={{ borderTop: i > 0 ? '1px solid #1a2236' : 'none' }}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
                              <FileText size={14} style={{ color: '#f97316' }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-white truncate">{doc.nombre}</p>
                              <p className="text-[11px] mt-0.5" style={{ color: '#8899b4' }}>{doc.indexado ? 'Indexado en ChromaDB · Embeddings Gemini' : 'Pendiente de indexación'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                            {doc.area}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium" style={doc.activo ? { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' } : { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                            {doc.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button onClick={() => abrirEdicion(doc)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition" style={{ background: '#1e2a3d', color: '#818cf8' }}>
                            <Pencil size={12} /> Editar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {docEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: '#0f1320', border: '1px solid #1a2236' }}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[13px] font-semibold text-white">Editar documento</p>
                <p className="text-[11px] mt-1" style={{ color: '#8899b4' }}>{docEditando.nombre}</p>
              </div>
              <button onClick={() => setDocEditando(null)} className="text-[12px]" style={{ color: '#4a6080' }}>Cerrar</button>
            </div>
            <form onSubmit={guardarEdicion} className="space-y-3">
              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#4a6080' }}>Nombre</label>
                <input value={formDoc.nombre} onChange={(e) => setFormDoc((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-[12px] outline-none" style={{ background: '#060a12', border: '1px solid #1e2a3d', color: '#e8edf5' }} />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#4a6080' }}>Área</label>
                <select value={formDoc.area} onChange={(e) => setFormDoc((f) => ({ ...f, area: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-[12px] outline-none" style={{ background: '#060a12', border: '1px solid #1e2a3d', color: '#e8edf5' }}>
                  <option value="Recursos Humanos">Recursos Humanos</option>
                  <option value="Ingeniería Backend">Ingeniería Backend</option>
                  <option value="Ingeniería Frontend">Ingeniería Frontend</option>
                  <option value="Operaciones">Operaciones</option>
                  <option value="Arquitectura">Arquitectura</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#4a6080' }}>Estado</label>
                <button type="button" onClick={() => setFormDoc((f) => ({ ...f, activo: !f.activo }))}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition"
                  style={formDoc.activo ? { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' } : { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {formDoc.activo ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {formDoc.activo ? 'Activo' : 'Inactivo'}
                </button>
              </div>
              <button type="submit" className="w-full rounded-xl px-4 py-2.5 text-[12px] font-semibold transition" style={{ background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.2)' }}>
                Guardar cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
