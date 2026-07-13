import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Plus, FileText, Database,
  LogOut, Trash2, ChevronDown, ChevronRight, User, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../contextos/AuthContexto'
import { api } from '../servicios/api'

export default function Sidebar({ convActiva, onSeleccionarConv, onNuevaConv, sidebarAbierto = true, onToggleSidebar, actualizarHistorial = 0 }) {
  const { usuario, nombre, esAdmin, cerrarSesion } = useAuth()
  const navegar = useNavigate()
  const [conversaciones, setConversaciones] = useState([])
  const [histAbierto, setHistAbierto] = useState(true)
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false)

  const iniciales = (nombre || usuario || 'U').slice(0, 2).toUpperCase()

  useEffect(() => { if (usuario) cargarHistorial() }, [usuario])

  // Recargar historial cuando se actualiza desde Chat
  useEffect(() => { if (usuario && actualizarHistorial > 0) cargarHistorial() }, [actualizarHistorial, usuario])

  useEffect(() => {
    if (!menuPerfilAbierto) return
    const cerrar = (event) => {
      if (event.target instanceof Element && !event.target.closest('[data-perfil-menu]')) {
        setMenuPerfilAbierto(false)
      }
    }
    document.addEventListener('click', cerrar)
    return () => document.removeEventListener('click', cerrar)
  }, [menuPerfilAbierto])

  async function cargarHistorial() {
    try {
      const d = await api.obtenerHistorial(usuario)
      setConversaciones(d.conversaciones || [])
    } catch { /* silencioso */ }
  }

  async function nuevaConversacion() {
    try {
      const d = await api.crearConversacion(usuario)
      await cargarHistorial()
      if (onNuevaConv) onNuevaConv(d.id_conversacion)
      navegar('/chat')
    } catch { /* silencioso */ }
  }

  async function eliminar(e, id) {
    e.stopPropagation()
    try {
      await api.eliminarConversacion(usuario, id)
      await cargarHistorial()
      if (convActiva === id && onSeleccionarConv) onSeleccionarConv(null)
    } catch { /* silencioso */ }
  }

  /* Navegación principal — sin /ajustes */
  const NAV = [
    { a: '/dashboard',  I: LayoutDashboard, label: 'Dashboard'       },
    { a: '/documentos', I: FileText,        label: 'Documentos'       },
    ...(esAdmin ? [{ a: '/indice', I: Database, label: 'Índice vectorial' }] : []),
    ...(esAdmin ? [{ a: '/admin', I: ShieldCheck, label: 'Administración' }] : []),
  ]

  const ancho = sidebarAbierto ? 'w-[220px]' : 'w-[70px]'

  return (
    <aside className={`flex h-screen ${ancho} flex-col shrink-0 transition-all duration-300`}
           style={{ background: '#080d19', borderRight: '1px solid #1e2a3d' }}>
      {/* Logo */}
      <div className={`flex items-center justify-center py-[18px] shrink-0 ${sidebarAbierto ? 'px-3' : 'px-2'}`} style={{ borderBottom: '1px solid #1e2a3d' }}>
        <div className="flex items-center gap-2.5 min-w-0 justify-center">
          {sidebarAbierto ? (
            <>
              <img src="/assets/Logo_Menu.png" alt="Santos Pegasus" width="32" height="32" className="shrink-0" style={{ objectFit: 'contain' }} />
              <div className="min-w-0 flex flex-col">
                <p className="text-[13px] font-bold text-white leading-tight">Santos Pegasus</p>
                <p className="text-[10px] font-bold tracking-[0.12em] mt-0.5" style={{ color: '#f97316' }}>SOLUCIONES</p>
              </div>
            </>
          ) : (
            <img src="/assets/Logo_Menu.png" alt="SP" width="40" height="40" className="shrink-0" style={{ objectFit: 'contain' }} />
          )}
        </div>
      </div>

      {/* Navegación */}
      <nav className="px-3 pt-4 pb-2 space-y-0.5 shrink-0">
        {sidebarAbierto && (
          <p className="px-3 mb-2 text-[9.5px] font-semibold uppercase tracking-[0.2em]"
             style={{ color: '#2e4060' }}>
            Plataforma
          </p>
        )}
        {NAV.map(({ a, I, label }) => (
          <NavLink key={a} to={a}
            className={({ isActive }) => `nav-item ${isActive ? 'activo' : ''}`}
            title={sidebarAbierto ? '' : label}>
            <I size={15} strokeWidth={1.8} className="shrink-0" />
            {sidebarAbierto && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Historial de conversaciones */}
      {sidebarAbierto && (
        <div className="flex-1 min-h-0 flex flex-col px-3 pb-2 overflow-hidden">
          <button
            onClick={() => setHistAbierto(v => !v)}
            className="flex items-center justify-between px-3 py-1.5 mb-1 w-full transition"
            style={{ color: '#2e4060' }}
            onMouseEnter={e => e.currentTarget.style.color = '#4a6080'}
            onMouseLeave={e => e.currentTarget.style.color = '#2e4060'}>
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.2em]">Conversaciones</span>
            {histAbierto ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>

          {histAbierto && (
            <>
              <button onClick={nuevaConversacion}
                className="flex items-center gap-2 w-full rounded-xl px-3 py-2 mb-1 text-[12px] transition"
                style={{ border: '1px dashed #1e2a3d', color: '#4a6080' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'; e.currentTarget.style.color = '#f97316' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2a3d'; e.currentTarget.style.color = '#4a6080' }}>
                <Plus size={12} />
                <span>Nueva conversación</span>
              </button>

            <div className="flex-1 overflow-y-auto space-y-0.5">
              {conversaciones.length === 0 ? (
                <p className="px-3 py-2 text-[11px]" style={{ color: '#2e4060' }}>
                  Sin conversaciones aún
                </p>
              ) : conversaciones.map(c => (
                <div key={c.id}
                  onClick={() => { navegar('/chat'); if (onSeleccionarConv) onSeleccionarConv(c.id) }}
                  className="group flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition"
                  style={{
                    background: convActiva === c.id ? 'rgba(249,115,22,0.09)' : 'transparent',
                    border: `1px solid ${convActiva === c.id ? 'rgba(249,115,22,0.22)' : 'transparent'}`,
                  }}
                  onMouseEnter={e => { if (convActiva !== c.id) e.currentTarget.style.background = '#0d1525' }}
                  onMouseLeave={e => { if (convActiva !== c.id) e.currentTarget.style.background = 'transparent' }}>
                  <MessageSquare size={11} className="shrink-0"
                    style={{ color: convActiva === c.id ? '#f97316' : '#2e4060' }} />
                  <span className="flex-1 truncate text-[12px]"
                        style={{ color: convActiva === c.id ? '#f97316' : '#7a90b0' }}>
                    {c.titulo}
                  </span>
                  <button onClick={e => eliminar(e, c.id)}
                    className="hidden group-hover:flex shrink-0 rounded p-0.5 transition"
                    style={{ color: '#2e4060' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = '#2e4060'}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      )}

      {/* Footer — usuario con Perfil y Salir */}
      <div className="shrink-0 px-3 py-3 mt-auto" style={{ borderTop: '1px solid #1e2a3d' }}>
        <div className="relative" data-perfil-menu>
          <button
            onClick={() => setMenuPerfilAbierto(v => !v)}
            className={`flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition ${
              sidebarAbierto ? '' : 'justify-center'
            }`}
            style={{ background: '#0d1525', borderColor: menuPerfilAbierto ? 'rgba(249,115,22,0.3)' : '#1e2a3d' }}
            title={sidebarAbierto ? '' : `${nombre || usuario}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                 style={{ background: esAdmin ? '#7c3aed' : '#f97316' }}>
              {iniciales}
            </div>
            {sidebarAbierto && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-white">{nombre || usuario}</p>
                  <p className="mt-0.5 text-[10px]" style={{ color: esAdmin ? '#a78bfa' : '#7a90b0' }}>
                    {esAdmin ? 'Administrador' : 'Colaborador'}
                  </p>
                </div>
                {menuPerfilAbierto ? <ChevronDown size={14} className="shrink-0 rotate-180" style={{ color: '#7a90b0' }} /> : <ChevronDown size={14} className="shrink-0" style={{ color: '#7a90b0' }} />}
              </>
            )}
          </button>

          {menuPerfilAbierto && sidebarAbierto && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border p-1.5 shadow-2xl"
                 style={{ background: '#0d1525', borderColor: '#1e2a3d' }}>
              <button
                onClick={() => { setMenuPerfilAbierto(false); navegar('/perfil') }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition"
                style={{ color: '#d7e1ee' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d7e1ee' }}>
                <User size={14} strokeWidth={1.8} />
                <span>Perfil</span>
              </button>
              <button
                onClick={() => { setMenuPerfilAbierto(false); cerrarSesion(); navegar('/login', { replace: true }) }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition"
                style={{ color: '#fda4af' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#f87171' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fda4af' }}>
                <LogOut size={14} strokeWidth={1.8} />
                <span>Salir</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
