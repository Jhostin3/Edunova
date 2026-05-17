import { useState } from 'react'
import { IdentificationFields } from '../../components/forms/IdentificationFields'
import {
  inferIdentificationType,
  validateIdentification,
} from '../../utils/identification'

const INITIAL_FORM = {
  nombres: '',
  apellidos: '',
  tipo_identificacion: 'cedula_ecuatoriana',
  cedula: '',
  fecha_nacimiento: '',
  genero: '',
  direccion: '',
  estado: 'true',
  representante_principal_id: '',
  curso_id: '',
}

export function EstudianteForm({
  initialData,
  representantes,
  cursos,
  submitting,
  onCancel,
  onSubmit,
}) {
  const [form, setForm] = useState(() => getInitialForm(initialData))
  const identificationError = validateIdentification(
    form.tipo_identificacion,
    form.cedula
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (identificationError) return

    onSubmit({
      ...form,
      estado: form.estado === 'true',
      tipo_identificacion: form.tipo_identificacion,
      cedula: form.cedula.trim(),
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      direccion: form.direccion.trim(),
      genero: form.genero || null,
      representante_principal_id: form.representante_principal_id || null,
      curso_id: form.curso_id || null,
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
            {initialData ? 'Editar estudiante' : 'Nuevo estudiante'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Completa la informacion base del estudiante. El correo institucional y la contrasena temporal se generan automaticamente al guardar.
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

      <Field label="Representante principal" className="mt-4">
        <select
          name="representante_principal_id"
          value={form.representante_principal_id}
          onChange={handleChange}
          className="input"
        >
          <option value="">Selecciona un representante</option>
          {representantes.map((representante) => (
            <option key={representante.id} value={representante.id}>
              {representante.nombres} {representante.apellidos} -{' '}
              {representante.relacion || 'Sin relacion'}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Curso" className="mt-4">
        <select
          name="curso_id"
          value={form.curso_id}
          onChange={handleChange}
          className="input"
        >
          <option value="">Selecciona un curso</option>
          {cursos.map((curso) => (
            <option key={curso.id} value={curso.id}>
              {curso.nombre ||
                [curso.nivel, curso.paralelo, curso.especialidad]
                  .filter(Boolean)
                  .join(' ')}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Direccion" className="mt-4">
        <textarea
          name="direccion"
          value={form.direccion}
          onChange={handleChange}
          rows={3}
          className="input min-h-24"
        />
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
          {submitting ? 'Guardando...' : 'Guardar estudiante'}
        </button>
      </div>
    </form>
  )
}

function getInitialForm(initialData) {
  if (!initialData) return INITIAL_FORM

  return {
    nombres: initialData.nombres ?? '',
    apellidos: initialData.apellidos ?? '',
    tipo_identificacion: inferIdentificationType(
      initialData.cedula,
      initialData.tipo_identificacion
    ),
    cedula: initialData.cedula ?? '',
    fecha_nacimiento: initialData.fecha_nacimiento ?? '',
    genero: initialData.genero ?? '',
    direccion: initialData.direccion ?? '',
    estado: String(initialData.estado ?? true),
    representante_principal_id: initialData.representante_principal_id ?? '',
    curso_id: initialData.curso_id ?? '',
  }
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
