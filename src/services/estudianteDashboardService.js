import { supabase } from './supabaseClient'
import {
  buildGlobalTemplateRows,
  DIAS_SEMANA_LABELS,
  getVisibleDaysFromHorariosBase,
  getHorariosBaseByCurso,
  normalizeTimeString,
} from './horarioMateriasService'

const DIAS_SEMANA = DIAS_SEMANA_LABELS.map((day) => ({
  value: Number(day.value),
  label: day.label,
}))

export function getDiaSemanaLabel(diaSemana) {
  return DIAS_SEMANA.find((day) => Number(day.value) === Number(diaSemana))?.label ?? '-'
}

export function formatDate(value) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatTime(value) {
  if (!value) return '-'

  const [hours = '00', minutes = '00'] = String(value).split(':')
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
}

function buildClubLabel(club) {
  return club?.nombre ? `Club: ${club.nombre}` : 'Club'
}

async function getEstudianteBaseData(userId) {
  const { data: estudiante, error: estudianteError } = await supabase
    .from('estudiantes')
    .select(
      `
      id,
      user_id,
      nombres,
      apellidos,
      tipo_identificacion,
      cedula,
      correo_institucional,
      cuenta_creada,
      fecha_nacimiento,
      genero,
      direccion,
      estado
    `
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (estudianteError) {
    return { data: null, error: estudianteError }
  }

  if (!estudiante) {
    return {
      data: null,
      error: new Error('No se encontro un estudiante asociado a esta cuenta.'),
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      `
      id,
      email,
      telefono
    `
    )
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    return { data: null, error: profileError }
  }

  const { data: curso, error: cursoError } = await supabase
    .from('v_estudiante_curso_actual')
    .select(
      `
      estudiante_id,
      curso_id,
      curso_nombre,
      nivel,
      paralelo,
      especialidad,
      estado
    `
    )
    .eq('estudiante_id', estudiante.id)
    .maybeSingle()

  if (cursoError) {
    return { data: null, error: cursoError }
  }

  return {
    data: {
      estudiante: {
        ...estudiante,
        telefono: profile?.telefono || null,
      },
      curso: curso ?? null,
      profile: profile ?? null,
    },
    error: null,
  }
}

export async function updateStudentPassword({
  email,
  currentPassword,
  nextPassword,
}) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase no esta configurado.'),
    }
  }

  const trimmedEmail = String(email ?? '').trim()

  if (!trimmedEmail) {
    return {
      data: null,
      error: new Error('No se encontro el correo institucional del estudiante.'),
    }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password: currentPassword,
  })

  if (signInError) {
    return {
      data: null,
      error: new Error('La contrasena actual es incorrecta.'),
    }
  }

  const { data, error } = await supabase.auth.updateUser({
    password: nextPassword,
  })

  return { data, error }
}

export async function getEstudianteProfileData(userId) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase no esta configurado.'),
    }
  }

  return getEstudianteBaseData(userId)
}

export async function updateEstudianteProfile(userId, estudianteId, payload) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase no esta configurado.'),
    }
  }

  const estudiantePayload = {
    nombres: payload.nombres?.trim() ?? '',
    apellidos: payload.apellidos?.trim() ?? '',
    tipo_identificacion: payload.tipo_identificacion || 'cedula_ecuatoriana',
    cedula: payload.cedula?.trim() ?? '',
    fecha_nacimiento: payload.fecha_nacimiento || null,
    genero: payload.genero || null,
    direccion: payload.direccion?.trim() || null,
  }

  const { data: estudiante, error: estudianteError } = await supabase
    .from('estudiantes')
    .update(estudiantePayload)
    .eq('id', estudianteId)
    .eq('user_id', userId)
    .select(
      `
      id,
      user_id,
      nombres,
      apellidos,
      tipo_identificacion,
      cedula,
      correo_institucional,
      cuenta_creada,
      fecha_nacimiento,
      genero,
      direccion,
      estado
    `
    )
    .single()

  if (estudianteError) {
    return { data: null, error: estudianteError }
  }

  const telefonoPayload = {
    telefono: payload.telefono?.trim() || null,
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(telefonoPayload)
    .eq('id', userId)

  if (profileError) {
    return { data: null, error: profileError }
  }

  return {
    data: {
      ...estudiante,
      telefono: telefonoPayload.telefono,
    },
    error: null,
  }
}

function timeToMinutes(timeValue) {
  const [hours = '0', minutes = '0'] = String(timeValue ?? '').split(':')
  return Number(hours) * 60 + Number(minutes)
}

function dayHasPause(daySchedule, row) {
  if (row.kind === 'recreo') {
    return (
      normalizeTimeString(daySchedule.recreo_inicio) === row.hora_inicio &&
      normalizeTimeString(daySchedule.recreo_fin) === row.hora_fin
    )
  }

  if (row.kind === 'almuerzo') {
    return (
      normalizeTimeString(daySchedule.almuerzo_inicio) === row.hora_inicio &&
      normalizeTimeString(daySchedule.almuerzo_fin) === row.hora_fin
    )
  }

  return false
}

function daySupportsMateriaRow(daySchedule, row) {
  const dayStart = timeToMinutes(normalizeTimeString(daySchedule.hora_inicio))
  const dayEnd = timeToMinutes(normalizeTimeString(daySchedule.hora_fin))
  const rowStart = row.start
  const rowEnd = row.end

  if (rowStart < dayStart || rowEnd > dayEnd) {
    return false
  }

  const pauses = [
    daySchedule.recreo_inicio && daySchedule.recreo_fin
      ? {
          start: timeToMinutes(normalizeTimeString(daySchedule.recreo_inicio)),
          end: timeToMinutes(normalizeTimeString(daySchedule.recreo_fin)),
        }
      : null,
    daySchedule.almuerzo_inicio && daySchedule.almuerzo_fin
      ? {
          start: timeToMinutes(normalizeTimeString(daySchedule.almuerzo_inicio)),
          end: timeToMinutes(normalizeTimeString(daySchedule.almuerzo_fin)),
        }
      : null,
  ].filter(Boolean)

  return !pauses.some((pause) => rowStart < pause.end && rowEnd > pause.start)
}

function buildEstudianteHorarioRows(globalRows, horariosBase, horario) {
  const materiasByDayAndTime = new Map(
    (horario ?? []).map((item) => {
      const horaInicio = normalizeTimeString(item.hora_inicio)
      const horaFin = normalizeTimeString(item.hora_fin)
      return [
        `${item.dia_semana}-${horaInicio}-${horaFin}`,
        {
          ...item,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
        },
      ]
    })
  )

  const rows = globalRows.map((row) => ({
    id: row.row_id,
    rowLabel: row.label,
    kind: row.kind,
    bloque_numero: row.bloque_numero,
    hora_inicio: row.hora_inicio,
    hora_fin: row.hora_fin,
    cells: {},
  }))

  const rowById = new Map(rows.map((row) => [row.id, row]))

  for (const daySchedule of horariosBase) {
    for (const row of globalRows) {
      const targetRow = rowById.get(row.row_id)
      const dayKey = String(daySchedule.dia_semana)

      if (row.kind === 'recreo' || row.kind === 'almuerzo') {
        if (!dayHasPause(daySchedule, row)) continue

        targetRow.cells[dayKey] = {
          kind: row.kind,
          label: row.label,
        }
        continue
      }

      if (!daySupportsMateriaRow(daySchedule, row)) continue

      const materia =
        materiasByDayAndTime.get(
          `${daySchedule.dia_semana}-${row.hora_inicio}-${row.hora_fin}`
        ) ?? null

      targetRow.cells[dayKey] = {
        kind: 'materia',
        value: materia?.materia_nombre ?? '',
      }
    }
  }

  console.log('[estudiante-dashboard] visible_days_detected', horariosBase)
  console.log('[estudiante-dashboard] global_rows', globalRows)
  console.log('[estudiante-dashboard] final_horario_rows', rows)

  return rows
}

function buildClubRows(clubes) {
  const rowsMap = new Map()

  for (const club of clubes ?? []) {
    const horaInicio = normalizeTimeString(club.hora_inicio)
    const horaFin = normalizeTimeString(club.hora_fin)
    const rowKey = `club-${club.club_id}-${horaInicio}-${horaFin}`

    if (!rowsMap.has(rowKey)) {
      rowsMap.set(rowKey, {
        id: rowKey,
        rowLabel: buildClubLabel(club),
        kind: 'club',
        bloque_numero: null,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        start: timeToMinutes(horaInicio),
        end: timeToMinutes(horaFin),
        cells: {},
      })
    }

    const targetRow = rowsMap.get(rowKey)
    targetRow.cells[String(club.dia_semana)] = {
      kind: 'club',
      value: buildClubLabel(club),
    }
  }

  return Array.from(rowsMap.values())
}

function buildVisibleDays(horariosBase, clubes) {
  const visibleDayMap = new Map()

  for (const day of getVisibleDaysFromHorariosBase(horariosBase)) {
    visibleDayMap.set(Number(day.value), {
      value: Number(day.value),
      label: day.label,
    })
  }

  for (const club of clubes ?? []) {
    const dayNumber = Number(club.dia_semana)
    if (!visibleDayMap.has(dayNumber)) {
      visibleDayMap.set(dayNumber, {
        value: dayNumber,
        label: getDiaSemanaLabel(dayNumber),
      })
    }
  }

  return Array.from(visibleDayMap.values()).sort((a, b) => a.value - b.value)
}

function combineHorarioRows(academicRows, clubRows) {
  const kindOrder = {
    materia: 1,
    recreo: 2,
    almuerzo: 3,
    club: 4,
  }

  return [...academicRows, ...clubRows].sort((a, b) => {
    const startDiff = timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio)
    if (startDiff !== 0) return startDiff

    const endDiff = timeToMinutes(a.hora_fin) - timeToMinutes(b.hora_fin)
    if (endDiff !== 0) return endDiff

    return (kindOrder[a.kind] ?? 99) - (kindOrder[b.kind] ?? 99)
  })
}

async function getEstudianteClubes(estudianteId) {
  const { data, error } = await supabase
    .from('estudiante_club')
    .select(
      `
      id,
      estudiante_id,
      club_id,
      activo,
      club:clubes (
        id,
        nombre,
        hora_inicio,
        hora_fin,
        estado
      ),
      dias:estudiante_club_dias (
        id,
        dia_semana
      )
    `
    )
    .eq('estudiante_id', estudianteId)
    .eq('activo', true)

  if (error) {
    return { data: [], error }
  }

  const clubes = (data ?? []).map((item) => ({
    id: item.id,
    club_id: item.club?.id ?? item.club_id,
    nombre: item.club?.nombre ?? '',
    hora_inicio: item.club?.hora_inicio ?? null,
    hora_fin: item.club?.hora_fin ?? null,
    dias: (item.dias ?? []).map((day) => Number(day.dia_semana)).sort((a, b) => a - b),
  })).map((club) => ({
    ...club,
    dias_labels: club.dias.map((day) => getDiaSemanaLabel(day)),
  }))

  const clubSchedule = clubes.flatMap((club) =>
    club.dias.map((dia) => ({
      club_id: club.club_id,
      nombre: club.nombre,
      dia_semana: dia,
      hora_inicio: club.hora_inicio,
      hora_fin: club.hora_fin,
    }))
  )

  return {
    data: {
      clubes,
      clubSchedule,
    },
    error: null,
  }
}

export async function getEstudianteDashboardData(userId) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase no esta configurado.'),
    }
  }

  const { data: baseData, error: baseError } = await getEstudianteBaseData(userId)

  if (baseError || !baseData?.estudiante) {
    return { data: null, error: baseError }
  }

  const estudianteId = baseData.estudiante.id

  const [horarioResult, asistenciasResult, clubesResult] = await Promise.all([
    supabase
      .from('v_horario_estudiante')
      .select(
        `
        estudiante_id,
        curso_id,
        dia_semana,
        bloque_numero,
        hora_inicio,
        hora_fin,
        materia_nombre
      `
      )
      .eq('estudiante_id', estudianteId)
      .order('dia_semana', { ascending: true })
      .order('bloque_numero', { ascending: true }),
    supabase
      .from('v_asistencias_estudiante')
      .select(
        `
        estudiante_id,
        fecha,
        hora_entrada,
        hora_salida,
        estado_entrada,
        correo_entrada_enviado,
        correo_salida_enviado
      `
      )
      .eq('estudiante_id', estudianteId)
      .order('fecha', { ascending: false })
      .limit(10),
    getEstudianteClubes(estudianteId),
  ])

  if (horarioResult.error) return { data: null, error: horarioResult.error }
  if (asistenciasResult.error) return { data: null, error: asistenciasResult.error }
  if (clubesResult.error) return { data: null, error: clubesResult.error }

  const cursoActual = baseData.curso ?? null
  const horariosBaseResult = cursoActual?.curso_id
    ? await getHorariosBaseByCurso(cursoActual.curso_id)
    : { data: [], error: null }

  if (horariosBaseResult.error) {
    return { data: null, error: horariosBaseResult.error }
  }

  const horario = horarioResult.data ?? []
  const asistencias = asistenciasResult.data ?? []
  const clubes = clubesResult.data?.clubes ?? []
  const clubSchedule = clubesResult.data?.clubSchedule ?? []
  const horariosBase = horariosBaseResult.data ?? []
  const visibleDays = buildVisibleDays(horariosBase, clubSchedule)
  const globalRows = buildGlobalTemplateRows(horariosBase)
  const academicRows = buildEstudianteHorarioRows(globalRows, horariosBase, horario)
  const clubRows = buildClubRows(clubSchedule)
  const horarioRows = combineHorarioRows(academicRows, clubRows)

  return {
    data: {
      estudiante: baseData.estudiante,
      curso: cursoActual,
      profile: baseData.profile,
      horario,
      horarioRows,
      visibleDays,
      asistencias,
      clubes,
    },
    error: null,
  }
}
