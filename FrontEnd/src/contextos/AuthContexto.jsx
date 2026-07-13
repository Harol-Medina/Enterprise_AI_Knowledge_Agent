import { createContext, useContext, useState } from 'react'
import { api } from '../servicios/api'

const AuthContexto = createContext(null)

export function AuthProveedor({ children }) {
  const [sesion, setSesion] = useState(() => {
    const guardado = sessionStorage.getItem('sps_sesion')
    return guardado ? JSON.parse(guardado) : null
  })

  // Autentica contra el backend real
  async function iniciarSesion(username, contrasena) {
    try {
      const datos = await api.login(username, contrasena)
      if (datos.ok) {
        const s = {
          usuario:  datos.username,
          nombre:   datos.nombre,
          rol:      datos.rol,
        }
        setSesion(s)
        sessionStorage.setItem('sps_sesion', JSON.stringify(s))
        return { ok: true }
      }
      return { ok: false, mensaje: datos.mensaje || 'Credenciales incorrectas' }
    } catch {
      return { ok: false, mensaje: 'No se pudo conectar con el servidor' }
    }
  }

  function cerrarSesion() {
    setSesion(null)
    sessionStorage.removeItem('sps_sesion')
  }

  return (
    <AuthContexto.Provider value={{
      usuario:  sesion?.usuario  || null,
      nombre:   sesion?.nombre   || null,
      rol:      sesion?.rol      || null,
      esAdmin:  sesion?.rol === 'admin',
      iniciarSesion,
      cerrarSesion,
    }}>
      {children}
    </AuthContexto.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContexto)
}
