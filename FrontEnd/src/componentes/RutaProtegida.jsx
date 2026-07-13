import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '../contextos/AuthContexto'
import Sidebar from './Sidebar'

/**
 * Layout protegido. Pasa el estado de conversación activa
 * al Sidebar y al Chat vía contexto de estado local.
 */
export default function RutaProtegida() {
  const { usuario } = useAuth()
  const [convActiva, setConvActiva] = useState(null)
  const [sidebarAbierto, setSidebarAbierto] = useState(true)
  const [actualizarHistorial, setActualizarHistorial] = useState(0)

  if (!usuario) return <Navigate to="/login" replace />

  const manejarActualizarHistorial = () => {
    setActualizarHistorial(prev => prev + 1)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-fondo">
      <Sidebar
        convActiva={convActiva}
        onSeleccionarConv={setConvActiva}
        onNuevaConv={setConvActiva}
        sidebarAbierto={sidebarAbierto}
        onToggleSidebar={() => setSidebarAbierto(v => !v)}
        actualizarHistorial={actualizarHistorial}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header con botón toggle */}
        <div className="flex items-center px-6 py-4 shrink-0 border-b" style={{ borderColor: '#1e2a3d', background: '#0b0e18' }}>
          <button
            onClick={() => setSidebarAbierto(v => !v)}
            className="flex items-center justify-center rounded-lg p-2 transition"
            style={{ color: '#4a6080' }}
            onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
            onMouseLeave={e => e.currentTarget.style.color = '#4a6080'}
            title={sidebarAbierto ? 'Contraer' : 'Expandir'}>
            {sidebarAbierto ? <ChevronDown size={18} className="rotate-90" /> : <ChevronDown size={18} className="-rotate-90" />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Outlet context={{ convActiva, setConvActiva, onActualizarHistorial: manejarActualizarHistorial }} />
        </div>
      </main>
    </div>
  )
}
