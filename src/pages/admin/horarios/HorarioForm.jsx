import { useEffect, useMemo, useState } from 'react'
import { DIAS_SEMANA } from '../../../services/horarioService'
import {
  formatDuration,
  getScheduleValidation,
} from './horarioFormValidation'

const INITIAL_FORM = {
  largos: {
    dias: [],
    hora_inicio: '',
    hora_fin: '',
    tolerancia_minutos: '0',
    recreo_inicio: '',
    recreo_fin: '',
    almuerzo_inicio: '',
    almuerzo_fin: '',
  },
  cortos: {
    dias: [],
    hora_inicio: '',
    hora_fin: '',
    tolerancia_minutos: '0',
    recreo_inicio: '',
    recreo_fin: '',
    almuerzo_inicio: '',
    almuerzo_fin: '',
  },
}

export function HorarioForm({ cursoId, initialData, submitting, onCancel, onSubmit }) {
  const initialForm = useMemo(() => getInitialForm(initialData), [initialData])
  const [form, setForm] = useState(initialForm)
  const validation = useMemo(
    () => getScheduleValidation(form, cursoId),
    [cursoId, form]
  )

  useEffect(() => {
    setForm(initialForm)
  }, [initialForm])

  const toggleDay = (group, dayValue) => {
    setForm((current) => {
      const currentGroupDays = current[group].dias
      const otherGroup = group === 'largos' ? 'cortos' : 'largos'
      const exists = currentGroupDays.includes(dayValue)

      return {
        ...current,
        [group]: {
          ...current[group],
          dias: exists
            ? currentGroupDays.filter((item) => item !== dayValue)
            : [...currentGroupDays, dayValue],
        },
        [otherGroup]: {
          ...current[otherGroup],
          dias: current[otherGroup].dias.filter((item) => item !== dayValue),
        },
      }
    })
  }

  const updateGroupField = (group, field, value) => {
    setForm((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [field]: value,
      },
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!cursoId) {
      onSubmit({ error: 'Selecciona un curso antes de guardar la jornada semanal.' })
      return
    }

    if (!validation.canSubmit) {
      onSubmit({ error: validation.criticalErrors[0] })
      return
    }

    onSubmit({
      payload: {
        curso_id: cursoId,
        largos: form.largos,
        cortos: {
          ...form.cortos,
          almuerzo_inicio: '',
          almuerzo_fin: '',
        },
      },
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
            Configurar jornada semanal
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Define dias largos con recreo y almuerzo, y dias cortos con un solo recreo.
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

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ScheduleGroupCard
          title="Dias largos"
          description="Incluyen un recreo y almuerzo."
          groupKey="largos"
          values={form.largos}
          status={validation.groups.largos}
          allowLunch
          onToggleDay={toggleDay}
          onFieldChange={updateGroupField}
        />

        <ScheduleGroupCard
          title="Dias cortos"
          description="Incluyen un solo recreo y no llevan almuerzo."
          groupKey="cortos"
          values={form.cortos}
          status={validation.groups.cortos}
          allowLunch={false}
          onToggleDay={toggleDay}
          onFieldChange={updateGroupField}
        />
      </div>

      <ValidationMessages
        errors={validation.criticalErrors}
        warnings={validation.warnings}
      />

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
          disabled={submitting || !validation.canSubmit}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? 'Guardando...' : 'Guardar jornada semanal'}
        </button>
      </div>
    </form>
  )
}

function getInitialForm(initialData) {
  if (!initialData) return INITIAL_FORM

  return {
    largos: {
      dias: initialData.largos?.dias ?? [],
      hora_inicio: initialData.largos?.hora_inicio ?? '',
      hora_fin: initialData.largos?.hora_fin ?? '',
      tolerancia_minutos: String(initialData.largos?.tolerancia_minutos ?? 0),
      recreo_inicio: initialData.largos?.recreo_inicio ?? '',
      recreo_fin: initialData.largos?.recreo_fin ?? '',
      almuerzo_inicio: initialData.largos?.almuerzo_inicio ?? '',
      almuerzo_fin: initialData.largos?.almuerzo_fin ?? '',
    },
    cortos: {
      dias: initialData.cortos?.dias ?? [],
      hora_inicio: initialData.cortos?.hora_inicio ?? '',
      hora_fin: initialData.cortos?.hora_fin ?? '',
      tolerancia_minutos: String(initialData.cortos?.tolerancia_minutos ?? 0),
      recreo_inicio: initialData.cortos?.recreo_inicio ?? '',
      recreo_fin: initialData.cortos?.recreo_fin ?? '',
      almuerzo_inicio: '',
      almuerzo_fin: '',
    },
  }
}

function ScheduleGroupCard({
  title,
  description,
  groupKey,
  values,
  status,
  allowLunch,
  onToggleDay,
  onFieldChange,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <p
        className={[
          'mt-3 rounded-xl border px-3 py-2 text-sm font-medium',
          status.valid
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-white text-slate-600',
        ].join(' ')}
      >
        {formatDuration(status.durationMinutes)}
      </p>

      <div className="mt-4">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Dias
        </span>
        <div className="grid gap-2 sm:grid-cols-2">
          {DIAS_SEMANA.map((dia) => {
            const checked = values.dias.includes(dia.value)

            return (
              <label
                key={`${groupKey}-${dia.value}`}
                className={[
                  'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition',
                  checked
                    ? 'border-sky-200 bg-sky-50 text-sky-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleDay(groupKey, dia.value)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>{dia.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Field label="Hora entrada">
          <input
            type="time"
            value={values.hora_inicio}
            onChange={(event) =>
              onFieldChange(groupKey, 'hora_inicio', event.target.value)
            }
            className="input"
          />
        </Field>

        <Field label="Hora salida">
          <input
            type="time"
            value={values.hora_fin}
            onChange={(event) =>
              onFieldChange(groupKey, 'hora_fin', event.target.value)
            }
            className="input"
          />
        </Field>

        <Field label="Tolerancia (min)">
          <input
            type="number"
            min="0"
            value={values.tolerancia_minutos}
            onChange={(event) =>
              onFieldChange(groupKey, 'tolerancia_minutos', event.target.value)
            }
            className="input"
          />
        </Field>
      </div>

      <div className={`mt-5 grid gap-4 ${allowLunch ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2'}`}>
        <Field label="Recreo inicio">
          <input
            type="time"
            value={values.recreo_inicio}
            onChange={(event) =>
              onFieldChange(groupKey, 'recreo_inicio', event.target.value)
            }
            className="input"
          />
        </Field>

        <Field label="Recreo fin">
          <input
            type="time"
            value={values.recreo_fin}
            onChange={(event) =>
              onFieldChange(groupKey, 'recreo_fin', event.target.value)
            }
            className="input"
          />
        </Field>

        {allowLunch ? (
          <>
            <Field label="Almuerzo inicio">
              <input
                type="time"
                value={values.almuerzo_inicio}
                onChange={(event) =>
                  onFieldChange(groupKey, 'almuerzo_inicio', event.target.value)
                }
                className="input"
              />
            </Field>

            <Field label="Almuerzo fin">
              <input
                type="time"
                value={values.almuerzo_fin}
                onChange={(event) =>
                  onFieldChange(groupKey, 'almuerzo_fin', event.target.value)
                }
                className="input"
              />
            </Field>
          </>
        ) : null}
      </div>

      {status.errors.length ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {status.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : status.valid ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Configuracion valida para este grupo.
        </div>
      ) : null}
    </section>
  )
}

function ValidationMessages({ errors, warnings }) {
  if (!errors.length && !warnings.length) return null

  return (
    <div className="mt-6 space-y-3">
      {errors.length ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      {warnings.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </div>
  )
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
