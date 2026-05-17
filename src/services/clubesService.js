import { supabase } from './supabaseClient'

export const CLUB_DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miercoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sabado' },
  { value: 7, label: 'Domingo' },
]

export function getClubDayLabel(dayNumber) {
  return CLUB_DAYS.find((day) => Number(day.value) === Number(dayNumber))?.label ?? '-'
}

export function formatClubTime(value) {
  if (!value) return '-'
  const [hours = '00', minutes = '00'] = String(value).split(':')
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
}

export function formatClubDays(days) {
  if (!days?.length) return 'Sin dias'
  return days.map((day) => getClubDayLabel(day)).join(', ')
}

function normalizeClubPayload(payload, coordinadorId) {
  return {
    nombre: payload.nombre?.trim() ?? '',
    descripcion: payload.descripcion?.trim() || null,
    coordinador_id: coordinadorId,
    hora_inicio: payload.hora_inicio || null,
    hora_fin: payload.hora_fin || null,
    estado: Boolean(payload.estado),
    modo_asistencia: payload.modo_asistencia,
    dias_minimos_requeridos:
      payload.modo_asistencia === 'dias_seleccionables'
        ? Number(payload.dias_minimos_requeridos)
        : null,
  }
}

async function replaceClubDias(clubId, dias) {
  const { error: deleteError } = await supabase
    .from('club_dias')
    .delete()
    .eq('club_id', clubId)

  if (deleteError) {
    return { data: null, error: deleteError }
  }

  if (!dias?.length) {
    return { data: [], error: null }
  }

  const payload = dias.map((dia) => ({
    club_id: clubId,
    dia_semana: Number(dia),
  }))

  const { data, error } = await supabase.from('club_dias').insert(payload).select()
  return { data: data ?? [], error }
}

async function getClubDiasMap(clubIds) {
  if (!clubIds?.length) {
    return { data: new Map(), error: null }
  }

  const { data, error } = await supabase
    .from('club_dias')
    .select(
      `
      id,
      club_id,
      dia_semana
    `
    )
    .in('club_id', clubIds)
    .order('dia_semana', { ascending: true })

  if (error) {
    return { data: new Map(), error }
  }

  const daysMap = new Map()

  for (const row of data ?? []) {
    const current = daysMap.get(row.club_id) ?? []
    current.push(Number(row.dia_semana))
    daysMap.set(row.club_id, current)
  }

  return { data: daysMap, error: null }
}

async function getClubInscripcionesCountMap(clubIds) {
  if (!clubIds?.length) {
    return { data: new Map(), error: null }
  }

  const { data, error } = await supabase
    .from('estudiante_club')
    .select(
      `
      id,
      club_id,
      activo
    `
    )
    .in('club_id', clubIds)
    .eq('activo', true)

  if (error) {
    return { data: new Map(), error }
  }

  const countMap = new Map()

  for (const row of data ?? []) {
    countMap.set(row.club_id, (countMap.get(row.club_id) ?? 0) + 1)
  }

  return { data: countMap, error: null }
}

export async function getMyClubes(coordinadorId) {
  const { data, error } = await supabase
    .from('clubes')
    .select(
      `
      id,
      nombre,
      descripcion,
      coordinador_id,
      hora_inicio,
      hora_fin,
      estado,
      modo_asistencia,
      dias_minimos_requeridos,
      created_at,
      updated_at
    `
    )
    .eq('coordinador_id', coordinadorId)
    .order('updated_at', { ascending: false })

  if (error) {
    return { data: [], error }
  }

  const clubs = data ?? []
  const clubIds = clubs.map((club) => club.id)

  const [
    { data: daysMap, error: daysError },
    { data: countMap, error: countError },
  ] = await Promise.all([
    getClubDiasMap(clubIds),
    getClubInscripcionesCountMap(clubIds),
  ])

  if (daysError) return { data: [], error: daysError }
  if (countError) return { data: [], error: countError }

  return {
    data: clubs.map((club) => ({
      ...club,
      dias: daysMap.get(club.id) ?? [],
      inscritos_count: countMap.get(club.id) ?? 0,
    })),
    error: null,
  }
}

export async function getClubById(id, coordinadorId) {
  let query = supabase
    .from('clubes')
    .select(
      `
      id,
      nombre,
      descripcion,
      coordinador_id,
      hora_inicio,
      hora_fin,
      estado,
      modo_asistencia,
      dias_minimos_requeridos,
      created_at,
      updated_at
    `
    )
    .eq('id', id)

  if (coordinadorId) {
    query = query.eq('coordinador_id', coordinadorId)
  }

  const { data, error } = await query.single()

  if (error) {
    return { data: null, error }
  }

  const [
    { data: daysMap, error: daysError },
    { data: countMap, error: countError },
  ] = await Promise.all([
    getClubDiasMap([id]),
    getClubInscripcionesCountMap([id]),
  ])

  if (daysError) return { data: null, error: daysError }
  if (countError) return { data: null, error: countError }

  return {
    data: {
      ...data,
      dias: daysMap.get(id) ?? [],
      inscritos_count: countMap.get(id) ?? 0,
    },
    error: null,
  }
}

export async function createClub(payload, dias, coordinadorId) {
  const clubPayload = normalizeClubPayload(payload, coordinadorId)

  const { data, error } = await supabase
    .from('clubes')
    .insert(clubPayload)
    .select()
    .single()

  if (error || !data?.id) {
    return { data, error }
  }

  const { error: daysError } = await replaceClubDias(data.id, dias)
  if (daysError) {
    return { data, error: daysError }
  }

  return getClubById(data.id, coordinadorId)
}

export async function updateClub(id, payload, dias, coordinadorId) {
  const clubPayload = normalizeClubPayload(payload, coordinadorId)

  const { data, error } = await supabase
    .from('clubes')
    .update(clubPayload)
    .eq('id', id)
    .eq('coordinador_id', coordinadorId)
    .select()
    .single()

  if (error) {
    return { data, error }
  }

  const { error: daysError } = await replaceClubDias(id, dias)
  if (daysError) {
    return { data, error: daysError }
  }

  return getClubById(id, coordinadorId)
}

export async function getCoordinadorClubSummary(coordinadorId) {
  const { data, error } = await getMyClubes(coordinadorId)

  if (error) {
    return { data: null, error }
  }

  const totalClubes = data.length
  const totalInscritos = data.reduce(
    (accumulator, club) => accumulator + (club.inscritos_count ?? 0),
    0
  )
  const activos = data.filter((club) => club.estado === true).length

  return {
    data: {
      totalClubes,
      totalInscritos,
      activos,
      clubs: data,
    },
    error: null,
  }
}
