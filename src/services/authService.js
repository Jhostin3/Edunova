import { supabase } from './supabaseClient'
import { getLoginErrorMessage } from './authErrors'

/**
 * @param {string} email
 * @param {string} password
 * @returns {{ error: Error | null }}
 */
export async function signInWithEmail(email, password) {
  if (!supabase) {
    return { error: new Error('Supabase no esta configurado') }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  return { error: error ? new Error(getLoginErrorMessage(error)) : null }
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
}

/**
 * Consulta robusta del perfil + rol.
 * 1) Intenta traer el rol por join via FK explicita
 * 2) Si el join no viene pero rol_id existe, hace fallback a roles
 *
 * Si el nombre real de la FK no es profiles_rol_id_fkey, verifica en Supabase:
 * Database -> Table Editor -> profiles -> Foreign Keys
 * y reemplaza el nombre en roles!profiles_rol_id_fkey
 */
export async function fetchProfileWithRole(userId) {
  if (!supabase) {
    return {
      profile: null,
      role: null,
      error: new Error('Supabase no esta configurado'),
    }
  }

  console.log('[auth] fetchProfileWithRole:start', { userId })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      `
      id,
      email,
      rol_id,
      nombres,
      apellidos,
      telefono,
      estado,
      created_at,
      updated_at,
      rol:roles!profiles_rol_id_fkey (
        id,
        nombre
      )
    `
    )
    .eq('id', userId)
    .single()

  console.log('[auth] fetchProfileWithRole:profile_result', {
    userId,
    profile,
    profileError,
  })

  if (profileError || !profile) {
    return {
      profile: null,
      role: null,
      error: new Error(profileError?.message ?? 'No se encontro el perfil'),
    }
  }

  let role = Array.isArray(profile.rol) ? profile.rol[0] ?? null : profile.rol ?? null

  if (!role?.nombre && profile.rol_id) {
    const { data: fallbackRole, error: roleError } = await supabase
      .from('roles')
      .select('id, nombre')
      .eq('id', profile.rol_id)
      .single()

    console.log('[auth] fetchProfileWithRole:fallback_role_result', {
      userId,
      rol_id: profile.rol_id,
      fallbackRole,
      roleError,
    })

    if (roleError || !fallbackRole) {
      return {
        profile: {
          ...profile,
          rol: null,
        },
        role: null,
        error: new Error(
          roleError?.message ?? 'No se encontro el rol asociado al perfil'
        ),
      }
    }

    role = fallbackRole
  }

  const normalizedProfile = {
    ...profile,
    rol: role,
  }

  console.log('[auth] fetchProfileWithRole:done', {
    userId,
    profile: normalizedProfile,
    roleName: role?.nombre ?? null,
  })

  return {
    profile: normalizedProfile,
    role,
    error: null,
  }
}
