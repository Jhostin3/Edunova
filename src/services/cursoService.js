import { supabase } from './supabaseClient'

function buildCursoPayload(payload, periodoId) {
  const nivel = payload.nivel?.trim() ?? ''
  const paralelo = payload.paralelo?.trim() ?? ''
  const especialidad = payload.especialidad?.trim() ?? ''
  const descripcion = payload.descripcion?.trim() ?? ''
  const nombre = [nivel, paralelo, especialidad].filter(Boolean).join(' ')

  return {
    nivel,
    paralelo,
    especialidad,
    descripcion: descripcion || null,
    estado: Boolean(payload.estado),
    nombre,
    periodo_id: periodoId,
  }
}

function normalizeValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

function isEquivalentCurso(a, b) {
  const sameName = normalizeValue(a.nombre) && normalizeValue(a.nombre) === normalizeValue(b.nombre)

  const sameStructure =
    normalizeValue(a.nivel) === normalizeValue(b.nivel) &&
    normalizeValue(a.paralelo) === normalizeValue(b.paralelo) &&
    normalizeValue(a.especialidad) === normalizeValue(b.especialidad)

  return sameName || sameStructure
}

async function getActivePeriodo() {
  const { data, error } = await supabase
    .from('periodos_escolares')
    .select('id, nombre, fecha_inicio, fecha_fin, activo, created_at')
    .eq('activo', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  console.log('[cursoService] periodo_activo_result', {
    periodoActivo: data,
    periodoError: error,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data?.id) {
    throw new Error(
      'No existe un periodo escolar activo. Crea uno en la base de datos antes de registrar cursos.'
    )
  }

  return data
}

async function getActivePeriodoId() {
  const periodo = await getActivePeriodo()
  return periodo.id
}

async function getCursoById(id) {
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
      descripcion,
      estado,
      created_at,
      updated_at,
      periodo:periodos_escolares (
        id,
        nombre,
        fecha_inicio,
        fecha_fin,
        activo
      )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('No se encontro el curso seleccionado.')

  return data
}

export async function listCursos() {
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
      descripcion,
      estado,
      created_at,
      updated_at,
      periodo:periodos_escolares (
        id,
        nombre,
        fecha_inicio,
        fecha_fin,
        activo
      )
    `
    )
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

export async function createCurso(payload) {
  try {
    const periodoId = await getActivePeriodoId()
    const finalPayload = buildCursoPayload(payload, periodoId)

    console.log('[cursoService] createCurso:payload', finalPayload)

    const { data, error } = await supabase
      .from('cursos')
      .insert(finalPayload)
      .select()
      .single()

    if (error) {
      console.log('[cursoService] createCurso:error', error)
    }

    return { data, error }
  } catch (error) {
    console.log('[cursoService] createCurso:unexpected_error', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Error al crear curso'),
    }
  }
}

export async function updateCurso(id, payload) {
  try {
    const currentCurso = await getCursoById(id)
    const periodoId = currentCurso.periodo_id
    const finalPayload = buildCursoPayload(payload, periodoId)

    console.log('[cursoService] updateCurso:payload', {
      id,
      ...finalPayload,
    })

    const { data, error } = await supabase
      .from('cursos')
      .update(finalPayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.log('[cursoService] updateCurso:error', error)
    }

    return { data, error }
  } catch (error) {
    console.log('[cursoService] updateCurso:unexpected_error', error)
    return {
      data: null,
      error:
        error instanceof Error ? error : new Error('Error al actualizar curso'),
    }
  }
}

export async function habilitarCursoEnPeriodoActivo(cursoId) {
  try {
    const [cursoOriginal, periodoActivo] = await Promise.all([
      getCursoById(cursoId),
      getActivePeriodo(),
    ])

    if (cursoOriginal.periodo_id === periodoActivo.id) {
      return {
        data: {
          curso: cursoOriginal,
          periodoActivo,
          alreadyEnabled: true,
        },
        error: null,
      }
    }

    const { data: cursosActivos, error: cursosActivosError } = await supabase
      .from('cursos')
      .select(
        `
        id,
        periodo_id,
        nombre,
        nivel,
        paralelo,
        especialidad,
        descripcion,
        estado,
        created_at,
        updated_at,
        periodo:periodos_escolares (
          id,
          nombre,
          fecha_inicio,
          fecha_fin,
          activo
        )
      `
      )
      .eq('periodo_id', periodoActivo.id)

    if (cursosActivosError) {
      return { data: null, error: cursosActivosError }
    }

    const equivalent = (cursosActivos ?? []).find((cursoActivo) =>
      isEquivalentCurso(cursoActivo, cursoOriginal)
    )

    if (equivalent) {
      return {
        data: {
          curso: equivalent,
          periodoActivo,
          alreadyEnabled: true,
        },
        error: null,
      }
    }

    const payload = {
      periodo_id: periodoActivo.id,
      nombre: cursoOriginal.nombre,
      nivel: cursoOriginal.nivel,
      paralelo: cursoOriginal.paralelo,
      especialidad: cursoOriginal.especialidad,
      descripcion: cursoOriginal.descripcion,
      estado: true,
    }

    const { data: created, error: insertError } = await supabase
      .from('cursos')
      .insert(payload)
      .select(
        `
        id,
        periodo_id,
        nombre,
        nivel,
        paralelo,
        especialidad,
        descripcion,
        estado,
        created_at,
        updated_at,
        periodo:periodos_escolares (
          id,
          nombre,
          fecha_inicio,
          fecha_fin,
          activo
        )
      `
      )
      .single()

    if (insertError) {
      return { data: null, error: insertError }
    }

    return {
      data: {
        curso: created,
        periodoActivo,
        alreadyEnabled: false,
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error('Error al habilitar el curso en el periodo activo'),
    }
  }
}
