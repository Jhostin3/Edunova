import { useEffect, useState } from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import {
  getPersonalProfileData,
  updatePersonalPassword,
} from '../../services/personalAccountService'

export function PersonalCuentaPage({ title = 'Mi cuenta', description }) {
  const { user } = useAuth()
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setProfileData(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setError('')

      const { data, error: requestError } = await getPersonalProfileData(user.id)

      if (cancelled) return

      if (requestError) {
        setProfileData(null)
        setError(requestError.message)
      } else {
        setProfileData(data)
      }

      setLoading(false)
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const handlePasswordChange = async (event) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordMessage('')

    if (
      !passwordForm.currentPassword ||
      !passwordForm.password ||
      !passwordForm.confirmPassword
    ) {
      setPasswordError('Completa los tres campos para cambiar la contrasena.')
      return
    }

    if (passwordForm.password.length < 8) {
      setPasswordError('La nueva contrasena debe tener al menos 8 caracteres.')
      return
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordError('Las nuevas contrasenas no coinciden.')
      return
    }

    setPasswordSaving(true)

    const email =
      profileData?.personal?.correo_institucional ||
      profileData?.profile?.email ||
      user?.email ||
      ''

    const { error: updateError } = await updatePersonalPassword({
      email,
      currentPassword: passwordForm.currentPassword,
      nextPassword: passwordForm.password,
    })

    if (updateError) {
      setPasswordError(updateError.message)
      setPasswordSaving(false)
      return
    }

    setPasswordForm({
      currentPassword: '',
      password: '',
      confirmPassword: '',
    })
    setPasswordMessage('Contrasena actualizada correctamente.')
    setPasswordSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <EmptyState title="No se pudo cargar tu cuenta" description={error} />
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <EmptyState
          title="No se encontro informacion"
          description="No se encontro una persona del personal asociada a esta cuenta."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Datos de la cuenta</h2>
          <div className="mt-4 grid gap-4">
            <InfoItem
              label="Correo institucional"
              value={
                profileData.personal?.correo_institucional ||
                profileData.profile?.email ||
                user?.email ||
                '-'
              }
            />
            <InfoItem
              label="Estado de cuenta"
              value={<AccountBadge created={profileData.personal?.cuenta_creada} />}
            />
          </div>
        </div>

        <form
          onSubmit={handlePasswordChange}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">Cambiar contrasena</h2>
          <p className="mt-1 text-sm text-slate-500">
            Primero valida tu contrasena actual y luego define una nueva.
          </p>

          <div className="mt-5 space-y-4">
            <Field label="Contrasena actual">
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
                className="input"
                required
              />
            </Field>

            <Field label="Nueva contrasena">
              <input
                type="password"
                value={passwordForm.password}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                className="input"
                minLength={8}
                required
              />
            </Field>

            <Field label="Confirmar nueva contrasena">
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                className="input"
                minLength={8}
                required
              />
            </Field>
          </div>

          {passwordError ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {passwordError}
            </div>
          ) : null}

          {passwordMessage ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {passwordMessage}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={passwordSaving}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {passwordSaving ? 'Actualizando...' : 'Actualizar contrasena'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-1 text-sm text-slate-800">{value}</div>
    </div>
  )
}

function AccountBadge({ created }) {
  const isActive = created === true

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isActive
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-amber-100 text-amber-700'
      }`}
    >
      {isActive ? 'Activa' : 'Pendiente'}
    </span>
  )
}
