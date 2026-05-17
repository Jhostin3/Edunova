/**
 * Convierte errores de Supabase Auth en mensajes legibles para el usuario.
 * @param {import('@supabase/supabase-js').AuthError | Error | null} error
 * @returns {string}
 */
export function getLoginErrorMessage(error) {
  if (!error) return 'Ocurrió un error inesperado. Intenta de nuevo.'

  const message = error.message?.toLowerCase() ?? ''

  if (message.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }
  if (message.includes('email not confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesión.'
  }
  if (message.includes('invalid email')) {
    return 'El correo electrónico no es válido.'
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'No hay conexión o el servidor no responde. Revisa tu red.'
  }

  return error.message || 'No se pudo iniciar sesión. Verifica tus datos.'
}
