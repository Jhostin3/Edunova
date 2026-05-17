import { supabase } from './supabaseClient'
import { getPeriodoActivo } from './periodoService'

export const DIAS_SEMANA = [
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miercoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sabado' },
  { value: '7', label: 'Domingo' },
]

export function getDiaSemanaLabel(value) {
  return (
    DIAS_SEMANA.find((item) => String(item.value) === String(value))?.label ?? '-'
  )
}

function buildGroupKey(row) {
  return [
    row.hora_inicio ?? '',
    row.hora_fin ?? '',
    String(row.tolerancia_minutos ?? 0),
    row.recreo_inicio ?? '',
    row.recreo_fin ?? '',
    row.almuerzo_inicio ?? '',
    row.almuerzo_fin ?? '',
  ].join('|')
}

export function summarizeHorarios(horarios) {
  const grouped = new Map()

  for (const row of horarios ?? []) {
    const key = buildGroupKey(row)
    const existing = grouped.get(key)

    if (existing) {
      existing.dias.push(String(row.dia_semana))
      continue
    }

    grouped.set(key, {
      hora_inicio: row.hora_inicio ?? '',
      hora_fin: row.hora_fin ?? '',
      tolerancia_minutos: String(row.tolerancia_minutos ?? 0),
      recreo_inicio: row.recreo_inicio ?? '',
      recreo_fin: row.recreo_fin ?? '',
      almuerzo_inicio: row.almuerzo_inicio ?? '',
      almuerzo_fin: row.almuerzo_fin ?? '',
      dias: [String(row.dia_semana)],
    })
  }

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      dias: group.dias.sort((a, b) => Number(a) - Number(b)),
    }))
    .sort((a, b) => {
      const aHasLunch = Boolean(a.almuerzo_inicio && a.almuerzo_fin)
      const bHasLunch = Boolean(b.almuerzo_inicio && b.almuerzo_fin)

      if (aHasLunch !== bHasLunch) return aHasLunch ? -1 : 1
      if (b.dias.length !== a.dias.length) return b.dias.length - a.dias.length
      return a.hora_inicio.localeCompare(b.hora_inicio)
    })
}

export function buildHorarioFormInitialData(horarios) {
  const { longRows, shortRows } = splitRowsByJornadaType(horarios)
  const [largos] = summarizeHorarios(longRows)
  const [cortos] = summarizeHorarios(shortRows)

  console.log('ROWS_FROM_DB', horarios ?? [])
  console.log('LONG_ROWS_DETECTED', longRows)
  console.log('SHORT_ROWS_DETECTED', shortRows)

  return {
    largos: {
      dias: largos?.dias ?? [],
      hora_inicio: largos?.hora_inicio ?? '',
      hora_fin: largos?.hora_fin ?? '',
      tolerancia_minutos: largos?.tolerancia_minutos ?? '0',
      recreo_inicio: largos?.recreo_inicio ?? '',
      recreo_fin: largos?.recreo_fin ?? '',
      almuerzo_inicio: largos?.almuerzo_inicio ?? '',
      almuerzo_fin: largos?.almuerzo_fin ?? '',
    },
    cortos: {
      dias: cortos?.dias ?? [],
      hora_inicio: cortos?.hora_inicio ?? '',
      hora_fin: cortos?.hora_fin ?? '',
      tolerancia_minutos: cortos?.tolerancia_minutos ?? '0',
      recreo_inicio: cortos?.recreo_inicio ?? '',
      recreo_fin: cortos?.recreo_fin ?? '',
      almuerzo_inicio: '',
      almuerzo_fin: '',
    },
  }
}

function splitRowsByJornadaType(rows) {
  const longRows = []
  const shortRows = []

  for (const row of rows ?? []) {
    if (row.almuerzo_inicio && row.almuerzo_fin) {
      longRows.push(row)
    } else {
      shortRows.push(row)
    }
  }

  return { longRows, shortRows }
}

function getCursoLabel(curso) {
  return (
    curso.nombre ||
    [curso.nivel, curso.paralelo, curso.especialidad].filter(Boolean).join(' ')
  )
}

function mapHorarioError(error) {
  const message = error?.message ?? 'Ocurrio un error al guardar la jornada semanal.'

  if (message.includes('horarios_curso_curso_id_dia_semana_key')) {
    return 'Ya existe un horario para uno de los dias seleccionados en este curso.'
  }

  if (message.includes('hora_fin') || message.includes('hora_inicio')) {
    return 'La hora de salida debe ser mayor que la hora de entrada.'
  }

  return message
}

function normalizeSingleHorario(payload) {
  return {
    curso_id: payload.curso_id,
    dia_semana: Number(payload.dia_semana),
    hora_inicio: payload.hora_inicio,
    hora_fin: payload.hora_fin,
    tolerancia_minutos: Number(payload.tolerancia_minutos),
    recreo_inicio: payload.recreo_inicio || null,
    recreo_fin: payload.recreo_fin || null,
    almuerzo_inicio: payload.almuerzo_inicio || null,
    almuerzo_fin: payload.almuerzo_fin || null,
  }
}

function buildPayloadsFromGroup(config, key) {
  const dias = config[key].dias
  const hora_inicio = config[key].hora_inicio
  const hora_fin = config[key].hora_fin
  const tolerancia_minutos = config[key].tolerancia_minutos
  const recreo_inicio = config[key].recreo_inicio
  const recreo_fin = config[key].recreo_fin
  const almuerzo_inicio = key === 'largos' ? config[key].almuerzo_inicio : ''
  const almuerzo_fin = key === 'largos' ? config[key].almuerzo_fin : ''

  return dias.map((dia_semana) =>
    normalizeSingleHorario({
      curso_id: config.curso_id,
      dia_semana,
      hora_inicio,
      hora_fin,
      tolerancia_minutos,
      recreo_inicio,
      recreo_fin,
      almuerzo_inicio,
      almuerzo_fin,
    })
  )
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
    label: getCursoLabel(curso),
  }))

  return { data: cursos, error }
}

export async function getHorariosByCurso(cursoId) {
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

  console.log('ROWS_FROM_DB', data ?? [])
  const { longRows, shortRows } = splitRowsByJornadaType(data ?? [])
  console.log('LONG_ROWS_DETECTED', longRows)
  console.log('SHORT_ROWS_DETECTED', shortRows)

  return { data: data ?? [], error }
}

export async function createOrUpdateHorario(config) {
  const longDaysConfig = {
    ...config.largos,
    almuerzo_inicio: config.largos.almuerzo_inicio,
    almuerzo_fin: config.largos.almuerzo_fin,
  }
  const shortDaysConfig = {
    ...config.cortos,
    almuerzo_inicio: null,
    almuerzo_fin: null,
  }

  const longRowsToSave = buildPayloadsFromGroup(config, 'largos')
  const shortRowsToSave = buildPayloadsFromGroup(config, 'cortos')
  const payloads = [...longRowsToSave, ...shortRowsToSave]

  const diasSeleccionados = payloads.map((item) => item.dia_semana)

  console.log('LONG_CONFIG_TO_SAVE', longDaysConfig)
  console.log('SHORT_CONFIG_TO_SAVE', shortDaysConfig)
  console.log('ROWS_TO_SAVE', payloads)

  console.log('[horarios] createOrUpdateHorario:start', {
    cursoId: config.curso_id,
    diasSeleccionados,
    payloads,
  })

  if (!payloads.length) {
    return {
      data: [],
      error: new Error('Selecciona al menos un dia para guardar la jornada semanal.'),
    }
  }

  const { data: existingRows, error: existingError } = await supabase
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
      almuerzo_fin
    `
    )
    .eq('curso_id', config.curso_id)

  console.log('[horarios] createOrUpdateHorario:existing_rows', {
    existingRows,
    existingError,
  })

  if (existingError) {
    return {
      data: [],
      error: new Error(mapHorarioError(existingError)),
    }
  }

  const existingByDay = new Map(
    (existingRows ?? []).map((row) => [String(row.dia_semana), row])
  )

  const results = []
  const selectedDaySet = new Set(diasSeleccionados.map((day) => String(day)))
  const staleRows = (existingRows ?? []).filter(
    (row) => !selectedDaySet.has(String(row.dia_semana))
  )

  for (const staleRow of staleRows) {
    const { error } = await supabase
      .from('horarios_curso')
      .delete()
      .eq('id', staleRow.id)

    console.log('[horarios] createOrUpdateHorario:delete_stale', {
      dia: staleRow.dia_semana,
      existingId: staleRow.id,
      error,
    })

    if (error) {
      return {
        data: results,
        error: new Error(mapHorarioError(error)),
      }
    }
  }

  for (const payload of payloads) {
    const existing = existingByDay.get(String(payload.dia_semana))

    if (existing) {
      const { data, error } = await supabase
        .from('horarios_curso')
        .update({
          hora_inicio: payload.hora_inicio,
          hora_fin: payload.hora_fin,
          tolerancia_minutos: payload.tolerancia_minutos,
          recreo_inicio: payload.recreo_inicio,
          recreo_fin: payload.recreo_fin,
          almuerzo_inicio: payload.almuerzo_inicio,
          almuerzo_fin: payload.almuerzo_fin,
        })
        .eq('id', existing.id)
        .select()
        .single()

      console.log('[horarios] createOrUpdateHorario:update', {
        dia: payload.dia_semana,
        existingId: existing.id,
        payload,
        error,
      })

      if (error) {
        return {
          data: results,
          error: new Error(mapHorarioError(error)),
        }
      }

      results.push(data)
      continue
    }

    const { data, error } = await supabase
      .from('horarios_curso')
      .insert(payload)
      .select()
      .single()

    console.log('[horarios] createOrUpdateHorario:insert', {
      dia: payload.dia_semana,
      payload,
      error,
    })

    if (error) {
      return {
        data: results,
        error: new Error(mapHorarioError(error)),
      }
    }

    results.push(data)
  }

  return {
    data: results,
    error: null,
  }
}
