import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Users, MessageSquare, TrendingUp, ShieldCheck, Loader2, RefreshCw,
  KeyRound, UserCog, CheckCircle2, XCircle, ToggleLeft, ToggleRight,
  Pencil,
} from 'lucide-react'
import { api } from '../servicios/api'
import { useAuth } from '../contextos/AuthContexto'

/* ── Tarjeta métrica ─────────────────────────────────────── */
function Metrica({ I, label, valor, color }) {
  return (
    <div className="rounded-2xl p-5"
         style={{ background: '#0a0f1c', border: '1px solid #1e2a3d' }}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl mb-3"
           style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
        <I size={17} strokeWidth={1.8} style={{ color }} />
      </div>
      <p className="text-[1.75rem] font-bold text-white leading-none">{valor ?? '—'}</p>
      <p className="text-[12px] mt-1.5" style={{ color: '#6b82a0' }}>{label}</p>
    </div>
  )
}

/* ── Campo ───────────────────────────────────────────────── */
function Campo({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-[10.5px] font-semibold uppercase tracking-wider mb-1.5"
             style={{ color: '#4a6080' }}>
        {label}
      </label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full rounded-xl px-3 py-2.5 text-[12.5px] outline-none transition"
        style={{ background: '#060a12', border: '1px solid #1e2a3d', color: '#e8edf5' }}
        onFocus={e => e.target.style.borderColor = 'rgba(249,115,22,0.5)'}
        onBlur={e => e.target.style.borderColor = '#1e2a3d'}
      />
    </div>
  )
}

/* ── Alerta inline ───────────────────────────────────────── */
function Alerta({ msg, onClose }) {
  if (!msg) return null
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-[12px]"
         style={msg.ok
           ? { background: 'rgba(16,185,129,0.09)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }
           : { background: 'rgba(239,68,68,0.09)',  border: '1px solid rgba(239,68,68,0.25)',  color: '#f87171' }}>
      {msg.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      <span className="flex-1">{msg.texto}</span>
    </div>
  )
}

const ROL_ESTILO = {
  admin:   { bg: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: 'rgba(124,58,237,0.25)' },
  usuario: { bg: 'rgba(249,115,22,0.10)', color: '#fb923c', border: 'rgba(249,115,22,0.25)' },
}

/* ════════════════════════════════════════════════════════════ */
export default function Admin() {
  const { esAdmin } = useAuth()
  if (!esAdmin) return <Navigate to="/dashboard" replace />

  const [stats,    setStats]    = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [sel,      setSel]      = useState(null)
  const [form,     setForm]     = useState({ nombre: '', apellido: '', email: '' })
  const [pass,     setPass]     = useState({ actual: '', nueva: '', confirmar: '' })
  const [msg,      setMsg]      = useState(null)
  const [cargando, setCargando] = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)

  async function cargar() {
    setCargando(true)
    try {
      const [s, u] = await Promise.all([api.estadisticasAdmin(), api.listarUsuarios()])
      setStats(s)
      const lista = u.usuarios || []
      setUsuarios(lista)
      if (!sel && lista.length > 0) elegir(lista[0])
      else if (sel) {
        const actual = lista.find(x => x.username === sel)
        if (actual) elegir(actual)
      }
    } catch { /* silencioso */ }
    finally { setCargando(false) }
  }

  function elegir(u) {
    setSel(u.username)
    setForm({ nombre: u.nombre || '', apellido: u.apellido || '', email: u.email || '' })
    setPass({ actual: '', nueva: '', confirmar: '' })
    setMsg(null)
  }

  useEffect(() => { cargar() }, [])

  /* ── Guardar perfil ── */
  async function guardarPerfil(e) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      const r = await api.actualizarPerfil(sel, form.nombre, form.apellido, form.email)
      setMsg({ ok: r.ok, texto: r.mensaje })
      await cargar()
    } catch (e) { setMsg({ ok: false, texto: e.message }) }
    finally { setSaving(false) }
  }

  /* ── Cambiar contraseña ── */
  async function cambiarPass(e) {
    e.preventDefault()
    if (pass.nueva !== pass.confirmar) { setMsg({ ok: false, texto: 'Las contraseñas no coinciden' }); return }
    if (pass.nueva.length < 6) { setMsg({ ok: false, texto: 'Mínimo 6 caracteres' }); return }
    setSaving(true); setMsg(null)
    try {
      const r = await api.cambiarContrasena(sel, pass.actual, pass.nueva)
      setMsg({ ok: r.ok, texto: r.mensaje })
      if (r.ok) setPass({ actual: '', nueva: '', confirmar: '' })
    } catch (e) { setMsg({ ok: false, texto: e.message }) }
    finally { setSaving(false) }
  }

  /* ── Activar / inactivar ── */
  async function toggleEstado() {
    const u = usuarios.find(x => x.username === sel)
    if (!u) return
    setSaving(true); setMsg(null)
    try {
      const r = await api.actualizarEstado(sel, !u.activo)
      setMsg({ ok: r.ok, texto: r.mensaje })
      await cargar()
    } catch (e) { setMsg({ ok: false, texto: e.message }) }
    finally { setSaving(false) }
  }

  const selObj = usuarios.find(u => u.username === sel)

  /* ──────────────────────────────────────────────────────── */
  return (
    <div className="min-h-full p-7">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <ShieldCheck size={19} style={{ color: '#a78bfa' }} />
              <h1 className="text-xl font-bold text-white">Administración</h1>
            </div>
            <p className="text-[12.5px]" style={{ color: '#6b82a0' }}>
              Gestión de usuarios, contraseñas y documentos
            </p>
          </div>
          <button onClick={cargar} disabled={cargando}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-medium transition"
            style={{ border: '1px solid #1e2a3d', background: '#0d1525', color: '#6b82a0' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#6b82a0'}>
            <RefreshCw size={13} className={cargando ? 'girando' : ''} />
            Actualizar
          </button>
        </div>

        {cargando && !stats ? (
          <div className="flex items-center gap-2 py-16" style={{ color: '#4a6080' }}>
            <Loader2 size={16} className="girando" />
            <span>Cargando panel de administración...</span>
          </div>
        ) : stats && (
          <>
            {/* Métricas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Metrica I={Users}         label="Total usuarios"    valor={stats.total_usuarios}      color="#a78bfa" />
              <Metrica I={ShieldCheck}   label="Activos"           valor={stats.usuarios_activos}    color="#34d399" />
              <Metrica I={MessageSquare} label="Conversaciones"    valor={stats.total_conversaciones} color="#f97316" />
              <Metrica I={TrendingUp}    label="Mensajes totales"  valor={stats.total_mensajes}      color="#818cf8" />
            </div>

            <div className="grid gap-6 items-start">

              {/* Tabla de usuarios */}
              <div className="rounded-2xl overflow-hidden"
                   style={{ background: '#0a0f1c', border: '1px solid #1e2a3d' }}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #1e2a3d' }}>
                  <p className="text-[13px] font-semibold text-white">Actividad por usuario</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1e2a3d' }}>
                        {['Usuario', 'Nombre', 'Rol', 'Conv.', 'Msgs.', 'Estado', 'Acciones'].map(h => (
                          <th key={h} className="text-left px-5 py-3 font-semibold"
                              style={{ color: '#4a6080' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.por_usuario.map((u, i) => {
                        const c  = ROL_ESTILO[u.rol] || ROL_ESTILO.usuario
                        const esSeleccionado = u.username === sel
                        return (
                          <tr key={u.username}
                              onClick={() => {
                                const full = usuarios.find(x => x.username === u.username)
                                if (full) elegir(full)
                              }}
                              className="cursor-pointer transition"
                              style={{
                                borderBottom: i < stats.por_usuario.length - 1 ? '1px solid #1e2a3d' : 'none',
                                background: esSeleccionado ? 'rgba(249,115,22,0.06)' : 'transparent',
                              }}
                              onMouseEnter={e => { if (!esSeleccionado) e.currentTarget.style.background = '#0d1525' }}
                              onMouseLeave={e => { if (!esSeleccionado) e.currentTarget.style.background = esSeleccionado ? 'rgba(249,115,22,0.06)' : 'transparent' }}>
                            <td className="px-5 py-3.5 font-medium"
                                style={{ color: esSeleccionado ? '#f97316' : '#e8edf5' }}>
                              {u.username}
                            </td>
                            <td className="px-5 py-3.5" style={{ color: '#c8d5e8' }}>{u.nombre}</td>
                            <td className="px-5 py-3.5">
                              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                                    style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                                {u.rol}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center text-white">{u.conversaciones}</td>
                            <td className="px-5 py-3.5 text-center text-white">{u.mensajes}</td>
                            <td className="px-5 py-3.5">
                              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                                    style={u.activo
                                      ? { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }
                                      : { background: 'rgba(239,68,68,0.1)',  color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                                {u.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <button onClick={() => { 
                                const full = usuarios.find(x => x.username === u.username)
                                if (full) { elegir(full); setModalAbierto(true) }
                              }}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition"
                                style={{ background: 'rgba(129,140,248,0.1)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.2)' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(129,140,248,0.18)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(129,140,248,0.1)'}>
                                <Pencil size={12} /> Editar
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Alerta de estado */}
              {msg && <Alerta msg={msg} />}
            </div>

            {/* Cierre del Fragment y condicional stats */}
          </>
        )}

        {/* ════ MODAL DE EDICIÓN (Overlay global) ════ */}
        {modalAbierto && selObj && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-12">
            <div className="rounded-2xl border w-full max-w-md p-6"
                 style={{ background: '#0a0f1c', borderColor: '#1e2a3d' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-white">Gestionar acceso</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#6b82a0' }}>Edita perfil, contraseña o estado</p>
                </div>
                <button onClick={() => setModalAbierto(false)} className="text-[12px]" style={{ color: '#6b82a0' }}>✕</button>
              </div>

              <form onSubmit={guardarPerfil} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre" />
                  <Campo label="Apellido" value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} placeholder="Apellido" />
                </div>
                <Campo label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@santospegasus.com" />
                <button type="submit" disabled={saving} className="btn-primario px-4 py-2.5 rounded-xl text-[12.5px] w-full">
                  {saving ? <><Loader2 size={13} className="girando" /> Guardando...</> : '💾 Guardar perfil'}
                </button>
              </form>

              <div style={{ borderTop: '1px solid #1e2a3d' }} className="pt-6">
                <form onSubmit={cambiarPass} className="space-y-4">
                  <Campo label="Contraseña actual" type="password" value={pass.actual} onChange={e => setPass(p => ({ ...p, actual: e.target.value }))} placeholder="••••••••" />
                  <Campo label="Nueva contraseña" type="password" value={pass.nueva} onChange={e => setPass(p => ({ ...p, nueva: e.target.value }))} placeholder="Mínimo 6 caracteres" />
                  <Campo label="Confirmar contraseña" type="password" value={pass.confirmar} onChange={e => setPass(p => ({ ...p, confirmar: e.target.value }))} placeholder="Repite la contraseña" />
                  <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-[12.5px] font-semibold transition" style={{ background: '#1e2a3d', color: '#818cf8' }}>
                    <KeyRound size={13} /> {saving ? 'Actualizando...' : 'Actualizar contraseña'}
                  </button>
                </form>
              </div>

              <div className="flex items-center gap-2 pt-6" style={{ borderTop: '1px solid #1e2a3d' }}>
                <button onClick={toggleEstado} disabled={saving} className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-[12px] font-medium transition"
                  style={{
                    background: selObj.activo ? 'rgba(239,68,68,0.09)' : 'rgba(16,185,129,0.09)',
                    border: selObj.activo ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(16,185,129,0.25)',
                    color: selObj.activo ? '#f87171' : '#34d399',
                  }}>
                  {selObj.activo ? <><ToggleRight size={13} /> Inactivar</> : <><ToggleLeft size={13} /> Activar</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
