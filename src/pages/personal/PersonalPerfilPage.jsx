import { useEffect, useState } from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { IdentificationFields } from '../../components/forms/IdentificationFields'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import {
  formatPersonalDate,
  getPersonalProfileData,
  updatePersonalProfile,
} from '../../services/personalAccountService'
import {
  IDENTIFICATION_TYPE_LABELS,
  inferIdentificationType,
  validateIdentification,
} from '../../utils/identification'

export function PersonalPerfilPage({ title = 'Mi perfil', description }) {
  const { user } = useAuth()
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    tipo_identificacion: 'cedula_ecuatoriana',
    cedula: '',
    fecha_nacimiento: '',
    telefono: '',
    estado: 'true',
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
        setForm({
          nombres: data.personal?.nombres ?? '',
          apellidos: data.personal?.apellidos ?? '',
          tipo_identificacion: inferIdentificationType(
            data.personal?.cedula,
            data.personal?.tipo_identificacion
          ),
          cedula: data.personal?.cedula ?? '',
          fecha_nacimiento: data.personal?.fecha_nacimiento ?? '',
          telefono: data.personal?.telefono ?? '',
          estado: String(data.personal?.estado ?? true),
        })
      }

      setLoading(false)
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!profileData?.personal?.id || !user?.id) return

    const identificationError = validateIdentification(
      form.tipo_identificacion,
      form.cedula
    )
    if (identificationError) {
      setError(identificationError)
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const { data, error: updateError } = await updatePersonalProfile(
      user.id,
      profileData.personal.id,
      {
        ...form,
        estado: form.estado === 'true',
      }
    )

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setProfileData((current) => ({
      ...current,
      personal: {
        ...current.personal,
        ...data,
      },
    }))
    setSuccess('Tu perfil se actualizo correctamente.')
    setSaving(false)
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

  if (error && !profileData) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <EmptyState title="No se pudo cargar tu perfil" description={error} />
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

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Resumen actual</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Nombres" value={profileData.personal?.nombres || '-'} />
            <InfoItem label="Apellidos" value={profileData.personal?.apellidos || '-'} />
            <InfoItem
              label="Identificación"
              value={
                <IdentificationSummary
                  value={profileData.personal?.cedula}
                  type={profileData.personal?.tipo_identificacion}
                />
              }
            />
            <InfoItem
              label="Fecha de nacimiento"
              value={formatPersonalDate(profileData.personal?.fecha_nacimiento)}
            />
            <InfoItem label="Telefono" value={profileData.personal?.telefono || '-'} />
            <InfoItem
              label="Estado"
              value={<StatusBadge isActive={profileData.personal?.estado} />}
            />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">Editar mis datos</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Nombres">
              <input
                name="nombres"
                value={form.nombres}
                onChange={handleChange}
                required
                className="input"
              />
            </Field>

            <Field label="Apellidos">
              <input
                name="apellidos"
                value={form.apellidos}
                onChange={handleChange}
                required
                className="input"
              />
            </Field>

            <IdentificationFields
              type={form.tipo_identificacion}
              value={form.cedula}
              onTypeChange={(value) =>
                setForm((current) => ({
                  ...current,
                  tipo_identificacion: value,
                }))
              }
              onValueChange={(value) =>
                setForm((current) => ({ ...current, cedula: value }))
              }
            />

            <Field label="Fecha de nacimiento">
              <input
                type="date"
                name="fecha_nacimiento"
                value={form.fecha_nacimiento}
                onChange={handleChange}
                className="input"
              />
            </Field>

            <Field label="Telefono">
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                className="input"
              />
            </Field>

            <Field label="Estado">
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                className="input"
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </Field>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <label className={className}>
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

function StatusBadge({ isActive }) {
  if (typeof isActive !== 'boolean') {
    return <span>-</span>
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isActive
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-rose-100 text-rose-700'
      }`}
    >
      {isActive ? 'Activo' : 'Inactivo'}
    </span>
  )
}

function IdentificationSummary({ value, type }) {
  const finalType = inferIdentificationType(value, type)

  return (
    <div>
      <p>{value || '-'}</p>
      <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        {IDENTIFICATION_TYPE_LABELS[finalType]}
      </span>
    </div>
  )
}
