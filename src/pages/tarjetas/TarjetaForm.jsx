import { useState } from 'react'

const INITIAL_FORM = {
  uid_nfc: '',
  estudiante_id: '',
  is_active: true,
  notas: '',
}

export function TarjetaForm({ initialData, submitting, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => getInitialForm(initialData))

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({
      ...form,
      estudiante_id: form.estudiante_id || null,
      uid_nfc: form.uid_nfc.trim(),
      notas: form.notas.trim() || null,
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
            {initialData ? 'Editar tarjeta NFC' : 'Nueva tarjeta NFC'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Asigna o actualiza la informacion base de una tarjeta NFC.
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
        <Field label="UID NFC">
          <input name="uid_nfc" value={form.uid_nfc} onChange={handleChange} required className="input" />
        </Field>
        <Field label="Estudiante ID">
          <input name="estudiante_id" value={form.estudiante_id} onChange={handleChange} className="input" />
        </Field>
      </div>

      <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
        <input
          type="checkbox"
          name="is_active"
          checked={form.is_active}
          onChange={handleChange}
          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
        />
        Tarjeta activa
      </label>

      <Field label="Notas" className="mt-4">
        <textarea
          name="notas"
          value={form.notas}
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
          {submitting ? 'Guardando...' : 'Guardar tarjeta'}
        </button>
      </div>
    </form>
  )
}

function getInitialForm(initialData) {
  if (!initialData) return INITIAL_FORM

  return {
    uid_nfc: initialData.uid_nfc ?? '',
    estudiante_id: initialData.estudiante_id ?? '',
    is_active: initialData.is_active ?? true,
    notas: initialData.notas ?? '',
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
