/* global Deno */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const projectUrl = Deno.env.get('PROJECT_URL') ?? ''
const anonKey = Deno.env.get('ANON_KEY') ?? ''
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function preflightResponse() {
  return new Response('ok', {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

function buildAnonClient(token) {
  return createClient(projectUrl, anonKey, {
    global: {
      headers: {
        Authorization: token,
      },
    },
  })
}

function buildServiceClient() {
  return createClient(projectUrl, serviceRoleKey)
}

function normalizeBoolean(value) {
  return value === true || value === 'true'
}

function normalizeFirstWord(value) {
  return (
    String(value ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0] ?? ''
  )
}

function sanitizeEmailPart(value) {
  return normalizeFirstWord(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

function randomIndex(source) {
  const randomValues = new Uint32Array(1)
  crypto.getRandomValues(randomValues)
  return randomValues[0] % source.length
}

function generateTemporaryPassword() {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowercase = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'

  return [
    uppercase[randomIndex(uppercase)],
    lowercase[randomIndex(lowercase)],
    lowercase[randomIndex(lowercase)],
    lowercase[randomIndex(lowercase)],
    lowercase[randomIndex(lowercase)],
    digits[randomIndex(digits)],
    digits[randomIndex(digits)],
    uppercase[randomIndex(uppercase)],
    digits[randomIndex(digits)],
  ].join('')
}

async function ensureAdminCaller(serviceClient, token) {
  const anonClient = buildAnonClient(token)
  const {
    data: { user },
    error: userError,
  } = await anonClient.auth.getUser()

  if (userError || !user) {
    throw new Error('No se pudo validar la sesion del administrador.')
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select(
      `
      id,
      rol:roles!profiles_rol_id_fkey (
        nombre
      )
    `
    )
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw new Error('No se pudo validar el rol del administrador.')
  }

  const roleName = Array.isArray(profile?.rol)
    ? profile.rol[0]?.nombre
    : profile?.rol?.nombre

  if (roleName !== 'admin_rectorado') {
    throw new Error('No tienes permisos para crear cuentas del personal.')
  }
}

async function getRoleById(serviceClient, roleId) {
  const { data, error } = await serviceClient
    .from('roles')
    .select(
      `
      id,
      nombre
    `
    )
    .eq('id', roleId)
    .single()

  if (error || !data) {
    throw new Error('No se encontro el rol seleccionado.')
  }

  if (!['admin_rectorado', 'coordinador_clubes', 'guardia'].includes(data.nombre)) {
    throw new Error('El rol seleccionado no es valido para personal institucional.')
  }

  return data
}

async function generateBaseInstitutionalEmail(serviceClient, nombres, apellidos) {
  const { data, error } = await serviceClient.rpc('generar_correo_institucional', {
    p_nombres: nombres,
    p_apellidos: apellidos,
  })

  if (!error && data) {
    return String(data).toLowerCase()
  }

  const firstName = sanitizeEmailPart(nombres)
  const firstLastName = sanitizeEmailPart(apellidos)
  return `${firstName}.${firstLastName}@edunova.edu.ec`
}

async function emailExists(serviceClient, email) {
  const [profilesResult, estudiantesResult, personalResult] = await Promise.all([
    serviceClient.from('profiles').select('id').eq('email', email).maybeSingle(),
    serviceClient
      .from('estudiantes')
      .select('id')
      .eq('correo_institucional', email)
      .maybeSingle(),
    serviceClient
      .from('personal')
      .select('id')
      .eq('correo_institucional', email)
      .maybeSingle(),
  ])

  if (profilesResult.error) throw profilesResult.error
  if (estudiantesResult.error) throw estudiantesResult.error
  if (personalResult.error) throw personalResult.error

  return Boolean(profilesResult.data || estudiantesResult.data || personalResult.data)
}

async function buildUniqueInstitutionalEmail(serviceClient, nombres, apellidos) {
  const baseEmail = await generateBaseInstitutionalEmail(
    serviceClient,
    nombres,
    apellidos
  )

  const [localPart, domain = 'edunova.edu.ec'] = baseEmail.split('@')
  let candidate = `${localPart}@${domain}`
  let suffix = 0

  while (await emailExists(serviceClient, candidate)) {
    suffix += 1
    candidate = `${localPart}${suffix}@${domain}`
  }

  return candidate
}

async function cedulaExists(serviceClient, cedula) {
  const [profilesResult, personalResult] = await Promise.all([
    serviceClient.from('profiles').select('id').eq('cedula', cedula).maybeSingle(),
    serviceClient.from('personal').select('id').eq('cedula', cedula).maybeSingle(),
  ])

  if (profilesResult.error) throw profilesResult.error
  if (personalResult.error) throw personalResult.error

  return Boolean(profilesResult.data || personalResult.data)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return preflightResponse()
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Metodo no permitido.' }, 405)
  }

  try {
    if (!projectUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        {
          error:
            'Faltan variables de entorno. Verifica PROJECT_URL, ANON_KEY y SERVICE_ROLE_KEY.',
        },
        500
      )
    }

    const authorization = request.headers.get('Authorization')

    if (!authorization) {
      return jsonResponse({ error: 'Falta el token de autorizacion.' }, 401)
    }

    const serviceClient = buildServiceClient()
    await ensureAdminCaller(serviceClient, authorization)

    const payload = await request.json()
    const nombres = String(payload?.nombres ?? '').trim()
    const apellidos = String(payload?.apellidos ?? '').trim()
    const cedula = String(payload?.cedula ?? '').trim()
    const tipoIdentificacion = String(
      payload?.tipo_identificacion ?? 'cedula_ecuatoriana'
    ).trim()
    const roleId = Number(payload?.rol_id)

    if (!nombres || !apellidos || !cedula || !roleId) {
      return jsonResponse(
        {
          error: 'Nombres, apellidos, cedula y rol son obligatorios para crear la cuenta.',
        },
        400
      )
    }

    if (await cedulaExists(serviceClient, cedula)) {
      return jsonResponse(
        { error: 'Ya existe una persona del sistema con esa cedula.' },
        400
      )
    }

    const role = await getRoleById(serviceClient, roleId)
    const correoInstitucional = await buildUniqueInstitutionalEmail(
      serviceClient,
      nombres,
      apellidos
    )
    const temporaryPassword = generateTemporaryPassword()

    const { data: authResult, error: authError } =
      await serviceClient.auth.admin.createUser({
        email: correoInstitucional,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          nombres,
          apellidos,
        },
      })

    if (authError || !authResult?.user?.id) {
      return jsonResponse(
        { error: authError?.message || 'No se pudo crear el usuario en Auth.' },
        400
      )
    }

    const authUserId = authResult.user.id

    const { error: profileError } = await serviceClient
      .from('profiles')
      .update({
        rol_id: role.id,
        email: correoInstitucional,
        nombres,
        apellidos,
        tipo_identificacion: tipoIdentificacion,
        cedula,
        fecha_nacimiento: payload?.fecha_nacimiento || null,
        telefono: payload?.telefono?.trim() || null,
        estado: normalizeBoolean(payload?.estado),
      })
      .eq('id', authUserId)

    if (profileError) {
      await serviceClient.auth.admin.deleteUser(authUserId)
      return jsonResponse(
        { error: profileError.message || 'No se pudo actualizar el perfil del usuario.' },
        400
      )
    }

    const personalPayload = {
      user_id: authUserId,
      tipo_identificacion: tipoIdentificacion,
      cedula,
      nombres,
      apellidos,
      fecha_nacimiento: payload?.fecha_nacimiento || null,
      telefono: payload?.telefono?.trim() || null,
      correo_institucional: correoInstitucional,
      cuenta_creada: true,
      estado: normalizeBoolean(payload?.estado),
    }

    const { data: staff, error: staffError } = await serviceClient
      .from('personal')
      .insert(personalPayload)
      .select(
        `
        id,
        user_id,
        tipo_identificacion,
        cedula,
        nombres,
        apellidos,
        correo_institucional,
        cuenta_creada,
        estado
      `
      )
      .single()

    if (staffError) {
      await serviceClient.auth.admin.deleteUser(authUserId)
      return jsonResponse(
        { error: staffError.message || 'No se pudo crear el registro del personal.' },
        400
      )
    }

    return jsonResponse({
      staff: {
        ...staff,
        rol_nombre: role.nombre,
      },
      credentials: {
        email: correoInstitucional,
        temporaryPassword,
      },
    })
  } catch (error) {
    console.error('[create-staff-account] unexpected_error', error)

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Ocurrio un error al crear la cuenta del personal.',
      },
      500
    )
  }
})
