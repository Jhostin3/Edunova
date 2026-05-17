import { supabase } from './supabaseClient'

function normalizePeriodoPayload(payload) {
  return {
    nombre: payload.nombre?.trim() ?? '',
    fecha_inicio: payload.fecha_inicio || null,
    fecha_fin: payload.fecha_fin || null,
    activo: Boolean(payload.activo),
  }
}

async function deactivateOtherPeriodos(exceptId = null) {
  let query = supabase.from('periodos_escolares').update({ activo: false })

  if (exceptId) {
    query = query.neq('id', exceptId)
  }

  const { error } = await query.eq('activo', true)

  if (error) {
    throw error
  }
}

export async function listPeriodos() {
  const { data, error } = await supabase
    .from('periodos_escolares')
    .select(
      `
      id,
      nombre,
      fecha_inicio,
      fecha_fin,
      activo,
      created_at
    `
    )
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

export async function getPeriodoActivo() {
  const { data, error } = await supabase
    .from('periodos_escolares')
    .select(
      `
      id,
      nombre,
      fecha_inicio,
      fecha_fin,
      activo,
      created_at
    `
    )
    .eq('activo', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { data: data ?? null, error }
}

export async function createPeriodo(payload) {
  try {
    const finalPayload = normalizePeriodoPayload(payload)

    if (finalPayload.activo) {
      await deactivateOtherPeriodos()
    }

    const { data, error } = await supabase
      .from('periodos_escolares')
      .insert(finalPayload)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error('Error al crear periodo lectivo'),
    }
  }
}

export async function updatePeriodo(id, payload) {
  try {
    const finalPayload = normalizePeriodoPayload(payload)

    if (finalPayload.activo) {
      await deactivateOtherPeriodos(id)
    }

    const { data, error } = await supabase
      .from('periodos_escolares')
      .update(finalPayload)
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error('Error al actualizar periodo lectivo'),
    }
  }
}

export async function activatePeriodo(id) {
  try {
    await deactivateOtherPeriodos(id)

    const { data, error } = await supabase
      .from('periodos_escolares')
      .update({ activo: true })
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error('Error al activar periodo lectivo'),
    }
  }
}
