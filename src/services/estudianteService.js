import { supabase } from './supabaseClient'
import { getPeriodoActivo } from './periodoService'
import { listTarjetasByEstudiante } from './tarjetaService'

function mapEdgeFunctionError(error, fallbackMessage) {
  const contextMessage =
    error?.context?.msg ||
    error?.context?.error ||
    error?.context?.message ||
    error?.message

  return contextMessage || fallbackMessage
}

async function getCursoAsignacionMap() {
  const { data, error } = await supabase
    .from('estudiante_curso')
    .select(
      `
      id,
      estudiante_id,
      curso_id,
      fecha_asignacion,
      estado,
      curso:cursos (
        id,
        nombre,
        nivel,
        paralelo,
        especialidad
      )
    `
    )
    .eq('estado', true)

  if (error) {
    return { data: new Map(), error }
  }

  const map = new Map()
  for (const item of data ?? []) {
    map.set(item.estudiante_id, item)
  }

  return { data: map, error: null }
}

async function getTarjetaActivaMap(estudianteIds) {
  if (!estudianteIds?.length) return { data: new Map(), error: null }

  const { data, error } = await supabase
    .from('tarjetas_nfc')
    .select('id, uid_nfc, estudiante_id, is_active, fecha_asignacion')
    .in('estudiante_id', estudianteIds)
    .eq('is_active', true)

  if (error) return { data: new Map(), error }

  return {
    data: new Map((data ?? []).map((tarjeta) => [tarjeta.estudiante_id, tarjeta])),
    error: null,
  }
}

async function upsertEstudianteCurso(estudianteId, cursoId) {
  if (!cursoId) {
    return { data: null, error: null }
  }

  const { data: existing, error: existingError } = await supabase
    .from('estudiante_curso')
    .select(
      `
      id,
      estudiante_id,
      curso_id,
      fecha_asignacion,
      estado
    `
    )
    .eq('estudiante_id', estudianteId)
    .limit(1)
    .maybeSingle()

  if (existingError) {
    return { data: null, error: existingError }
  }

  const payload = {
    estudiante_id: estudianteId,
    curso_id: cursoId,
    fecha_asignacion: new Date().toISOString(),
    estado: true,
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('estudiante_curso')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()

    return { data, error }
  }

  const { data, error } = await supabase
    .from('estudiante_curso')
    .insert(payload)
    .select()
    .single()

  return { data, error }
}

async function ensureEstudianteRepresentante(estudianteId, representanteId) {
  if (!estudianteId || !representanteId) {
    return { data: null, error: null }
  }

  const { data, error } = await supabase
    .from('estudiante_representante')
    .upsert(
      {
        estudiante_id: estudianteId,
        representante_id: representanteId,
        es_principal: true,
      },
      { onConflict: 'estudiante_id,representante_id' }
    )
    .select()
    .maybeSingle()

  return { data, error }
}

async function getCursoWithPeriodo(cursoId) {
  if (!cursoId) return { data: null, error: null }

  const { data, error } = await supabase
    .from('cursos')
    .select(
      `
      id,
      periodo_id,
      nombre,
      nivel,
      paralelo,
      especialidad,
      periodo:periodos_escolares (
        id,
        nombre,
        activo
      )
    `
    )
    .eq('id', cursoId)
    .maybeSingle()

  return { data, error }
}

async function getCursoIdsByPeriodo(periodoId) {
  if (!periodoId) return { data: [], error: null }

  const { data, error } = await supabase
    .from('cursos')
    .select('id')
    .eq('periodo_id', periodoId)

  return { data: (data ?? []).map((curso) => curso.id), error }
}

async function assignCursoForPeriodo(estudianteId, cursoId) {
  if (!cursoId) return { data: null, error: null }

  const { data: curso, error: cursoError } = await getCursoWithPeriodo(cursoId)
  if (cursoError) return { data: null, error: cursoError }
  if (!curso?.periodo_id) {
    return { data: null, error: new Error('El curso seleccionado no tiene periodo asociado.') }
  }

  const { data: cursoIds, error: cursoIdsError } = await getCursoIdsByPeriodo(curso.periodo_id)
  if (cursoIdsError) return { data: null, error: cursoIdsError }

  if (cursoIds.length) {
    const { error: deactivateError } = await supabase
      .from('estudiante_curso')
      .update({ estado: false })
      .eq('estudiante_id', estudianteId)
      .in('curso_id', cursoIds)
      .neq('curso_id', cursoId)

    if (deactivateError) return { data: null, error: deactivateError }
  }

  const { data: existing, error: existingError } = await supabase
    .from('estudiante_curso')
    .select('id')
    .eq('estudiante_id', estudianteId)
    .eq('curso_id', cursoId)
    .maybeSingle()

  if (existingError) return { data: null, error: existingError }

  const payload = {
    estudiante_id: estudianteId,
    curso_id: cursoId,
    fecha_asignacion: new Date().toISOString(),
    estado: true,
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('estudiante_curso')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()

    return { data, error }
  }

  const { data, error } = await supabase
    .from('estudiante_curso')
    .insert(payload)
    .select()
    .single()

  return { data, error }
}

function normalizeEstudiantePayload(payload) {
  return {
    nombres: payload.nombres?.trim() ?? '',
    apellidos: payload.apellidos?.trim() ?? '',
    tipo_identificacion: payload.tipo_identificacion || 'cedula_ecuatoriana',
    cedula: payload.cedula?.trim() ?? '',
    fecha_nacimiento: payload.fecha_nacimiento || null,
    genero: payload.genero || null,
    direccion: payload.direccion?.trim() || null,
    estado: Boolean(payload.estado),
    representante_principal_id: payload.representante_principal_id || null,
  }
}

async function createEstudianteWithAccount(payload) {
  const { data, error } = await supabase.functions.invoke('create-student-account', {
    body: {
      ...normalizeEstudiantePayload(payload),
      curso_id: payload.curso_id || null,
    },
  })

  if (error) {
    return {
      data: null,
      error: new Error(
        mapEdgeFunctionError(error, 'No se pudo crear la cuenta institucional del estudiante.')
      ),
    }
  }

  if (!data?.student?.id) {
    return {
      data: null,
      error: new Error('La funcion no devolvio un estudiante valido.'),
    }
  }

  return { data, error: null }
}

export async function listEstudiantes() {
  const { data: estudiantes, error: estudiantesError } = await supabase
    .from('estudiantes')
    .select(
      `
      id,
      user_id,
      representante_principal_id,
      codigo_estudiante,
      tipo_identificacion,
      cedula,
      nombres,
      apellidos,
      fecha_nacimiento,
      genero,
      direccion,
      estado,
      correo_institucional,
      cuenta_creada,
      foto_rostro_url,
      rostro_registrado,
      created_at,
      updated_at,
      representante_principal:representantes!estudiantes_representante_principal_id_fkey (
        id,
        nombres,
        apellidos,
        relacion
      )
    `
    )
    .order('created_at', { ascending: false })

  if (estudiantesError) {
    return { data: [], error: estudiantesError }
  }

  const { data: cursoMap, error: cursoMapError } = await getCursoAsignacionMap()
  if (cursoMapError) {
    return { data: [], error: cursoMapError }
  }

  const estudianteIds = (estudiantes ?? []).map((item) => item.id)
  const { data: tarjetaMap, error: tarjetaMapError } =
    await getTarjetaActivaMap(estudianteIds)

  if (tarjetaMapError) {
    return { data: [], error: tarjetaMapError }
  }

  const enriched = (estudiantes ?? []).map((item) => {
    const asignacion = cursoMap.get(item.id) ?? null
    const tarjetaActiva = tarjetaMap.get(item.id) ?? null
    return {
      ...item,
      curso_actual: asignacion?.curso ?? null,
      curso_id: asignacion?.curso_id ?? '',
      curso_asignacion_id: asignacion?.id ?? null,
      tarjeta_activa: tarjetaActiva,
      nfc_asignada: Boolean(tarjetaActiva),
      listo_asistencia: Boolean(asignacion && tarjetaActiva && item.rostro_registrado),
    }
  })

  return { data: enriched, error: null }
}

export async function createEstudiante(payload) {
  const { data, error } = await createEstudianteWithAccount(payload)

  if (error || !data?.student?.id) {
    return { data, error }
  }

  const { error: representanteError } = await ensureEstudianteRepresentante(
    data.student.id,
    payload.representante_principal_id
  )

  if (representanteError) {
    return { data, error: representanteError }
  }

  return { data, error: null }
}

export async function listCursosByPeriodoActivo() {
  const { data: periodo, error: periodoError } = await getPeriodoActivo()
  if (periodoError) return { data: [], periodo: null, error: periodoError }

  if (!periodo?.id) {
    return {
      data: [],
      periodo: null,
      error: new Error('No existe un periodo lectivo activo.'),
    }
  }

  const { data, error } = await supabase
    .from('cursos')
    .select(
      `
      id,
      periodo_id,
      nombre,
      nivel,
      paralelo,
      especialidad,
      estado
    `
    )
    .eq('periodo_id', periodo.id)
    .eq('estado', true)
    .order('nombre', { ascending: true })

  return { data: data ?? [], periodo, error }
}

export async function findEstudianteByCedula(cedula) {
  const normalizedCedula = String(cedula ?? '').trim()
  if (!normalizedCedula) return { data: null, error: null }

  const { data: estudiante, error } = await supabase
    .from('estudiantes')
    .select(
      `
      id,
      user_id,
      representante_principal_id,
      codigo_estudiante,
      tipo_identificacion,
      cedula,
      nombres,
      apellidos,
      fecha_nacimiento,
      genero,
      direccion,
      estado,
      correo_institucional,
      cuenta_creada,
      foto_rostro_url,
      rostro_registrado,
      created_at,
      updated_at,
      representante_principal:representantes!estudiantes_representante_principal_id_fkey (
        id,
        nombres,
        apellidos,
        tipo_identificacion,
        cedula,
        relacion,
        telefono,
        email,
        whatsapp,
        direccion,
        estado
      )
    `
    )
    .eq('cedula', normalizedCedula)
    .maybeSingle()

  if (error || !estudiante) return { data: estudiante ?? null, error }

  const [historialResult, estadoResult, tarjetasResult] = await Promise.all([
    getHistorialAcademico(estudiante.id),
    getEstadoOperativoEstudiante(estudiante.id),
    listTarjetasByEstudiante(estudiante.id),
  ])

  if (historialResult.error) return { data: null, error: historialResult.error }
  if (estadoResult.error) return { data: null, error: estadoResult.error }
  if (tarjetasResult.error) return { data: null, error: tarjetasResult.error }

  return {
    data: {
      ...estudiante,
      historial_academico: historialResult.data,
      estado_operativo: estadoResult.data,
      tarjetas_nfc: tarjetasResult.data,
    },
    error: null,
  }
}

export async function getHistorialAcademico(estudianteId) {
  if (!estudianteId) return { data: [], error: null }

  const { data, error } = await supabase
    .from('estudiante_curso')
    .select(
      `
      id,
      estudiante_id,
      curso_id,
      fecha_asignacion,
      estado,
      curso:cursos (
        id,
        nombre,
        nivel,
        paralelo,
        especialidad,
        periodo_id,
        periodo:periodos_escolares (
          id,
          nombre,
          fecha_inicio,
          fecha_fin,
          activo
        )
      )
    `
    )
    .eq('estudiante_id', estudianteId)
    .order('fecha_asignacion', { ascending: false })

  return { data: data ?? [], error }
}

export async function getEstadoOperativoEstudiante(estudianteId) {
  if (!estudianteId) return { data: null, error: null }

  const { data: periodo, error: periodoError } = await getPeriodoActivo()
  if (periodoError) return { data: null, error: periodoError }

  const { data: estudiante, error: estudianteError } = await supabase
    .from('estudiantes')
    .select('id, rostro_registrado, foto_rostro_url')
    .eq('id', estudianteId)
    .maybeSingle()

  if (estudianteError) return { data: null, error: estudianteError }

  const { data: tarjetas, error: tarjetasError } = await listTarjetasByEstudiante(estudianteId)
  if (tarjetasError) return { data: null, error: tarjetasError }

  const cursoIdsResult = periodo?.id
    ? await getCursoIdsByPeriodo(periodo.id)
    : { data: [], error: null }

  if (cursoIdsResult.error) return { data: null, error: cursoIdsResult.error }

  let matriculaActual = null
  if (cursoIdsResult.data.length) {
    const { data, error } = await supabase
      .from('estudiante_curso')
      .select('id, curso_id, estado, fecha_asignacion')
      .eq('estudiante_id', estudianteId)
      .in('curso_id', cursoIdsResult.data)
      .eq('estado', true)
      .limit(1)
      .maybeSingle()

    if (error) return { data: null, error }
    matriculaActual = data ?? null
  }

  const tarjetaActiva = (tarjetas ?? []).find((tarjeta) => tarjeta.is_active) ?? null
  const rostroRegistrado = Boolean(estudiante?.rostro_registrado)

  return {
    data: {
      periodo_activo: periodo,
      matricula_completada: Boolean(matriculaActual),
      matricula_actual: matriculaActual,
      nfc_asignada: Boolean(tarjetaActiva),
      tarjeta_activa: tarjetaActiva,
      rostro_registrado: rostroRegistrado,
      foto_rostro_url: estudiante?.foto_rostro_url ?? null,
      listo_asistencia: Boolean(matriculaActual && tarjetaActiva && rostroRegistrado),
    },
    error: null,
  }
}

export async function rematricularEstudianteExistente(id, payload) {
  const estudiantePayload = normalizeEstudiantePayload(payload)

  const { data, error } = await supabase
    .from('estudiantes')
    .update(estudiantePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error }

  const { error: representanteError } = await ensureEstudianteRepresentante(
    id,
    estudiantePayload.representante_principal_id
  )
  if (representanteError) return { data: null, error: representanteError }

  const { error: cursoError } = await assignCursoForPeriodo(id, payload.curso_id)
  if (cursoError) return { data: null, error: cursoError }

  const [historialResult, estadoResult, tarjetasResult] = await Promise.all([
    getHistorialAcademico(id),
    getEstadoOperativoEstudiante(id),
    listTarjetasByEstudiante(id),
  ])

  if (historialResult.error) return { data: null, error: historialResult.error }
  if (estadoResult.error) return { data: null, error: estadoResult.error }
  if (tarjetasResult.error) return { data: null, error: tarjetasResult.error }

  return {
    data: {
      student: data,
      historial_academico: historialResult.data,
      estado_operativo: estadoResult.data,
      tarjetas_nfc: tarjetasResult.data,
    },
    error: null,
  }
}

export async function listRepresentantesForEstudiantes() {
  const { data, error } = await supabase
    .from('representantes')
    .select(
      `
      id,
      nombres,
      apellidos,
      tipo_identificacion,
      relacion,
      estado
    `
    )
    .eq('estado', true)
    .order('nombres', { ascending: true })

  return { data: data ?? [], error }
}

export async function listCursosForEstudiantes() {
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
    .eq('estado', true)
    .order('nombre', { ascending: true })

  return { data: data ?? [], error }
}

export async function updateEstudiante(id, payload) {
  const estudiantePayload = normalizeEstudiantePayload(payload)

  const { data, error } = await supabase
    .from('estudiantes')
    .update(estudiantePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data, error }
  }

  const { error: cursoError } = await upsertEstudianteCurso(id, payload.curso_id)
  if (cursoError) {
    return { data, error: cursoError }
  }

  return { data, error: null }
}
