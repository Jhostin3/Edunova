export function getScheduleValidation(form, cursoId) {
  const duplicateDays = form.largos.dias.filter((day) =>
    form.cortos.dias.includes(day)
  )

  const largos = validateGroup(form.largos, 'largos', { requireLunch: true })
  const cortos = validateGroup(form.cortos, 'cortos', { requireLunch: false })
  const criticalErrors = []

  if (!cursoId) {
    criticalErrors.push('Selecciona un curso antes de guardar la jornada semanal.')
  }

  if (!form.largos.dias.length && !form.cortos.dias.length) {
    criticalErrors.push('Selecciona al menos un dia para guardar la jornada semanal.')
  }

  if (duplicateDays.length) {
    criticalErrors.push('Un mismo dia no puede estar en dias largos y cortos.')
  }

  criticalErrors.push(...largos.errors, ...cortos.errors)

  const warnings = []
  if (
    form.largos.dias.length &&
    form.cortos.dias.length &&
    largos.durationMinutes !== null &&
    cortos.durationMinutes !== null &&
    largos.durationMinutes < cortos.durationMinutes
  ) {
    warnings.push(
      'La jornada larga parece tener menor duracion que la jornada corta. Verifique la configuracion.'
    )
  }

  return {
    criticalErrors,
    warnings,
    canSubmit: criticalErrors.length === 0,
    groups: {
      largos,
      cortos,
    },
  }
}

function validateGroup(group, label, { requireLunch }) {
  const errors = []
  const selected = group.dias.length > 0
  const durationMinutes = getDurationMinutes(group.hora_inicio, group.hora_fin)

  if (!selected) {
    return { errors, durationMinutes, valid: false }
  }

  if (!group.hora_inicio || !group.hora_fin) {
    errors.push(`Completa la hora de entrada y salida para los dias ${label}.`)
  } else if (durationMinutes === null) {
    errors.push('La hora de salida debe ser mayor a la hora de entrada.')
  }

  if (Number(group.tolerancia_minutos) < 0) {
    errors.push(`La tolerancia no puede ser negativa en los dias ${label}.`)
  }

  const recreoError = validateOptionalInterval(group, label, 'recreo', 'Recreo')
  if (recreoError) errors.push(recreoError)

  if (requireLunch) {
    if (!group.almuerzo_inicio || !group.almuerzo_fin) {
      errors.push('Completa inicio y fin de almuerzo para los dias largos.')
    } else {
      const almuerzoError = validateOptionalInterval(
        group,
        label,
        'almuerzo',
        'Almuerzo'
      )
      if (almuerzoError) errors.push(almuerzoError)
    }
  }

  return {
    errors,
    durationMinutes,
    valid: selected && errors.length === 0,
  }
}

function validateOptionalInterval(group, groupLabel, key, intervalLabel) {
  const start = group[`${key}_inicio`]
  const end = group[`${key}_fin`]

  if (!start && !end) return ''
  if (!start || !end) {
    return `${intervalLabel}: completa inicio y fin en los dias ${groupLabel}.`
  }

  if (end <= start) {
    return `${intervalLabel}: la hora de fin debe ser mayor que la hora de inicio en los dias ${groupLabel}.`
  }

  if (
    group.hora_inicio &&
    group.hora_fin &&
    (start < group.hora_inicio || end > group.hora_fin)
  ) {
    return `${intervalLabel}: debe estar dentro del rango general del dia en los dias ${groupLabel}.`
  }

  return ''
}

export function getDurationMinutes(start, end) {
  if (!start || !end) return null

  const startMinutes = timeToMinutes(start)
  const endMinutes = timeToMinutes(end)

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return null
  }

  return endMinutes - startMinutes
}

export function formatDuration(minutes) {
  if (minutes === null) return 'Duracion total: pendiente'

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (!hours) return `Duracion total: ${remainingMinutes}min`
  if (!remainingMinutes) return `Duracion total: ${hours}h`

  return `Duracion total: ${hours}h ${remainingMinutes}min`
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null

  return hours * 60 + minutes
}
