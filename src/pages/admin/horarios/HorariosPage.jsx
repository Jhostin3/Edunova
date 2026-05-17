import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DataTable } from '../../../components/ui/DataTable'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PageHeader } from '../../../components/ui/PageHeader'
import {
  buildHorarioFormInitialData,
  createOrUpdateHorario,
  getCursos,
  getDiaSemanaLabel,
  getHorariosByCurso,
  summarizeHorarios,
} from '../../../services/horarioService'
import { HorarioForm } from './HorarioForm'

export function HorariosPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [cursos, setCursos] = useState([])
  const [horarios, setHorarios] = useState([])
  const [loadingCursos, setLoadingCursos] = useState(true)
  const [loadingHorarios, setLoadingHorarios] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isEditingSchedule, setIsEditingSchedule] = useState(
    searchParams.get('edit') === 'true'
  )
  const selectedCursoId = searchParams.get('curso') ?? ''

  async function loadCursos() {
    setLoadingCursos(true)
    const { data, error: requestError } = await getCursos()
    if (requestError) {
      setError(requestError.message)
      setCursos([])
    } else {
      setCursos(data)
    }
    setLoadingCursos(false)
  }

  async function loadHorarios(cursoId) {
    if (!cursoId) {
      setHorarios([])
      return
    }

    setLoadingHorarios(true)
    const { data, error: requestError } = await getHorariosByCurso(cursoId)
    if (requestError) {
      setError(requestError.message)
      setHorarios([])
    } else {
      setHorarios(data)
    }
    setLoadingHorarios(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCursos()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadHorarios(selectedCursoId)
    }, 0)

    return () => clearTimeout(timer)
  }, [selectedCursoId])

  useEffect(() => {
    setIsEditingSchedule(searchParams.get('edit') === 'true')
  }, [searchParams])

  const selectedCurso = cursos.find((curso) => curso.id === selectedCursoId) ?? null
  const hasHorarios = horarios.length > 0
  const horarioSummary = useMemo(() => summarizeHorarios(horarios), [horarios])
  const formInitialData = useMemo(
    () => buildHorarioFormInitialData(horarios),
    [horarios]
  )

  const handleSubmit = async ({ payload, error: validationError }) => {
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')

    const { error: saveError } = await createOrUpdateHorario(payload)

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    await loadHorarios(selectedCursoId)
    setIsEditingSchedule(false)
    setSearchParams({ curso: selectedCursoId })
    setSaving(false)
  }

  const columns = [
    {
      key: 'dia_semana',
      label: 'Dia',
      render: (row) => getDiaSemanaLabel(row.dia_semana),
    },
    { key: 'hora_inicio', label: 'Hora inicio' },
    { key: 'hora_fin', label: 'Hora fin' },
    { key: 'tolerancia_minutos', label: 'Tolerancia (min)' },
    {
      key: 'pausas',
      label: 'Pausas',
      render: (row) => {
        const pauses = [
          row.recreo_inicio && row.recreo_fin
            ? `Recreo ${row.recreo_inicio}-${row.recreo_fin}`
            : null,
          row.almuerzo_inicio && row.almuerzo_fin
            ? `Almuerzo ${row.almuerzo_inicio}-${row.almuerzo_fin}`
            : null,
        ].filter(Boolean)

        return pauses.length ? pauses.join(' | ') : 'Sin pausas'
      },
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: () => (
        <button
          type="button"
          onClick={() => {
            setIsEditingSchedule(true)
            setSearchParams({ curso: selectedCursoId, edit: 'true' })
            setError('')
          }}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Editar jornada
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horarios por curso"
        description="Configura la jornada semanal con un recreo general y almuerzo solo para los dias largos."
        actionNode={
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <select
              value={selectedCursoId}
              onChange={(event) => {
                const nextCursoId = event.target.value
                setSearchParams(nextCursoId ? { curso: nextCursoId } : {})
                setIsEditingSchedule(false)
                setError('')
              }}
              className="input min-w-72"
              disabled={loadingCursos}
            >
              <option value="">Selecciona un curso</option>
              {cursos.map((curso) => (
                <option key={curso.id} value={curso.id}>
                  {curso.label}
                </option>
              ))}
            </select>

            {selectedCursoId ? (
              <button
                type="button"
                onClick={() => navigate(`/admin/horarios/visual?curso=${selectedCursoId}`)}
                className="inline-flex items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-100"
              >
                Ir a horario visual
              </button>
            ) : null}
          </div>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!selectedCursoId ? (
        <EmptyState
          title="Selecciona un curso"
          description="Elige un curso desde el selector superior para configurar su jornada semanal."
        />
      ) : loadingHorarios ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 shadow-sm">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          </div>
        </div>
      ) : !hasHorarios || isEditingSchedule ? (
        <HorarioForm
          key={`${selectedCursoId}-${isEditingSchedule ? 'edit' : 'new'}`}
          cursoId={selectedCursoId}
          initialData={hasHorarios ? formInitialData : null}
          submitting={saving}
          onCancel={() => {
            setIsEditingSchedule(false)
            setSearchParams(selectedCursoId ? { curso: selectedCursoId } : {})
          }}
          onSubmit={handleSubmit}
        />
      ) : (
        <div className="space-y-4">
          {selectedCurso ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              Curso seleccionado:{' '}
              <span className="font-semibold text-slate-900">
                {selectedCurso.label}
              </span>
            </div>
          ) : null}

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 shadow-sm">
            <p className="font-semibold">
              Este curso ya tiene una jornada semanal configurada.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {horarioSummary.map((group, index) => (
                <div
                  key={`${group.hora_inicio}-${group.hora_fin}-${group.tolerancia_minutos}`}
                  className="rounded-xl border border-emerald-200 bg-white/90 p-4"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {index === 0 ? 'Dias largos' : index === 1 ? 'Dias cortos' : `Grupo ${index + 1}`}
                  </p>
                  <p className="mt-1 text-slate-600">
                    {group.dias.map((dia) => getDiaSemanaLabel(dia)).join(', ')}
                  </p>
                  <p className="mt-2 text-slate-600">
                    {group.hora_inicio} - {group.hora_fin}
                  </p>
                  <p className="text-slate-600">
                    Tolerancia: {group.tolerancia_minutos} min
                  </p>
                  <div className="mt-2 space-y-1 text-slate-600">
                    <p>
                      Recreo:{' '}
                      {group.recreo_inicio && group.recreo_fin
                        ? `${group.recreo_inicio} - ${group.recreo_fin}`
                        : 'No configurado'}
                    </p>
                    <p>
                      Almuerzo:{' '}
                      {group.almuerzo_inicio && group.almuerzo_fin
                        ? `${group.almuerzo_inicio} - ${group.almuerzo_fin}`
                        : 'No configurado'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate(`/admin/horarios/visual?curso=${selectedCursoId}`)}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Ir a horario visual
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingSchedule(true)
                  setSearchParams({ curso: selectedCursoId, edit: 'true' })
                }}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Editar jornada semanal
              </button>
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={horarios}
            loading={loadingHorarios}
            emptyMessage="No hay horarios registrados para este curso."
          />
        </div>
      )}
    </div>
  )
}
