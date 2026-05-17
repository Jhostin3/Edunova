import { useMemo, useState } from 'react'
import {
  findStudentByCedula,
  inscribirEstudianteEnClub,
} from '../../../services/inscripcionClubService'
import { formatClubDays, getClubDayLabel } from '../../../services/clubesService'
import {
  IDENTIFICATION_TYPE_LABELS,
  inferIdentificationType,
} from '../../../utils/identification'

export function InscripcionClubForm({ club, coordinadorId, onCancel, onSuccess }) {
  const [cedula, setCedula] = useState('')
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [student, setStudent] = useState(null)
  const [selectedDays, setSelectedDays] = useState([])

  const minimumRequired = Number(club?.dias_minimos_requeridos ?? 0)
  const availableDays = useMemo(() => club?.dias ?? [], [club?.dias])

  const handleSearch = async () => {
    setError('')
    setStudent(null)
    setSelectedDays([])

    if (!cedula.trim()) {
      setError('Ingresa la identificación del estudiante.')
      return
    }

    setSearching(true)
    const { data, error: searchError } = await findStudentByCedula(cedula)
    if (searchError) {
      setError(searchError.message)
    } else {
      setStudent(data)
      if (club.modo_asistencia === 'todos_los_dias') {
        setSelectedDays(availableDays)
      }
    }
    setSearching(false)
  }

  const handleToggleDay = (dayValue) => {
    setSelectedDays((current) =>
      current.includes(dayValue)
        ? current.filter((item) => item !== dayValue)
        : [...current, dayValue].sort((a, b) => a - b)
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!student?.id) {
      setError('Primero busca y selecciona un estudiante valido.')
      return
    }

    if (club.modo_asistencia === 'dias_seleccionables' && selectedDays.length < minimumRequired) {
      setError(`Debes seleccionar al menos ${minimumRequired} dia(s).`)
      return
    }

    setSubmitting(true)
    const { error: saveError } = await inscribirEstudianteEnClub({
      estudianteId: student.id,
      clubId: club.id,
      diasSeleccionados: selectedDays,
      coordinadorId,
    })

    if (saveError) {
      setError(saveError.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onSuccess()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Inscribir estudiante</h2>
          <p className="mt-1 text-sm text-slate-500">
            Busca al estudiante por identificación y completa la inscripcion segun el modo del club.
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

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Identificación
          </span>
          <input
            value={cedula}
            onChange={(event) => setCedula(event.target.value.toUpperCase())}
            className="input"
            placeholder="Ej: 0102030405 o AB1234567"
          />
        </label>

        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="mt-7 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {searching ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {student ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoItem
              label="Estudiante"
              value={`${student.nombres} ${student.apellidos}`}
            />
            <InfoItem
              label="Identificación"
              value={<IdentificationSummary student={student} />}
            />
            <InfoItem label="Curso actual" value={student.curso_actual_label} />
            <InfoItem
              label="Correo institucional"
              value={student.correo_institucional || '-'}
            />
          </div>
        </div>
      ) : null}

      {student ? (
        club.modo_asistencia === 'todos_los_dias' ? (
          <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-700">
            Este club requiere asistencia en todos los dias configurados:
            <span className="ml-1 font-semibold">{formatClubDays(availableDays)}</span>
          </div>
        ) : (
          <div className="mt-5">
            <p className="text-sm font-medium text-slate-700">Dias asignados al estudiante</p>
            <p className="mt-1 text-sm text-slate-500">
              Selecciona al menos {minimumRequired} dia(s) disponibles del club.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {availableDays.map((day) => {
                const checked = selectedDays.includes(day)

                return (
                  <label
                    key={day}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                      checked
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleDay(day)}
                      className="sr-only"
                    />
                    <span className="font-medium">{getClubDayLabel(day)}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      ) : null}

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
          disabled={!student || submitting}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? 'Inscribiendo...' : 'Guardar inscripcion'}
        </button>
      </div>
    </form>
  )
}

function IdentificationSummary({ student }) {
  const type = inferIdentificationType(
    student?.cedula,
    student?.tipo_identificacion
  )

  return (
    <div>
      <p>{student?.cedula || '-'}</p>
      <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        {IDENTIFICATION_TYPE_LABELS[type]}
      </span>
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-1 text-sm text-slate-800">{value}</div>
    </div>
  )
}
