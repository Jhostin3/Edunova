import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import loginIllustration from '../../../Assets/Login_Image.png'
import { useAuth } from '../../hooks/useAuth'
import { signInWithEmail } from '../../services/authService'
import { isSupabaseConfigured } from '../../services/supabaseClient'
import { getDashboardPathForRole } from '../../utils/roleRedirect'

export function LoginPage() {
  const { user, profile, loading: authLoading, refreshProfile, signOut } =
    useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (!isSupabaseConfigured) {
    return (
      <MinimalShell>
        <StatusCard
          title="Configuracion incompleta"
          description="Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env y reinicia el servidor."
        />
      </MinimalShell>
    )
  }

  if (authLoading) {
    return (
      <MinimalShell>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col items-center justify-center gap-4">
            <div
              className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-sky-700"
              aria-hidden
            />
            <p className="text-sm text-slate-500">Preparando tu acceso...</p>
          </div>
        </div>
      </MinimalShell>
    )
  }

  if (user && profile?.rol?.nombre) {
    const target =
      from && from !== '/login'
        ? from
        : getDashboardPathForRole(profile.rol.nombre)

    if (target) {
      return <Navigate to={target} replace />
    }
  }

  if (user && !profile?.rol?.nombre) {
    return (
      <MinimalShell>
        <StatusCard
          title="Perfil incompleto"
          description="Tu sesion esta activa, pero no encontramos tu perfil o rol dentro de la base de datos."
          actionLabel="Cerrar sesion"
          onAction={() => signOut()}
        />
      </MinimalShell>
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const { error: signErr } = await signInWithEmail(email, password)

      if (signErr) {
        setError(signErr.message)
        return
      }

      const { profile: nextProfile, error: profileErr } = await refreshProfile()

      if (profileErr || !nextProfile || !nextProfile.rol?.nombre) {
        await signOut()
        setError(
          'No se encontro tu perfil o rol. Pide al administrador que te asigne un perfil en la base de datos.'
        )
        return
      }

      const path = getDashboardPathForRole(nextProfile.rol.nombre)

      if (!path) {
        await signOut()
        setError('Rol sin dashboard configurado.')
        return
      }

      navigate(path, { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f6f8fc_0%,_#eef4fb_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-4rem] top-[-4rem] h-56 w-56 rounded-full bg-sky-100/90 blur-3xl" />
        <div className="absolute bottom-[-5rem] right-[-3rem] h-72 w-72 rounded-full bg-indigo-100/80 blur-3xl" />
        <div className="absolute left-1/3 top-1/4 h-40 w-40 rounded-full bg-white/70 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl items-center justify-center">
        <div className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <span className="h-3 w-3 rounded-full bg-rose-300" />
            <span className="h-3 w-3 rounded-full bg-amber-300" />
            <span className="h-3 w-3 rounded-full bg-emerald-300" />
            <div className="ml-4 hidden rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-xs font-medium text-slate-400 sm:block">
              secure.edunova.app
            </div>
          </div>

          <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
            <section className="flex min-h-[680px] items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
              <div className="w-full max-w-md">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                  <span className="h-2 w-2 rounded-full bg-sky-600" />
                  Edunova
                </div>

                <h1 className="mt-8 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
                  Bienvenido de nuevo
                </h1>

                <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
                  Inicia sesion para continuar con tu gestion academica desde
                  una experiencia clara, moderna y segura.
                </p>

                <form onSubmit={handleSubmit} className="mt-10 space-y-5">
                  <InputField
                    label="Correo institucional"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tu.correo@edunova.edu.ec"
                    icon={<MailIcon />}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-slate-700">
                        Contrasena
                      </label>
                      <button
                        type="button"
                        className="text-xs font-medium text-slate-500 transition hover:text-slate-900"
                      >
                        Olvidaste tu contrasena?
                      </button>
                    </div>

                    <div className="group relative">
                      <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-600">
                        <LockIcon />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Ingresa tu contrasena"
                        className="h-14 w-full rounded-full border border-slate-200 bg-white px-14 pr-16 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute inset-y-0 right-3 my-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                        aria-label={
                          showPassword
                            ? 'Ocultar contrasena'
                            : 'Mostrar contrasena'
                        }
                      >
                        <EyeIcon open={showPassword} />
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-14 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_100%)] px-6 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(15,23,42,0.22)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Ingresando...
                      </span>
                    ) : (
                      'Iniciar sesion'
                    )}
                  </button>
                </form>

                <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-4">
                  <p className="text-sm font-medium text-slate-700">
                    Acceso institucional
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Usa tu correo institucional y credenciales asignadas por el
                    administrador del sistema.
                  </p>
                </div>
              </div>
            </section>

            <section className="relative hidden min-h-[680px] items-center justify-center overflow-hidden bg-[linear-gradient(180deg,_#f6fbfa_0%,_#eef6f3_100%)] px-8 py-10 lg:flex xl:px-10">
              <div className="absolute inset-0">
                <div className="absolute left-10 top-12 h-32 w-32 rounded-full bg-emerald-100/70 blur-3xl" />
                <div className="absolute bottom-14 right-10 h-40 w-40 rounded-full bg-sky-100/80 blur-3xl" />
              </div>

              <div className="relative w-full max-w-2xl">
                <div className="rounded-[2.25rem] border border-white/70 bg-white/55 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                  <div className="rounded-[2rem] bg-[linear-gradient(180deg,_#f4faf6_0%,_#edf5f1_100%)] p-6">
                    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
                      <div className="inline-flex items-center rounded-full border border-emerald-100 bg-white/80 px-4 py-1 text-xs font-medium text-slate-500 shadow-sm">
                        Plataforma academica integral
                      </div>

                      <div className="mt-6 w-full rounded-[1.75rem] border border-white/90 bg-white/75 p-5 shadow-[0_24px_55px_rgba(15,23,42,0.08)] backdrop-blur-sm animate-[floatCard_6s_ease-in-out_infinite]">
                        <img
                          src={loginIllustration}
                          alt="Ilustracion de estudiante estudiando para acceder a Edunova"
                          className="mx-auto h-[320px] w-full max-w-md object-contain"
                        />
                      </div>

                      <div className="mt-8 max-w-lg">
                        <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-900">
                          Gestiona <span className="text-sky-700">asistencia</span>,{' '}
                          <span className="text-sky-700">horarios</span> y{' '}
                          <span className="text-sky-700">clubes</span> desde una
                          sola plataforma
                        </h2>
                        <p className="mt-4 text-sm leading-6 text-slate-500">
                          Una experiencia moderna para acompanar la operacion
                          escolar, el seguimiento estudiantil y la coordinacion
                          diaria sin fricciones.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function MinimalShell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f7f9fc_0%,_#edf3fb_100%)] px-4 py-8">
      <div className="w-full max-w-xl">{children}</div>
    </div>
  )
}

function StatusCard({ title, description, actionLabel, onAction }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
        Edunova
      </p>
      <h1 className="mt-5 text-2xl font-semibold text-slate-950">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>

      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

function InputField({
  label,
  type,
  autoComplete,
  value,
  onChange,
  placeholder,
  icon,
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="group relative">
        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-600">
          {icon}
        </span>
        <input
          type={type}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="h-14 w-full rounded-full border border-slate-200 bg-white px-14 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
        />
      </div>
    </div>
  )
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M4 6.5h16v11H4z" />
      <path d="m5 7 7 6 7-6" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M7 10V8a5 5 0 0 1 10 0v2" />
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M12 14v2.5" />
    </svg>
  )
}

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
      >
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M3 3 21 21" />
      <path d="M10.6 10.7A3 3 0 0 0 13.3 13.4" />
      <path d="M9.9 5.2A11.3 11.3 0 0 1 12 5c6.5 0 10 7 10 7a15.5 15.5 0 0 1-4.1 4.7" />
      <path d="M6.2 6.2C3.8 7.8 2 12 2 12a15.8 15.8 0 0 0 8.3 6.4" />
    </svg>
  )
}
