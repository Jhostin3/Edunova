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
    throw new Error('No tienes permisos para crear cuentas estudiantiles.')
  }
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
  const [profilesResult, estudiantesResult] = await Promise.all([
    serviceClient.from('profiles').select('id').eq('email', email).maybeSingle(),
    serviceClient
      .from('estudiantes')
      .select('id')
      .eq('correo_institucional', email)
      .maybeSingle(),
  ])

  if (profilesResult.error) throw profilesResult.error
  if (estudiantesResult.error) throw estudiantesResult.error

  return Boolean(profilesResult.data || estudiantesResult.data)
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

    if (!nombres || !apellidos || !cedula) {
      return jsonResponse(
        {
          error: 'Nombres, apellidos y cedula son obligatorios para crear la cuenta.',
        },
        400
      )
    }

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

    const estudiantePayload = {
      user_id: authUserId,
      representante_principal_id: payload?.representante_principal_id || null,
      tipo_identificacion: tipoIdentificacion,
      cedula,
      nombres,
      apellidos,
      fecha_nacimiento: payload?.fecha_nacimiento || null,
      genero: payload?.genero || null,
      direccion: payload?.direccion?.trim() || null,
      estado: normalizeBoolean(payload?.estado),
      correo_institucional: correoInstitucional,
      cuenta_creada: true,
    }

    const { data: student, error: studentError } = await serviceClient
      .from('estudiantes')
      .insert(estudiantePayload)
      .select(
        `
        id,
        user_id,
        tipo_identificacion,
        correo_institucional,
        cuenta_creada,
        nombres,
        apellidos
      `
      )
      .single()

    if (studentError) {
      await serviceClient.auth.admin.deleteUser(authUserId)
      return jsonResponse(
        {
          error:
            studentError.message ||
            'No se pudo crear el registro del estudiante.',
        },
        400
      )
    }

    if (payload?.curso_id) {
      const { error: cursoError } = await serviceClient.from('estudiante_curso').insert({
        estudiante_id: student.id,
        curso_id: payload.curso_id,
        fecha_asignacion: new Date().toISOString(),
        estado: true,
      })

      if (cursoError) {
        await serviceClient.from('estudiantes').delete().eq('id', student.id)
        await serviceClient.auth.admin.deleteUser(authUserId)

        return jsonResponse(
          {
            error:
              cursoError.message ||
              'No se pudo asignar el curso inicial del estudiante.',
          },
          400
        )
      }
    }

    return jsonResponse({
      student,
      credentials: {
        email: correoInstitucional,
        temporaryPassword,
      },
    })
  } catch (error) {
    console.error('[create-student-account] unexpected_error', error)

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Ocurrio un error al crear la cuenta estudiantil.',
      },
      500
    )
  }
})
