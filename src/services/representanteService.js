import { supabase } from './supabaseClient'

export async function listRepresentantes() {
  const { data, error } = await supabase
    .from('representantes')
    .select(
      `
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
      estado,
      created_at,
      updated_at
    `
    )
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

export async function createRepresentante(payload) {
  const { data, error } = await supabase
    .from('representantes')
    .insert(payload)
    .select()
    .single()

  return { data, error }
}

export async function findRepresentanteByCedula(cedula) {
  const normalizedCedula = String(cedula ?? '').trim()

  if (!normalizedCedula) {
    return { data: null, error: null }
  }

  const { data, error } = await supabase
    .from('representantes')
    .select(
      `
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
      estado,
      created_at,
      updated_at
    `
    )
    .eq('cedula', normalizedCedula)
    .limit(1)
    .maybeSingle()

  return { data, error }
}

export async function updateRepresentante(id, payload) {
  const { data, error } = await supabase
    .from('representantes')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}
