import { useState } from 'react'
import { CLUB_DAYS, getClubDayLabel } from '../../../services/clubesService'

const INITIAL_FORM = {
  nombre: '',
  descripcion: '',
  hora_inicio: '',
  hora_fin: '',
  estado: 'true',
  modo_asistencia: 'todos_los_dias',
  dias_minimos_requeridos: '',
}

export function ClubForm({ initialData, submitting, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => getInitialForm(initialData))
  const [selectedDays, setSelectedDays] = useState(() => initialData?.dias ?? [])
  const [error, setError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'modo_asistencia' && value === 'todos_los_dias'
        ? { dias_minimos_requeridos: '' }
        : {}),
    }))
  }

  const handleToggleDay = (dayValue) => {
    setSelectedDays((current) =>
      current.includes(dayValue)
        ? current.filter((item) => item !== dayValue)
        : [...current, dayValue].sort((a, b) => a - b)
    )
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    if (!form.nombre.trim()) {
      setError('Ingresa el nombre del club.')
      return
    }

    if (!selectedDays.length) {
      setError('Selecciona al menos un dia para el club.')
      return
    }

    if (!form.hora_inicio || !form.hora_fin || form.hora_fin <= form.hora_inicio) {
      setError('La hora de fin debe ser mayor que la hora de inicio.')
      return
    }

    if (form.modo_asistencia === 'dias_seleccionables') {
      const minimumRequired = Number(form.dias_minimos_requeridos)

      if (!minimumRequired) {
        setError('Define los dias minimos requeridos para el club flexible.')
        return
      }

      if (minimumRequired > selectedDays.length) {
        setError('Los dias minimos no pueden superar los dias disponibles del club.')
        return
      }
    }

    onSubmit(
      {
        ...form,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        estado: form.estado === 'true',
        dias_minimos_requeridos:
          form.modo_asistencia === 'dias_seleccionables'
            ? Number(form.dias_minimos_requeridos)
            : null,
      },
      selectedDays
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {initialData ? 'Editar club' : 'Nuevo club'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Configura nombre, horario, dias y modalidad de asistencia del club.
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
        <Field label="Nombre del club">
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
            name="estado"
            value={form.estado}
            onChange={handleChange}
            className="input"
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </Field>

        <Field label="Hora inicio">
          <input
            type="time"
            name="hora_inicio"
            value={form.hora_inicio}
            onChange={handleChange}
            required
            className="input"
          />
        </Field>

        <Field label="Hora fin">
          <input
            type="time"
            name="hora_fin"
            value={form.hora_fin}
            onChange={handleChange}
            required
            className="input"
          />
        </Field>

        <Field label="Modo de asistencia">
          <select
            name="modo_asistencia"
            value={form.modo_asistencia}
            onChange={handleChange}
            className="input"
          >
            <option value="todos_los_dias">Todos los dias</option>
            <option value="dias_seleccionables">Dias seleccionables</option>
          </select>
        </Field>

        {form.modo_asistencia === 'dias_seleccionables' ? (
          <Field label="Dias minimos requeridos">
            <input
              type="number"
              min="1"
              name="dias_minimos_requeridos"
              value={form.dias_minimos_requeridos}
              onChange={handleChange}
              required
              className="input"
            />
          </Field>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Este club exigira asistencia en todos los dias configurados.
          </div>
        )}
      </div>

      <Field label="Descripcion" className="mt-4 block">
        <textarea
          name="descripcion"
          value={form.descripcion}
          onChange={handleChange}
          rows={4}
          className="input min-h-28"
        />
      </Field>

      <div className="mt-6">
        <p className="text-sm font-medium text-slate-700">Dias del club</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CLUB_DAYS.map((day) => {
            const checked = selectedDays.includes(day.value)

            return (
              <label
                key={day.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                  checked
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggleDay(day.value)}
                  className="sr-only"
                />
                <span className="font-medium">{getClubDayLabel(day.value)}</span>
              </label>
            )
          })}
        </div>
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
          {submitting ? 'Guardando...' : 'Guardar club'}
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
    nombre: initialData.nombre ?? '',
    descripcion: initialData.descripcion ?? '',
    hora_inicio: initialData.hora_inicio ? String(initialData.hora_inicio).slice(0, 5) : '',
    hora_fin: initialData.hora_fin ? String(initialData.hora_fin).slice(0, 5) : '',
    estado: String(initialData.estado ?? true),
    modo_asistencia: initialData.modo_asistencia ?? 'todos_los_dias',
    dias_minimos_requeridos: initialData.dias_minimos_requeridos ?? '',
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
