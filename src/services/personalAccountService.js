import { supabase } from './supabaseClient'

export function formatPersonalDate(value) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

async function getPersonalBaseData(userId) {
  const { data: personal, error: personalError } = await supabase
    .from('personal')
    .select(
      `
      id,
      user_id,
      tipo_identificacion,
      cedula,
      nombres,
      apellidos,
      fecha_nacimiento,
      telefono,
      correo_institucional,
      cuenta_creada,
      estado,
      created_at,
      updated_at
    `
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (personalError) {
    return { data: null, error: personalError }
  }

  if (!personal) {
    return {
      data: null,
      error: new Error('No se encontro un miembro del personal asociado a esta cuenta.'),
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      `
      id,
      email,
      rol_id,
      estado,
      rol:roles!profiles_rol_id_fkey (
        id,
        nombre
      )
    `
    )
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    return { data: null, error: profileError }
  }

  return {
    data: {
      personal,
      profile: {
        ...profile,
        rol: Array.isArray(profile?.rol) ? profile.rol[0] ?? null : profile?.rol ?? null,
      },
    },
    error: null,
  }
}

export async function getPersonalProfileData(userId) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase no esta configurado.'),
    }
  }

  return getPersonalBaseData(userId)
}

export async function updatePersonalProfile(userId, personalId, payload) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase no esta configurado.'),
    }
  }

  const normalizedPayload = {
    nombres: payload.nombres?.trim() ?? '',
    apellidos: payload.apellidos?.trim() ?? '',
    tipo_identificacion: payload.tipo_identificacion || 'cedula_ecuatoriana',
    cedula: payload.cedula?.trim() ?? '',
    fecha_nacimiento: payload.fecha_nacimiento || null,
    telefono: payload.telefono?.trim() || null,
    estado: Boolean(payload.estado),
  }

  const { data: personal, error: personalError } = await supabase
    .from('personal')
    .update(normalizedPayload)
    .eq('id', personalId)
    .eq('user_id', userId)
    .select(
      `
      id,
      user_id,
      tipo_identificacion,
      cedula,
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
      nombres: normalizedPayload.nombres,
      apellidos: normalizedPayload.apellidos,
      cedula: normalizedPayload.cedula,
      tipo_identificacion: normalizedPayload.tipo_identificacion,
      fecha_nacimiento: normalizedPayload.fecha_nacimiento,
      telefono: normalizedPayload.telefono,
      estado: normalizedPayload.estado,
    })
    .eq('id', userId)

  if (profileError) {
    return { data: null, error: profileError }
  }

  return { data: personal, error: null }
}

export async function updatePersonalPassword({
  email,
  currentPassword,
  nextPassword,
}) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase no esta configurado.'),
    }
  }

  const trimmedEmail = String(email ?? '').trim()

  if (!trimmedEmail) {
    return {
      data: null,
      error: new Error('No se encontro el correo institucional de esta cuenta.'),
    }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password: currentPassword,
  })

  if (signInError) {
    return {
      data: null,
      error: new Error('La contrasena actual es incorrecta.'),
    }
  }

  const { data, error } = await supabase.auth.updateUser({
    password: nextPassword,
  })

  return { data, error }
}
