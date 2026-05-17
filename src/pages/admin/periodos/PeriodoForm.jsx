import { useState } from 'react'

const INITIAL_FORM = {
  nombre: '',
  fecha_inicio: '',
  fecha_fin: '',
  activo: 'false',
}

export function PeriodoForm({ initialData, submitting, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => getInitialForm(initialData))

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({
      ...form,
      nombre: form.nombre.trim(),
      activo: form.activo === 'true',
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
            {initialData ? 'Editar periodo lectivo' : 'Nuevo periodo lectivo'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Define el rango de fechas y el estado activo del periodo.
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
        <Field label="Nombre">
          <input
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
            className="input"
          />
        </Field>

        <Field label="Estado">
          <select
            name="activo"
            value={form.activo}
            onChange={handleChange}
            className="input"
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </Field>

        <Field label="Fecha de inicio">
          <input
            name="fecha_inicio"
            type="date"
            value={form.fecha_inicio}
            onChange={handleChange}
            required
            className="input"
          />
        </Field>

        <Field label="Fecha de fin">
          <input
            name="fecha_fin"
            type="date"
            value={form.fecha_fin}
            onChange={handleChange}
            required
            className="input"
          />
        </Field>
      </div>

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
          disabled={submitting}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? 'Guardando...' : 'Guardar periodo'}
        </button>
      </div>
    </form>
  )
}

function getInitialForm(initialData) {
  if (!initialData) return INITIAL_FORM

  return {
    nombre: initialData.nombre ?? '',
    fecha_inicio: initialData.fecha_inicio ?? '',
    fecha_fin: initialData.fecha_fin ?? '',
    activo: String(initialData.activo ?? false),
  }
}

function Field({ label, children }) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}
