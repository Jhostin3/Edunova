import { useState } from 'react'

const INITIAL_FORM = {
  nivel: '',
  paralelo: '',
  especialidad: '',
  descripcion: '',
  estado: 'true',
}

export function CursoForm({ initialData, submitting, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => getInitialForm(initialData))

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({
      ...form,
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
            {initialData ? 'Editar curso' : 'Nuevo curso'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            El nombre del curso se genera automaticamente a partir de nivel, paralelo y especialidad.
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
        <Field label="Nivel">
          <input name="nivel" value={form.nivel} onChange={handleChange} required className="input" />
        </Field>
        <Field label="Paralelo">
          <input name="paralelo" value={form.paralelo} onChange={handleChange} required className="input" />
        </Field>
        <Field label="Especialidad">
          <input name="especialidad" value={form.especialidad} onChange={handleChange} required className="input" />
        </Field>
        <Field label="Estado">
          <select name="estado" value={form.estado} onChange={handleChange} className="input">
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </Field>
      </div>

      <Field label="Descripcion" className="mt-4">
        <textarea
          name="descripcion"
          value={form.descripcion}
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
          disabled={submitting}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? 'Guardando...' : 'Guardar curso'}
        </button>
      </div>
    </form>
  )
}

function getInitialForm(initialData) {
  if (!initialData) return INITIAL_FORM

  return {
    nivel: initialData.nivel ?? '',
    paralelo: initialData.paralelo ?? '',
    especialidad: initialData.especialidad ?? '',
    descripcion: initialData.descripcion ?? '',
    estado: String(initialData.estado ?? true),
  }
}

function Field({ label, children, className = '' }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
