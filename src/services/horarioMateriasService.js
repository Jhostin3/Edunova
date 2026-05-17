import { supabase } from './supabaseClient'
import { getPeriodoActivo } from './periodoService'

export const BLOCK_DURATION_MINUTES = 40

export const DIAS_SEMANA_LABELS = [
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miercoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sabado' },
  { value: '7', label: 'Domingo' },
]

export function getDiaSemanaLabel(diaSemana) {
  return (
    DIAS_SEMANA_LABELS.find(
      (item) => String(item.value) === String(diaSemana)
    )?.label ?? '-'
  )
}

export function normalizeTimeString(timeValue) {
  if (!timeValue) return ''

  const [hours = '00', minutes = '00'] = String(timeValue).split(':')
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function buildCursoLabel(curso) {
  return (
    curso.nombre ||
    [curso.nivel, curso.paralelo, curso.especialidad].filter(Boolean).join(' ')
  )
}

function mapHorarioMateriaError(error) {
  const message =
    error?.message ?? 'Ocurrio un error al guardar el horario visual.'

  if (
    message.includes('horario_materias_curso_id_dia_semana_bloque_numero_key')
  ) {
    return 'Ya existe un bloque con ese numero para ese dia en este curso.'
  }

  if (message.includes('hora_fin') || message.includes('hora_inicio')) {
    return 'La hora de fin debe ser mayor que la hora de inicio.'
  }

  return message
}

function timeToMinutes(timeValue) {
  const [hours = '0', minutes = '0'] = String(timeValue ?? '').split(':')
  return Number(hours) * 60 + Number(minutes)
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function getVisibleDaysFromHorariosBase(horariosBase) {
  return DIAS_SEMANA_LABELS.filter((day) =>
    horariosBase.some((row) => String(row.dia_semana) === day.value)
  )
}

function getUniquePauseRows(horariosBase) {
  const pauseMap = new Map()

  for (const row of horariosBase) {
    const recreoInicio = normalizeTimeString(row.recreo_inicio)
    const recreoFin = normalizeTimeString(row.recreo_fin)
    const almuerzoInicio = normalizeTimeString(row.almuerzo_inicio)
    const almuerzoFin = normalizeTimeString(row.almuerzo_fin)

    if (recreoInicio && recreoFin) {
      const key = `recreo-${recreoInicio}-${recreoFin}`
      pauseMap.set(key, {
        row_id: key,
        kind: 'recreo',
        label: 'RECREO',
        hora_inicio: recreoInicio,
        hora_fin: recreoFin,
        start: timeToMinutes(recreoInicio),
        end: timeToMinutes(recreoFin),
        bloque_numero: null,
      })
    }

    if (almuerzoInicio && almuerzoFin) {
      const key = `almuerzo-${almuerzoInicio}-${almuerzoFin}`
      pauseMap.set(key, {
        row_id: key,
        kind: 'almuerzo',
        label: 'ALMUERZO',
        hora_inicio: almuerzoInicio,
        hora_fin: almuerzoFin,
        start: timeToMinutes(almuerzoInicio),
        end: timeToMinutes(almuerzoFin),
        bloque_numero: null,
      })
    }
  }

  return Array.from(pauseMap.values()).sort((a, b) => a.start - b.start)
}

export function buildGlobalTemplateRows(horariosBase) {
  if (!horariosBase.length) return []

  const earliestStart = Math.min(
    ...horariosBase.map((row) => timeToMinutes(normalizeTimeString(row.hora_inicio)))
  )
  const latestEnd = Math.max(
    ...horariosBase.map((row) => timeToMinutes(normalizeTimeString(row.hora_fin)))
  )
  const pauseRows = getUniquePauseRows(horariosBase)

  const rows = []
  let cursor = earliestStart
  let blockNumber = 1

  for (const pauseRow of pauseRows) {
    while (cursor + BLOCK_DURATION_MINUTES <= pauseRow.start) {
      const nextEnd = cursor + BLOCK_DURATION_MINUTES

      rows.push({
        row_id: `materia-${minutesToTime(cursor)}-${minutesToTime(nextEnd)}`,
        kind: 'materia',
        label: `Bloque ${blockNumber}`,
        bloque_numero: blockNumber,
        hora_inicio: minutesToTime(cursor),
        hora_fin: minutesToTime(nextEnd),
        start: cursor,
        end: nextEnd,
      })

      cursor = nextEnd
      blockNumber += 1
    }

    rows.push(pauseRow)
    cursor = Math.max(cursor, pauseRow.end)
  }

  while (cursor + BLOCK_DURATION_MINUTES <= latestEnd) {
    const nextEnd = cursor + BLOCK_DURATION_MINUTES

    rows.push({
      row_id: `materia-${minutesToTime(cursor)}-${minutesToTime(nextEnd)}`,
      kind: 'materia',
      label: `Bloque ${blockNumber}`,
      bloque_numero: blockNumber,
      hora_inicio: minutesToTime(cursor),
      hora_fin: minutesToTime(nextEnd),
      start: cursor,
      end: nextEnd,
    })

    cursor = nextEnd
    blockNumber += 1
  }

  console.log('[horario-visual] global_template_rows', rows)

  return rows
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

function buildTemplateBlocks(globalRows, horariosBase, existingBlocks) {
  const existingByDayAndTime = new Map(
    existingBlocks.map((block) => {
      const normalizedStart = normalizeTimeString(block.hora_inicio)
      const normalizedEnd = normalizeTimeString(block.hora_fin)
      return [
        `${block.dia_semana}-${normalizedStart}-${normalizedEnd}`,
        {
          ...block,
          hora_inicio: normalizedStart,
          hora_fin: normalizedEnd,
        },
      ]
    })
  )

  const blocks = []

  for (const daySchedule of horariosBase) {
    for (const row of globalRows) {
      if (row.kind === 'recreo' || row.kind === 'almuerzo') {
        if (!dayHasPause(daySchedule, row)) continue

        blocks.push({
          curso_id: daySchedule.curso_id,
          dia_semana: Number(daySchedule.dia_semana),
          bloque_numero: row.row_id,
          hora_inicio: row.hora_inicio,
          hora_fin: row.hora_fin,
          materia_nombre: '',
          id: null,
          source: 'template',
          kind: row.kind,
          label: row.label,
          row_id: row.row_id,
        })
        continue
      }

      if (!daySupportsMateriaRow(daySchedule, row)) continue

      const existing =
        existingByDayAndTime.get(
          `${daySchedule.dia_semana}-${row.hora_inicio}-${row.hora_fin}`
        ) ?? null

      blocks.push({
        curso_id: daySchedule.curso_id,
        dia_semana: Number(daySchedule.dia_semana),
        bloque_numero: row.bloque_numero,
        hora_inicio: row.hora_inicio,
        hora_fin: row.hora_fin,
        materia_nombre: existing?.materia_nombre ?? '',
        id: existing?.id ?? null,
        source: existing ? 'existing' : 'template',
        kind: 'materia',
        label: null,
        row_id: row.row_id,
      })
    }
  }

  console.log('[horario-visual] blocks_by_day', blocks)

  return blocks
}

function normalizeHorarioMateriaPayload(payload) {
  return {
    curso_id: payload.curso_id,
    dia_semana: Number(payload.dia_semana),
    bloque_numero: Number(payload.bloque_numero),
    hora_inicio: normalizeTimeString(payload.hora_inicio),
    hora_fin: normalizeTimeString(payload.hora_fin),
    materia_nombre: payload.materia_nombre?.trim() ?? '',
  }
}

export async function getCursos() {
  const { data: activePeriodo, error: periodoError } = await getPeriodoActivo()
  if (periodoError) return { data: [], error: periodoError }

  if (!activePeriodo?.id) {
    return { data: [], error: new Error('No existe un periodo lectivo activo.') }
  }

  const { data, error } = await supabase
    .from('cursos')
    .select(
      `
      id,
      nombre,
      nivel,
      paralelo,
      especialidad,
      estado
    `
    )
    .eq('periodo_id', activePeriodo.id)
    .eq('estado', true)
    .order('nombre', { ascending: true })

  const cursos = (data ?? []).map((curso) => ({
    ...curso,
    label: buildCursoLabel(curso),
  }))

  return { data: cursos, error }
}

export async function getHorariosBaseByCurso(cursoId) {
  const { data, error } = await supabase
    .from('horarios_curso')
    .select(
      `
      id,
      curso_id,
      dia_semana,
      hora_inicio,
      hora_fin,
      tolerancia_minutos,
      recreo_inicio,
      recreo_fin,
      almuerzo_inicio,
      almuerzo_fin,
      created_at
    `
    )
    .eq('curso_id', cursoId)
    .order('dia_semana', { ascending: true })

  return { data: data ?? [], error }
}

export async function getHorarioMateriasByCurso(cursoId) {
  const { data, error } = await supabase
    .from('horario_materias')
    .select(
      `
      id,
      curso_id,
      dia_semana,
      bloque_numero,
      hora_inicio,
      hora_fin,
      materia_nombre,
      created_at,
      updated_at
    `
    )
    .eq('curso_id', cursoId)
    .order('dia_semana', { ascending: true })
    .order('bloque_numero', { ascending: true })

  return { data: data ?? [], error }
}

export async function getHorarioMateriaTemplate(cursoId) {
  const [horariosResult, materiasResult] = await Promise.all([
    getHorariosBaseByCurso(cursoId),
    getHorarioMateriasByCurso(cursoId),
  ])

  if (horariosResult.error) {
    return { data: [], error: horariosResult.error }
  }

  if (materiasResult.error) {
    return { data: [], error: materiasResult.error }
  }

  const visibleDays = getVisibleDaysFromHorariosBase(horariosResult.data)
  const globalRows = buildGlobalTemplateRows(horariosResult.data)
  const blocks = buildTemplateBlocks(
    globalRows,
    horariosResult.data,
    materiasResult.data
  )

  console.log('[horario-visual] template_result', {
    cursoId,
    visibleDays,
    globalRows,
    horariosBase: horariosResult.data,
    horarioMaterias: materiasResult.data,
    blocks,
  })

  return {
    data: {
      blocks,
      visibleDays,
      globalRows,
    },
    error: null,
  }
}

export async function saveHorarioMateriaTemplate(cursoId, blocks) {
  const cleanedBlocks = (blocks ?? [])
    .filter((block) => block.kind === 'materia')
    .filter((block) => block.materia_nombre?.trim())
    .map((block) => normalizeHorarioMateriaPayload({ ...block, curso_id: cursoId }))

  console.log('[horario-visual] save_template:start', {
    cursoId,
    cleanedBlocks,
  })

  const { data: existingRows, error: existingError } = await supabase
    .from('horario_materias')
    .select(
      `
      id,
      curso_id,
      dia_semana,
      bloque_numero,
      hora_inicio,
      hora_fin,
      materia_nombre
    `
    )
    .eq('curso_id', cursoId)

  if (existingError) {
    return {
      data: [],
      error: new Error(mapHorarioMateriaError(existingError)),
    }
  }

  const existingById = new Map((existingRows ?? []).map((row) => [row.id, row]))
  const existingByKey = new Map(
    (existingRows ?? []).map((row) => [`${row.dia_semana}-${row.bloque_numero}`, row])
  )

  const results = []

  for (const block of cleanedBlocks) {
    const existing = block.id
      ? existingById.get(block.id) ?? existingByKey.get(`${block.dia_semana}-${block.bloque_numero}`)
      : existingByKey.get(`${block.dia_semana}-${block.bloque_numero}`)

    if (existing) {
      const { data, error } = await supabase
        .from('horario_materias')
        .update({
          bloque_numero: block.bloque_numero,
          hora_inicio: block.hora_inicio,
          hora_fin: block.hora_fin,
          materia_nombre: block.materia_nombre,
        })
        .eq('id', existing.id)
        .select()
        .single()

      console.log('[horario-visual] save_template:update', {
        existingId: existing.id,
        block,
        error,
      })

      if (error) {
        return {
          data: results,
          error: new Error(mapHorarioMateriaError(error)),
        }
      }

      results.push(data)
      continue
    }

    const { data, error } = await supabase
      .from('horario_materias')
      .insert(block)
      .select()
      .single()

    console.log('[horario-visual] save_template:insert', {
      block,
      error,
    })

    if (error) {
      return {
        data: results,
        error: new Error(mapHorarioMateriaError(error)),
      }
    }

    results.push(data)
  }

  return {
    data: results,
    error: null,
  }
}
