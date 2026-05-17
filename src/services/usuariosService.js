import { supabase } from './supabaseClient'

function mapEdgeFunctionError(error, fallbackMessage) {
  const contextMessage =
    error?.context?.msg ||
    error?.context?.error ||
    error?.context?.message ||
    error?.message

  return contextMessage || fallbackMessage
}

function normalizeUsuarioPayload(payload) {
  return {
    nombres: payload.nombres?.trim() ?? '',
    apellidos: payload.apellidos?.trim() ?? '',
    tipo_identificacion: payload.tipo_identificacion || 'cedula_ecuatoriana',
    cedula: payload.cedula?.trim() ?? '',
    fecha_nacimiento: payload.fecha_nacimiento || null,
    telefono: payload.telefono?.trim() || null,
    rol_id: Number(payload.rol_id),
    estado: Boolean(payload.estado),
  }
}

async function createStaffWithAccount(payload) {
  const { data, error } = await supabase.functions.invoke('create-staff-account', {
    body: normalizeUsuarioPayload(payload),
  })

  if (error) {
    return {
      data: null,
      error: new Error(
        mapEdgeFunctionError(error, 'No se pudo crear la cuenta institucional del personal.')
      ),
    }
  }

  if (!data?.staff?.id) {
    return {
      data: null,
      error: new Error('La funcion no devolvio un registro valido de personal.'),
    }
  }

  return { data, error: null }
}

export async function listRolesForPersonal() {
  const { data, error } = await supabase
    .from('roles')
    .select(
      `
      id,
      nombre
    `
    )
    .in('nombre', ['admin_rectorado', 'coordinador_clubes', 'guardia'])
    .order('id', { ascending: true })

  return { data: data ?? [], error }
}

export async function listUsuarios() {
  const { data, error } = await supabase
    .from('v_personal_con_roles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error }
  }

  const users = data ?? []
  const userIds = users.map((item) => item.user_id).filter(Boolean)

  if (!userIds.length) {
    return { data: users, error: null }
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select(
      `
      id,
      rol_id
    `
    )
    .in('id', userIds)

  if (profilesError) {
    return { data: [], error: profilesError }
  }

  const roleMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.rol_id]))

  return {
    data: users.map((item) => ({
      ...item,
      rol_id: item.rol_id ?? roleMap.get(item.user_id) ?? '',
    })),
    error: null,
  }
}

export async function createUsuario(payload) {
  return createStaffWithAccount(payload)
}

export async function updateUsuario(id, payload) {
  const usuarioPayload = normalizeUsuarioPayload(payload)

  const { data: personal, error: personalError } = await supabase
    .from('personal')
    .update({
      cedula: usuarioPayload.cedula,
      tipo_identificacion: usuarioPayload.tipo_identificacion,
      nombres: usuarioPayload.nombres,
      apellidos: usuarioPayload.apellidos,
      fecha_nacimiento: usuarioPayload.fecha_nacimiento,
      telefono: usuarioPayload.telefono,
      estado: usuarioPayload.estado,
    })
    .eq('id', id)
    .select(
      `
      id,
      user_id,
      cedula,
      tipo_identificacion,
      nombres,
      apellidos,
      fecha_nacimiento,
      telefono,
      correo_institucional,
      cuenta_creada,
      estado
    `
    )
    .single()

  if (personalError) {
    return { data: null, error: personalError }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      rol_id: usuarioPayload.rol_id,
      email: personal.correo_institucional || null,
      nombres: usuarioPayload.nombres,
      apellidos: usuarioPayload.apellidos,
      cedula: usuarioPayload.cedula,
      tipo_identificacion: usuarioPayload.tipo_identificacion,
      fecha_nacimiento: usuarioPayload.fecha_nacimiento,
      telefono: usuarioPayload.telefono,
      estado: usuarioPayload.estado,
    })
    .eq('id', personal.user_id)

  if (profileError) {
    return { data: null, error: profileError }
  }

  return { data: personal, error: null }
}
