import { supabase } from './supabaseClient'
import { getClubById } from './clubesService'

function buildCursoLabel(curso) {
  if (!curso) return 'Sin curso asignado'
  return (
    curso.curso_nombre ||
    [curso.nivel, curso.paralelo, curso.especialidad].filter(Boolean).join(' ')
  )
}

export async function findStudentByCedula(cedula) {
  const trimmedCedula = String(cedula ?? '').trim().toUpperCase()

  if (!trimmedCedula) {
    return {
      data: null,
      error: new Error('Ingresa una identificación para buscar al estudiante.'),
    }
  }

  const { data: estudiante, error: estudianteError } = await supabase
    .from('estudiantes')
    .select(
      `
      id,
      tipo_identificacion,
      cedula,
      nombres,
      apellidos,
      correo_institucional,
      estado
    `
    )
    .eq('cedula', trimmedCedula)
    .maybeSingle()

  if (estudianteError) {
    return { data: null, error: estudianteError }
  }

  if (!estudiante) {
    return {
      data: null,
      error: new Error('No se encontro un estudiante con esa identificación.'),
    }
  }

  const { data: cursoActual, error: cursoError } = await supabase
    .from('v_estudiante_curso_actual')
    .select(
      `
      estudiante_id,
      curso_id,
      curso_nombre,
      nivel,
      paralelo,
      especialidad
    `
    )
    .eq('estudiante_id', estudiante.id)
    .maybeSingle()

  if (cursoError) {
    return { data: null, error: cursoError }
  }

  return {
    data: {
      ...estudiante,
      curso_actual: cursoActual ?? null,
      curso_actual_label: buildCursoLabel(cursoActual),
    },
    error: null,
  }
}

export async function getClubDias(clubId) {
  const { data, error } = await supabase
    .from('club_dias')
    .select(
      `
      id,
      club_id,
      dia_semana
    `
    )
    .eq('club_id', clubId)
    .order('dia_semana', { ascending: true })

  return { data: (data ?? []).map((item) => Number(item.dia_semana)), error }
}

export async function getInscripcionesByClub(clubId) {
  const { data, error } = await supabase
    .from('estudiante_club')
    .select(
      `
      id,
      estudiante_id,
      club_id,
      fecha_asignacion,
      activo,
      estudiante:estudiantes (
        id,
        tipo_identificacion,
        cedula,
        nombres,
        apellidos,
        estado
      ),
      dias:estudiante_club_dias (
        id,
        dia_semana
      )
    `
    )
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error }
  }

  return {
    data: (data ?? []).map((item) => ({
      ...item,
      dias: (item.dias ?? []).map((day) => Number(day.dia_semana)).sort((a, b) => a - b),
    })),
    error: null,
  }
}

function validateSelectedDays(club, clubDias, diasSeleccionados) {
  if (club.modo_asistencia === 'todos_los_dias') {
    return { diasFinales: clubDias, error: null }
  }

  const dias = [...new Set((diasSeleccionados ?? []).map((day) => Number(day)))]

  if (!dias.length) {
    return {
      diasFinales: [],
      error: new Error('Selecciona al menos un dia para la inscripcion del estudiante.'),
    }
  }

  const invalidDay = dias.find((day) => !clubDias.includes(day))
  if (invalidDay) {
    return {
      diasFinales: [],
      error: new Error('Solo puedes elegir dias que pertenezcan al club.'),
    }
  }

  const minimumRequired = Number(club.dias_minimos_requeridos ?? 0)
  if (minimumRequired > 0 && dias.length < minimumRequired) {
    return {
      diasFinales: [],
      error: new Error(
        `Debes seleccionar al menos ${minimumRequired} dia(s) para este club.`
      ),
    }
  }

  return { diasFinales: dias, error: null }
}

export async function inscribirEstudianteEnClub({
  estudianteId,
  clubId,
  diasSeleccionados,
  coordinadorId,
}) {
  const { data: club, error: clubError } = await getClubById(clubId, coordinadorId)
  if (clubError || !club) {
    return {
      data: null,
      error: clubError || new Error('No se pudo cargar el club seleccionado.'),
    }
  }

  const clubDias = club.dias ?? []
  const { diasFinales, error: diasError } = validateSelectedDays(
    club,
    clubDias,
    diasSeleccionados
  )

  if (diasError) {
    return { data: null, error: diasError }
  }

  const { data: existing, error: existingError } = await supabase
    .from('estudiante_club')
    .select(
      `
      id,
      estudiante_id,
      club_id,
      activo
    `
    )
    .eq('estudiante_id', estudianteId)
    .eq('club_id', clubId)
    .limit(1)
    .maybeSingle()

  if (existingError) {
    return { data: null, error: existingError }
  }

  let inscripcionId = existing?.id ?? null

  if (existing?.activo) {
    return {
      data: null,
      error: new Error('El estudiante ya se encuentra inscrito en este club.'),
    }
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('estudiante_club')
      .update({
        activo: true,
        fecha_asignacion: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateError) {
      return { data: null, error: updateError }
    }

    inscripcionId = existing.id

    const { error: deleteDaysError } = await supabase
      .from('estudiante_club_dias')
      .delete()
      .eq('estudiante_club_id', inscripcionId)

    if (deleteDaysError) {
      return { data: null, error: deleteDaysError }
    }
  } else {
    const { data: newEnrollment, error: insertError } = await supabase
      .from('estudiante_club')
      .insert({
        estudiante_id: estudianteId,
        club_id: clubId,
        fecha_asignacion: new Date().toISOString(),
        activo: true,
      })
      .select()
      .single()

    if (insertError || !newEnrollment?.id) {
      return { data: null, error: insertError }
    }

    inscripcionId = newEnrollment.id
  }

  const { error: insertDaysError } = await supabase.from('estudiante_club_dias').insert(
    diasFinales.map((dia) => ({
      estudiante_club_id: inscripcionId,
      dia_semana: Number(dia),
    }))
  )

  if (insertDaysError) {
    return { data: null, error: insertDaysError }
  }

  return {
    data: {
      id: inscripcionId,
      dias: diasFinales,
    },
    error: null,
  }
}
