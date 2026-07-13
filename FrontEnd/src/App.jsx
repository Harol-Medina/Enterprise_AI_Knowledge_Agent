import { Navigate, Route, Routes } from 'react-router-dom'
import RutaProtegida from './componentes/RutaProtegida'
import Login        from './paginas/Login'
import Dashboard    from './paginas/Dashboard'
import Chat         from './paginas/Chat'
import Documentos   from './paginas/Documentos'
import IndiceVectorial from './paginas/IndiceVectorial'
import Perfil       from './paginas/Perfil'
import Admin        from './paginas/Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RutaProtegida />}>
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/chat"       element={<Chat />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/indice"     element={<IndiceVectorial />} />
        <Route path="/perfil"     element={<Perfil />} />
        <Route path="/admin"      element={<Admin />} />
      </Route>

      <Route path="/"  element={<Navigate to="/chat"      replace />} />
      <Route path="*"  element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
