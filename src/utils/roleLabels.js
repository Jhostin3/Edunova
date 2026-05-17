const ROLE_LABELS = {
  admin_rectorado: 'Administrador / Rectorado',
  coordinador_clubes: 'Coordinador de clubes',
  guardia: 'Guardia',
  estudiante: 'Estudiante',
}

export function getRoleLabel(roleName) {
  if (!roleName) return 'Sin rol'
  return ROLE_LABELS[roleName] ?? roleName
}

export { ROLE_LABELS }
