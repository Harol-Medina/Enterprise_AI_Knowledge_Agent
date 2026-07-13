import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, User, Lock, Save } from 'lucide-react'
import { api } from '../servicios/api'
import { useAuth } from '../contextos/AuthContexto'

/* ── Tab button ────────────────────────────────────────────── */
function TabBtn({ activo, onClick, icono: I, label }) {
  return (
    <button onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-[12.5px] font-semibold transition-all"
      style={{
        background: activo ? '#f97316' : 'transparent',
        color:      activo ? '#fff'     : '#6b82a0',
      }}>
      <I size={14} strokeWidth={2} />
      {label}
    </button>
  )
}

/* ── Input reutilizable ─────────────────────────────────────── */
function Campo({ label, type = 'text', value, onChange, placeholder, disabled }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
             style={{ color: '#4a6080' }}>
        {label}
      </label>
      <input type={type} value={value} onChange={onChange}
        placeholder={placeholder} disabled={disabled}
        className="w-full rounded-xl px-4 py-3 text-[13px] outline-none transition"
        style={{
          background: disabled ? '#0a0f1c' : '#0d1525',
          border: '1px solid #1e2a3d',
          color: disabled ? '#3a4a65' : '#e8edf5',
        }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = 'rgba(249,115,22,0.5)' }}
        onBlur={e => e.target.style.borderColor = '#1e2a3d'}
      />
    </div>
  )
}

/* ── Alerta ─────────────────────────────────────────────────── */
function Alerta({ msg }) {
  if (!msg) return null
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-[12.5px] font-medium"
         style={msg.ok
           ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }
           : { background: 'rgba(239,68,68,0.08)',  border: '1px solid rgba(239,68,68,0.25)',  color: '#f87171' }}>
      {msg.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      {msg.texto}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════ */
export default function Perfil() {
  const { usuario, esAdmin } = useAuth()
  const [tab, setTab] = useState('info')   // 'info' | 'password'

  /* Datos de perfil */
  const [perfil, setPerfil] = useState({ nombre: '', apellido: '', email: '' })
  const [savingPerfil, setSavingPerfil] = useState(false)
  const [msgPerfil, setMsgPerfil] = useState(null)

  /* Contraseña */
  const [pass, setPass] = useState({ actual: '', nueva: '', confirmar: '' })
  const [savingPass, setSavingPass] = useState(false)
  const [msgPass, setMsgPass] = useState(null)

  useEffect(() => {
    if (usuario) {
      api.obtenerUsuario(usuario)
        .then(u => setPerfil({ nombre: u.nombre || '', apellido: u.apellido || '', email: u.email || '' }))
        .catch(() => {})
    }
  }, [usuario])

  async function guardarPerfil(e) {
    e.preventDefault()
    setSavingPerfil(true); setMsgPerfil(null)
    try {
      const r = await api.actualizarPerfil(usuario, perfil.nombre, perfil.apellido, perfil.email)
      setMsgPerfil({ ok: r.ok, texto: r.mensaje })
    } catch (err) {
      setMsgPerfil({ ok: false, texto: err.message })
    } finally { setSavingPerfil(false) }
  }

  async function guardarPass(e) {
    e.preventDefault()
    if (pass.nueva !== pass.confirmar) {
      setMsgPass({ ok: false, texto: 'Las contraseñas nuevas no coinciden' }); return
    }
    if (pass.nueva.length < 6) {
      setMsgPass({ ok: false, texto: 'Mínimo 6 caracteres' }); return
    }
    setSavingPass(true); setMsgPass(null)
    try {
      const r = await api.cambiarContrasena(usuario, pass.actual, pass.nueva)
      setMsgPass({ ok: r.ok, texto: r.mensaje })
      if (r.ok) setPass({ actual: '', nueva: '', confirmar: '' })
    } catch (err) {
      setMsgPass({ ok: false, texto: err.message })
    } finally { setSavingPass(false) }
  }

  const nombreCompleto = [perfil.nombre, perfil.apellido].filter(Boolean).join(' ') || usuario || 'Usuario'

  return (
    <div className="min-h-full p-4 md:p-7">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="overflow-hidden rounded-[28px] border border-[#1e2a3d] p-6 shadow-2xl"
             style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.14), rgba(8,13,25,0.95))' }}>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-semibold text-white"
                   style={{ background: esAdmin ? '#7c3aed' : '#f97316' }}>
                {(nombreCompleto || usuario || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: '#f97316' }}>Perfil</p>
                <h1 className="text-2xl font-semibold text-white">{nombreCompleto}</h1>
                <p className="mt-1 text-sm" style={{ color: '#aab8ca' }}>
                  Gestiona tu información personal y seguridad de acceso
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#243050] px-4 py-3" style={{ background: 'rgba(8,13,25,0.7)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#4a6080' }}>Rol actual</p>
              <p className="mt-1 text-sm font-semibold text-white">{esAdmin ? 'Administrador' : 'Colaborador'}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 rounded-2xl border border-[#1e2a3d] bg-[#0d1525] p-1.5">
          <TabBtn activo={tab === 'info'} onClick={() => setTab('info')} icono={User} label="Información" />
          <TabBtn activo={tab === 'password'} onClick={() => setTab('password')} icono={Lock} label="Seguridad" />
        </div>

        {tab === 'info' && (
          <form onSubmit={guardarPerfil} className="space-y-5">
            <div className="rounded-[24px] border border-[#1e2a3d] bg-[#0a0f1c] p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#4a6080' }}>Datos personales</h2>
                  <p className="mt-1 text-sm" style={{ color: '#6b82a0' }}>Actualiza tu información visible en la plataforma.</p>
                </div>
              </div>
              <Campo label="Usuario" value={usuario} disabled />
              <div className="grid gap-4 md:grid-cols-2">
                <Campo label="Nombre" value={perfil.nombre}
                  onChange={e => setPerfil(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Tu nombre" />
                <Campo label="Apellido" value={perfil.apellido}
                  onChange={e => setPerfil(p => ({ ...p, apellido: e.target.value }))}
                  placeholder="Tu apellido" />
              </div>
              <Campo label="Correo electrónico" type="email" value={perfil.email}
                onChange={e => setPerfil(p => ({ ...p, email: e.target.value }))}
                placeholder="correo@santospegasus.com" />
            </div>

            <Alerta msg={msgPerfil} />

            <button type="submit" disabled={savingPerfil}
              className="btn-primario px-6 py-3 rounded-2xl text-[13px]">
              {savingPerfil
                ? <><Loader2 size={14} className="girando" /> Guardando...</>
                : <><Save size={14} /> Guardar cambios</>}
            </button>
          </form>
        )}

        {tab === 'password' && (
          <form onSubmit={guardarPass} className="space-y-5">
            <div className="rounded-[24px] border border-[#1e2a3d] bg-[#0a0f1c] p-5 md:p-6 space-y-4">
              <div>
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#4a6080' }}>Seguridad</h2>
                <p className="mt-1 text-sm" style={{ color: '#6b82a0' }}>Cambia tu contraseña para mantener tu cuenta protegida.</p>
              </div>
              <Campo label="Contraseña actual" type="password" value={pass.actual}
                onChange={e => setPass(p => ({ ...p, actual: e.target.value }))}
                placeholder="Tu contraseña actual" />
              <Campo label="Nueva contraseña" type="password" value={pass.nueva}
                onChange={e => setPass(p => ({ ...p, nueva: e.target.value }))}
                placeholder="Mínimo 6 caracteres" />
              <Campo label="Confirmar contraseña" type="password" value={pass.confirmar}
                onChange={e => setPass(p => ({ ...p, confirmar: e.target.value }))}
                placeholder="Repite la nueva contraseña" />
            </div>

            <Alerta msg={msgPass} />

            <button type="submit" disabled={savingPass}
              className="btn-primario px-6 py-3 rounded-2xl text-[13px]">
              {savingPass
                ? <><Loader2 size={14} className="girando" /> Actualizando...</>
                : <><Lock size={14} /> Actualizar contraseña</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
