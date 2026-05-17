import { useState } from 'react'
import { IdentificationFields } from '../../../components/forms/IdentificationFields'
import {
  inferIdentificationType,
  validateIdentification,
} from '../../../utils/identification'

const INITIAL_FORM = {
  nombres: '',
  apellidos: '',
  tipo_identificacion: 'cedula_ecuatoriana',
  cedula: '',
  fecha_nacimiento: '',
  telefono: '',
  rol_id: '',
  estado: 'true',
}

export function UsuarioForm({
  initialData,
  roles,
  submitting,
  onCancel,
  onSubmit,
}) {
  const [form, setForm] = useState(() => getInitialForm(initialData))
  const [error, setError] = useState('')
  const identificationError = validateIdentification(
    form.tipo_identificacion,
    form.cedula
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    if (!form.nombres.trim() || !form.apellidos.trim() || !form.cedula.trim()) {
      setError('Nombres, apellidos e identificación son obligatorios.')
      return
    }

    if (identificationError) {
      setError(identificationError)
      return
    }

    if (!form.rol_id) {
      setError('Selecciona un rol para este usuario.')
      return
    }

    onSubmit({
      ...form,
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      tipo_identificacion: form.tipo_identificacion,
      cedula: form.cedula.trim(),
      telefono: form.telefono.trim(),
      rol_id: Number(form.rol_id),
      estado: form.estado === 'true',
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {initialData ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Crea cuentas institucionales para administradores, coordinadores o guardias.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cerrar
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
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
          error={identificationError}
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
            name="fecha_nacimiento"
            type="date"
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

      <Field label="Rol" className="mt-4">
        <select
          name="rol_id"
          value={form.rol_id}
          onChange={handleChange}
          required
          className="input"
        >
          <option value="">Selecciona un rol</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {getRoleLabel(role.nombre)}
            </option>
          ))}
        </select>
      </Field>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || Boolean(identificationError)}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? 'Guardando...' : 'Guardar usuario'}
        </button>
      </div>
    </form>
  )
}

function getInitialForm(initialData) {
  if (!initialData) {
    return INITIAL_FORM
  }

  return {
    nombres: initialData.nombres ?? '',
    apellidos: initialData.apellidos ?? '',
    tipo_identificacion: inferIdentificationType(
      initialData.cedula,
      initialData.tipo_identificacion
    ),
    cedula: initialData.cedula ?? '',
    fecha_nacimiento: initialData.fecha_nacimiento ?? '',
    telefono: initialData.telefono ?? '',
    rol_id: initialData.rol_id ?? '',
    estado: String(initialData.estado ?? true),
  }
}

function getRoleLabel(roleName) {
  const labels = {
    admin_rectorado: 'Administrador / Rectorado',
    coordinador_clubes: 'Coordinador de clubes',
    guardia: 'Guardia',
  }

  return labels[roleName] ?? roleName
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
