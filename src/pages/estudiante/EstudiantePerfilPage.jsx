import { useEffect, useState } from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { IdentificationFields } from '../../components/forms/IdentificationFields'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import {
  formatDate,
  getEstudianteProfileData,
  updateEstudianteProfile,
} from '../../services/estudianteDashboardService'
import {
  IDENTIFICATION_TYPE_LABELS,
  inferIdentificationType,
  validateIdentification,
} from '../../utils/identification'

export function EstudiantePerfilPage() {
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
    genero: '',
    direccion: '',
    telefono: '',
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

      const { data, error: requestError } = await getEstudianteProfileData(user.id)

      if (cancelled) return

      if (requestError) {
        setProfileData(null)
        setError(requestError.message)
      } else {
        setProfileData(data)
        setForm({
          nombres: data.estudiante?.nombres ?? '',
          apellidos: data.estudiante?.apellidos ?? '',
          tipo_identificacion: inferIdentificationType(
            data.estudiante?.cedula,
            data.estudiante?.tipo_identificacion
          ),
          cedula: data.estudiante?.cedula ?? '',
          fecha_nacimiento: data.estudiante?.fecha_nacimiento ?? '',
          genero: data.estudiante?.genero ?? '',
          direccion: data.estudiante?.direccion ?? '',
          telefono: data.estudiante?.telefono ?? '',
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

    if (!profileData?.estudiante?.id || !user?.id) return

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

    const { data, error: updateError } = await updateEstudianteProfile(
      user.id,
      profileData.estudiante.id,
      form
    )

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setProfileData((current) => ({
      ...current,
      estudiante: {
        ...current.estudiante,
        ...data,
      },
    }))
    setSuccess('Tu perfil se actualizo correctamente.')
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mi perfil"
          description="Consulta y actualiza tus datos personales."
        />
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
        <PageHeader
          title="Mi perfil"
          description="Consulta y actualiza tus datos personales."
        />
        <EmptyState title="No se pudo cargar tu perfil" description={error} />
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mi perfil"
          description="Consulta y actualiza tus datos personales."
        />
        <EmptyState
          title="No se encontro informacion"
          description="No se encontro un estudiante asociado a esta cuenta."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi perfil"
        description="Mantén actualizada tu informacion personal registrada en el sistema."
      />

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
            <InfoItem label="Nombres" value={profileData.estudiante?.nombres || '-'} />
            <InfoItem label="Apellidos" value={profileData.estudiante?.apellidos || '-'} />
            <InfoItem
              label="Identificación"
              value={
                <IdentificationSummary
                  value={profileData.estudiante?.cedula}
                  type={profileData.estudiante?.tipo_identificacion}
                />
              }
            />
            <InfoItem
              label="Fecha de nacimiento"
              value={formatDate(profileData.estudiante?.fecha_nacimiento)}
            />
            <InfoItem label="Genero" value={profileData.estudiante?.genero || '-'} />
            <InfoItem label="Telefono" value={profileData.estudiante?.telefono || '-'} />
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

            <Field label="Genero">
              <select
                name="genero"
                value={form.genero}
                onChange={handleChange}
                className="input"
              >
                <option value="">Selecciona</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </Field>

            <Field label="Telefono">
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                className="input"
              />
            </Field>
          </div>

          <Field label="Direccion" className="mt-4 block">
            <textarea
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              rows={4}
              className="input min-h-28"
            />
          </Field>

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
