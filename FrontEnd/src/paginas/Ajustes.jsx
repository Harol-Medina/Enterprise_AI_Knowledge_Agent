import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, RefreshCw, Info, User, Lock, Save } from 'lucide-react'
import { api } from '../servicios/api'
import { useAuth } from '../contextos/AuthContexto'

export default function Ajustes() {
  const { usuario, nombre: nombreCtx } = useAuth()
  const [tab,         setTab]         = useState('perfil')  // 'perfil' | 'contrasena' | 'api'
  const [validacion,  setValidacion]  = useState(null)
  const [cargandoApi, setCargandoApi] = useState(false)

  // Perfil
  const [perfil,           setPerfil]           = useState({ nombre: '', apellido: '', email: '' })
  const [guardandoPerfil,  setGuardandoPerfil]  = useState(false)
  const [msgPerfil,        setMsgPerfil]        = useState(null)

  // Contraseña
  const [pass,            setPass]            = useState({ actual: '', nueva: '', confirmar: '' })
  const [guardandoPass,   setGuardandoPass]   = useState(false)
  const [msgPass,         setMsgPass]         = useState(null)

  useEffect(() => {
    // Cargar datos del usuario
    if (usuario) {
      api.obtenerUsuario(usuario)
        .then(u => setPerfil({ nombre: u.nombre || '', apellido: u.apellido || '', email: u.email || '' }))
        .catch(() => {})
    }
    cargarValidacion()
  }, [usuario])

  async function cargarValidacion() {
    setCargandoApi(true)
    try { setValidacion(await api.validarApi()) }
    catch { setValidacion(null) }
    finally { setCargandoApi(false) }
  }

  async function guardarPerfil(e) {
    e.preventDefault()
    setGuardandoPerfil(true)
    setMsgPerfil(null)
    try {
      const r = await api.actualizarPerfil(usuario, perfil.nombre, perfil.apellido, perfil.email)
      setMsgPerfil({ ok: r.ok, texto: r.mensaje })
    } catch (err) {
      setMsgPerfil({ ok: false, texto: err.message })
    } finally {
      setGuardandoPerfil(false)
    }
  }

  async function guardarContrasena(e) {
    e.preventDefault()
    if (pass.nueva !== pass.confirmar) {
      setMsgPass({ ok: false, texto: 'Las contraseñas nuevas no coinciden' })
      return
    }
    if (pass.nueva.length < 6) {
      setMsgPass({ ok: false, texto: 'La nueva contraseña debe tener al menos 6 caracteres' })
      return
    }
    setGuardandoPass(true)
    setMsgPass(null)
    try {
      const r = await api.cambiarContrasena(usuario, pass.actual, pass.nueva)
      setMsgPass({ ok: r.ok, texto: r.mensaje })
      if (r.ok) setPass({ actual: '', nueva: '', confirmar: '' })
    } catch (err) {
      setMsgPass({ ok: false, texto: err.message })
    } finally {
      setGuardandoPass(false)
    }
  }

  const TABS = [
    { id: 'perfil',     I: User,     label: 'Editar perfil'   },
    { id: 'contrasena', I: Lock,     label: 'Contraseña'      },
    { id: 'api',        I: RefreshCw,label: 'Estado de APIs'  },
  ]

  const inputStyle = {
    background: '#0f1320', border: '1px solid #1a2236', color: '#e8edf5',
  }
  const inputClass = "w-full rounded-xl py-3 px-4 text-[13px] placeholder-[#4a5a7a] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition"

  return (
    <div className="p-7 max-w-2xl mx-auto">
      <div className="mb-7">
        <h1 className="text-[1.2rem] font-bold text-white">Ajustes</h1>
        <p className="text-[12px] mt-0.5" style={{ color: '#8899b4' }}>Gestiona tu perfil y configuración</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: '#0f1320', border: '1px solid #1a2236' }}>
        {TABS.map(({ id, I, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-[12px] font-medium transition"
            style={{
              background: tab === id ? '#f97316' : 'transparent',
              color: tab === id ? '#fff' : '#8899b4',
            }}>
            <I size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Perfil ── */}
      {tab === 'perfil' && (
        <form onSubmit={guardarPerfil} className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: '#0f1320', border: '1px solid #1a2236' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: '#8899b4' }}>
              Información personal
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] mb-1.5 font-medium" style={{ color: '#8899b4' }}>Usuario</label>
                <input type="text" value={usuario} disabled
                  style={{ ...inputStyle, opacity: 0.5 }} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] mb-1.5 font-medium" style={{ color: '#8899b4' }}>Nombre</label>
                  <input type="text" value={perfil.nombre}
                    onChange={e => setPerfil(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Nombre" style={inputStyle} className={inputClass} />
                </div>
                <div>
                  <label className="block text-[11px] mb-1.5 font-medium" style={{ color: '#8899b4' }}>Apellido</label>
                  <input type="text" value={perfil.apellido}
                    onChange={e => setPerfil(p => ({ ...p, apellido: e.target.value }))}
                    placeholder="Apellido" style={inputStyle} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] mb-1.5 font-medium" style={{ color: '#8899b4' }}>Email</label>
                <input type="email" value={perfil.email}
                  onChange={e => setPerfil(p => ({ ...p, email: e.target.value }))}
                  placeholder="correo@santospegasus.com" style={inputStyle} className={inputClass} />
              </div>
            </div>
          </div>

          {msgPerfil && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-[12px]"
                 style={msgPerfil.ok
                   ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }
                   : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              {msgPerfil.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {msgPerfil.texto}
            </div>
          )}

          <button type="submit" disabled={guardandoPerfil} className="btn-primario px-6 py-2.5">
            {guardandoPerfil ? <><Loader2 size={13} className="girando" /> Guardando...</> : <><Save size={13} /> Guardar cambios</>}
          </button>
        </form>
      )}

      {/* ── Contraseña ── */}
      {tab === 'contrasena' && (
        <form onSubmit={guardarContrasena} className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: '#0f1320', border: '1px solid #1a2236' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: '#8899b4' }}>
              Cambiar contraseña
            </p>
            <div className="space-y-3">
              {[
                { key: 'actual',    label: 'Contraseña actual',   ph: '••••••••' },
                { key: 'nueva',     label: 'Nueva contraseña',    ph: 'Mínimo 6 caracteres' },
                { key: 'confirmar', label: 'Confirmar contraseña', ph: 'Repite la nueva contraseña' },
              ].map(({ key, label, ph }) => (
                <div key={key}>
                  <label className="block text-[11px] mb-1.5 font-medium" style={{ color: '#8899b4' }}>{label}</label>
                  <input type="password" value={pass[key]}
                    onChange={e => setPass(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={ph} style={inputStyle} className={inputClass} required />
                </div>
              ))}
            </div>
          </div>

          {msgPass && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-[12px]"
                 style={msgPass.ok
                   ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }
                   : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              {msgPass.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {msgPass.texto}
            </div>
          )}

          <button type="submit" disabled={guardandoPass} className="btn-primario px-6 py-2.5">
            {guardandoPass ? <><Loader2 size={13} className="girando" /> Actualizando...</> : <><Lock size={13} /> Actualizar contraseña</>}
          </button>
        </form>
      )}

      {/* ── Estado APIs ── */}
      {tab === 'api' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: '#0f1320', border: '1px solid #1a2236' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#8899b4' }}>
                Estado de APIs
              </p>
              <button onClick={cargarValidacion} disabled={cargandoApi}
                className="flex items-center gap-1 text-[11px] transition" style={{ color: '#8899b4' }}>
                <RefreshCw size={11} className={cargandoApi ? 'girando' : ''} /> Verificar
              </button>
            </div>

            {cargandoApi ? (
              <div className="flex items-center gap-2 py-2" style={{ color: '#8899b4' }}>
                <Loader2 size={14} className="girando" />
                <span className="text-[13px]">Verificando...</span>
              </div>
            ) : validacion ? (
              <div className="flex items-start gap-4 rounded-xl p-4"
                   style={validacion.api_key_valida
                     ? { background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }
                     : { background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {validacion.api_key_valida
                  ? <CheckCircle2 size={17} className="text-emerald-400 shrink-0 mt-0.5" />
                  : <XCircle      size={17} className="text-red-400 shrink-0 mt-0.5" />}
                <div>
                  <p className="text-[13px] font-semibold"
                     style={{ color: validacion.api_key_valida ? '#6ee7b7' : '#fca5a5' }}>
                    {validacion.api_key_valida ? 'Cohere operativo' : 'API no configurada'}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#8899b4' }}>{validacion.mensaje}</p>
                  {validacion.api_key_valida && (
                    <div className="mt-2 space-y-0.5">
                      <p className="text-[11px]" style={{ color: '#6b7fa0' }}>Chat: <span className="text-white">{validacion.modelo_chat}</span></p>
                      <p className="text-[11px]" style={{ color: '#6b7fa0' }}>Embedding: <span className="text-white">{validacion.modelo_embedding}</span></p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[13px]" style={{ color: '#8899b4' }}>No se pudo contactar con el backend.</p>
            )}
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.15)' }}>
            <div className="flex items-start gap-3">
              <Info size={15} style={{ color: '#f97316' }} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold" style={{ color: '#fb923c' }}>Configuración de claves</p>
                <p className="text-[12px] mt-2 leading-relaxed" style={{ color: '#8899b4' }}>
                  Edita el archivo <code className="text-white">.env</code> en la raíz del proyecto y reinicia el backend:
                </p>
                <div className="mt-3 rounded-xl p-3 text-[11px] font-mono" style={{ background: '#07090f', border: '1px solid #1a2236', color: '#c8d5e8' }}>
                  COHERE_API_KEY=tu-clave-aqui
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
