import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../contextos/AuthContexto'

export default function Login() {
  const { iniciarSesion } = useAuth()
  const navegar = useNavigate()

  const [usuario,     setUsuario]     = useState('')
  const [contrasena,  setContrasena]  = useState('')
  const [mostrarPass, setMostrarPass] = useState(false)
  const [error,       setError]       = useState('')
  const [cargando,    setCargando]    = useState(false)

  async function manejarEnvio(e) {
    e.preventDefault()
    if (!usuario.trim() || !contrasena) return
    setError('')
    setCargando(true)
    const resultado = await iniciarSesion(usuario.trim(), contrasena)
    if (resultado.ok) {
      navegar('/chat', { replace: true })
    } else {
      setError(resultado.mensaje)
      setCargando(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#07090f' }}>

      {/* Panel izquierdo */}
      <div className="hidden lg:flex w-[48%] flex-col justify-between px-14 py-12"
           style={{ background: 'linear-gradient(160deg,#0d1525 0%,#090d1a 60%,#07090f 100%)',
                    borderRight: '1px solid #1a2236' }}>
        <div className="flex items-center gap-3">
          <img src="/assets/Logo_Menu.png" alt="Santos Pegasus" width="38" height="38" className="shrink-0" />
          <div>
            <p className="text-[15px] font-bold text-white leading-none">Santos Pegasus</p>
            <p className="text-[11px] font-medium tracking-wide" style={{ color: '#f97316' }}>SOLUCIONES</p>
          </div>
        </div>

        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
               style={{ border: '1px solid rgba(249,115,22,0.2)', background: 'rgba(249,115,22,0.08)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            <span className="text-[11px] font-medium tracking-wide" style={{ color: '#fb923c' }}>
              AGENTE DE CONOCIMIENTO INTERNO
            </span>
          </div>
          <h1 className="text-[2.4rem] font-bold leading-[1.15] text-white">
            Consulta toda la<br />
            <span style={{ color: '#f97316' }}>documentación</span><br />
            de la empresa
          </h1>
          <p className="mt-5 text-[0.9rem] leading-relaxed max-w-xs" style={{ color: '#8899b4' }}>
            Encuentra respuestas claras sobre procesos, arquitectura y guías técnicas en segundos.
          </p>
          <div className="mt-8 space-y-2">
            {[
              'Manual de Onboarding para Nuevos Desarrolladores',
              'Guía Oficial de Ingeniería Backend',
              'Protocolo de Respuesta a Incidentes',
              'Arquitectura de Microservicios',
              'Guía Oficial de Ingeniería Frontend',
            ].map(doc => (
              <div key={doc} className="flex items-center gap-2.5 text-[12px]" style={{ color: '#6b7fa0' }}>
                <span style={{ color: '#f97316' }}>›</span>{doc}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px]" style={{ color: '#2a3550' }}>
          Santos Pegasus Soluciones · {new Date().getFullYear()} · Plataforma interna
        </p>
      </div>

      {/* Panel derecho */}
      <div className="flex flex-1 items-center justify-center px-8" style={{ background: '#0b0e18' }}>
        <div className="w-full max-w-[360px]">

          <div className="flex lg:hidden items-center gap-2.5 mb-10">
            <img src="/assets/Logo_Menu.png" alt="Santos Pegasus" width="32" height="32" className="shrink-0" />
            <div>
              <p className="text-sm font-bold text-white leading-none">Santos Pegasus</p>
              <p className="text-[10px] font-medium tracking-wide" style={{ color: '#f97316' }}>SOLUCIONES</p>
            </div>
          </div>

          <h2 className="text-[1.55rem] font-bold text-white">Bienvenido de nuevo</h2>
          <p className="mt-1 text-[0.82rem]" style={{ color: '#8899b4' }}>
            Inicia sesión para consultar el conocimiento de tu empresa
          </p>

          <form onSubmit={manejarEnvio} className="mt-8 space-y-4" noValidate>
            <div className="space-y-1.5">
              <label className="text-[0.73rem] font-semibold uppercase tracking-wider" style={{ color: '#8899b4' }}>
                Usuario
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#4a5a7a' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </span>
                <input type="text" value={usuario}
                  onChange={e => { setUsuario(e.target.value); setError('') }}
                  placeholder="admin"
                  autoComplete="username" required
                  style={{ background: '#0f1320', border: '1px solid #1a2236', color: '#e8edf5' }}
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-[0.85rem] placeholder-[#4a5a7a]
                             focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[0.73rem] font-semibold uppercase tracking-wider" style={{ color: '#8899b4' }}>
                Contraseña
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#4a5a7a' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input type={mostrarPass ? 'text' : 'password'} value={contrasena}
                  onChange={e => { setContrasena(e.target.value); setError('') }}
                  placeholder="••••••••••"
                  autoComplete="current-password" required
                  style={{ background: '#0f1320', border: '1px solid #1a2236', color: '#e8edf5' }}
                  className="w-full rounded-xl py-3 pl-10 pr-11 text-[0.85rem] placeholder-[#4a5a7a]
                             focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition"
                />
                <button type="button" onClick={() => setMostrarPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition hover:text-white"
                  style={{ color: '#4a5a7a' }}>
                  {mostrarPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-[0.78rem]"
                   style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={cargando || !usuario || !contrasena}
              className="btn-primario w-full py-3 mt-1 text-[0.88rem]">
              {cargando ? <><Loader2 size={15} className="girando" /> Verificando...</> : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 rounded-xl p-4 text-[11px] space-y-1"
               style={{ background: '#0f1320', border: '1px solid #1a2236' }}>
            <p className="font-semibold" style={{ color: '#8899b4' }}>Credenciales de acceso:</p>
            <p style={{ color: '#6b7fa0' }}>admin / Admin2024! <span className="text-orange-500">(Administrador)</span></p>
            <p style={{ color: '#6b7fa0' }}>backend / Backend2024! <span className="text-orange-500">(Backend)</span></p>
            <p style={{ color: '#6b7fa0' }}>frontend / Frontend2024! <span className="text-orange-500">(Frontend)</span></p>
            <p style={{ color: '#6b7fa0' }}>fullstack / Fullstack2024! <span className="text-orange-500">(Fullstack)</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
