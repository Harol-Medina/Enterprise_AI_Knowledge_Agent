/**
 * Capa de servicio — todas las llamadas al backend pasan por aquí.
 */
const BASE = import.meta.env.VITE_API_URL || ''

async function peticion(ruta, opciones = {}) {
  const respuesta = await fetch(`${BASE}/api${ruta}`, {
    headers: { 'Content-Type': 'application/json', ...opciones.headers },
    ...opciones,
  })
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}))
    throw new Error(error.detail || `Error ${respuesta.status}`)
  }
  return respuesta.json()
}

export const api = {
  // ── Sistema ──────────────────────────────────────────────────
  salud:       () => peticion('/salud'),
  validarApi:  () => peticion('/validar-api'),
  estadoIndice:() => peticion('/estado-indice'),

  // ── Documentos ───────────────────────────────────────────────
  indexar: (forzar = false) =>
    peticion('/indexar', { method: 'POST', body: JSON.stringify({ forzar_reindexacion: forzar }) }),
  listarDocumentos: (username) => peticion(`/documentos/listar/${username}`),
  uploadDocumento: async (username, file) => {
    const url = `${BASE}/api/documentos/upload`
    const form = new FormData()
    form.append('username', username)
    form.append('file', file)
    const resp = await fetch(url, { method: 'POST', body: form })
    if (!resp.ok) throw new Error(`Upload failed ${resp.status}`)
    return resp.json()
  },

  // ── Agente RAG ───────────────────────────────────────────────
  consultar: (pregunta, idConversacion = null, username = null) =>
    peticion('/agente/consultar', {
      method: 'POST',
      body: JSON.stringify({ pregunta, id_conversacion: idConversacion, username }),
    }),

  // ── Auth ─────────────────────────────────────────────────────
  login: (username, contrasena) =>
    peticion('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, contrasena }),
    }),

  // ── Usuarios ─────────────────────────────────────────────────
  listarUsuarios: () => peticion('/usuarios'),
  obtenerUsuario: (username) => peticion(`/usuarios/${username}`),

  cambiarContrasena: (username, contraseniaActual, nuevaContrasenia) =>
    peticion('/usuarios/cambiar-contrasena', {
      method: 'POST',
      body: JSON.stringify({
        username,
        contrasena_actual: contraseniaActual,
        nueva_contrasena: nuevaContrasenia,
      }),
    }),

  actualizarPerfil: (username, nombre, apellido, email) =>
    peticion('/usuarios/actualizar-perfil', {
      method: 'POST',
      body: JSON.stringify({ username, nombre, apellido, email }),
    }),

  actualizarEstado: (username, activo) =>
    peticion('/usuarios/actualizar-estado', {
      method: 'POST',
      body: JSON.stringify({ username, activo }),
    }),

  // ── Historial de chat ────────────────────────────────────────
  crearConversacion: (username, titulo = 'Nueva conversación') =>
    peticion('/chat/conversacion', {
      method: 'POST',
      body: JSON.stringify({ username, titulo }),
    }),

  obtenerHistorial: (username) => peticion(`/chat/historial/${username}`),

  obtenerConversacion: (username, convId) =>
    peticion(`/chat/conversacion/${username}/${convId}`),

  eliminarConversacion: (username, convId) =>
    peticion(`/chat/conversacion/${username}/${convId}`, { method: 'DELETE' }),

  // ── Admin ────────────────────────────────────────────────────
  estadisticasAdmin: () => peticion('/admin/estadisticas'),
}
