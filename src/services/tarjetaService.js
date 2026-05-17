import { supabase } from './supabaseClient'

export async function listTarjetas() {
  const { data, error } = await supabase
    .from('tarjetas_nfc')
    .select(
      `
      id,
      uid_nfc,
      estudiante_id,
      fecha_asignacion,
      is_active,
      created_at,
      estudiante:estudiantes (
        id,
        nombres,
        apellidos
      )
    `
    )
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

export async function listTarjetasByEstudiante(estudianteId) {
  if (!estudianteId) return { data: [], error: null }

  const { data, error } = await supabase
    .from('tarjetas_nfc')
    .select(
      `
      id,
      uid_nfc,
      estudiante_id,
      fecha_asignacion,
      fecha_desactivacion,
      is_active,
      notas,
      created_at
    `
    )
    .eq('estudiante_id', estudianteId)
    .order('fecha_asignacion', { ascending: false })

  return { data: data ?? [], error }
}
