/** Slug de rol en BD → ruta del dashboard */
const DASHBOARD_BY_ROLE = {
  admin_rectorado: '/admin/dashboard',
  coordinador_clubes: '/coordinador/dashboard',
  guardia: '/guardia',
  estudiante: '/estudiante',
}

/**
 * @param {string | null | undefined} roleNombre
 * @returns {string | null} null si el rol no tiene dashboard definido
 */
export function getDashboardPathForRole(roleNombre) {
  if (!roleNombre) return null
  return DASHBOARD_BY_ROLE[roleNombre] ?? null
}

export const ROLE_NAMES = Object.freeze(Object.keys(DASHBOARD_BY_ROLE))
