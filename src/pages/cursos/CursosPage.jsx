import { useEffect, useMemo, useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import {
  createCurso,
  habilitarCursoEnPeriodoActivo,
  listCursos,
  updateCurso,
} from '../../services/cursoService'
import { CursoForm } from './CursoForm'

export function CursosPage() {
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enablingId, setEnablingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  async function loadCursos() {
    setLoading(true)
    setError('')
    const { data, error: fetchError } = await listCursos()
    if (fetchError) {
      setError(fetchError.message)
      setCursos([])
    } else {
      setCursos(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCursos()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  const activePeriodo = useMemo(
    () => cursos.find((curso) => curso.periodo?.activo)?.periodo ?? null,
    [cursos]
  )

  const activeCursos = useMemo(
    () => cursos.filter((curso) => curso.periodo_id === activePeriodo?.id),
    [activePeriodo?.id, cursos]
  )

  const historicalGroups = useMemo(() => {
    const groups = new Map()

    for (const curso of cursos) {
      if (!activePeriodo?.id || curso.periodo_id === activePeriodo.id) continue

      const periodoId = curso.periodo?.id ?? curso.periodo_id
      if (!groups.has(periodoId)) {
        groups.set(periodoId, {
          periodo: curso.periodo ?? {
            id: periodoId,
            nombre: 'Periodo sin nombre',
            fecha_inicio: null,
          },
          cursos: [],
        })
      }

      groups.get(periodoId).cursos.push(curso)
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        cursos: group.cursos.sort((a, b) => formatCurso(a).localeCompare(formatCurso(b))),
      }))
      .sort((a, b) => {
        const dateA = a.periodo.fecha_inicio || ''
        const dateB = b.periodo.fecha_inicio || ''
        return dateB.localeCompare(dateA)
      })
  }, [activePeriodo, cursos])

  const handleSubmit = async (payload) => {
    setSaving(true)
    setError('')
    setSuccess('')
    const action = selected ? updateCurso(selected.id, payload) : createCurso(payload)

    const { error: saveError } = await action
    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    await loadCursos()
    setSelected(null)
    setFormOpen(false)
    setSaving(false)
  }

  const handleEnableCurso = async (curso) => {
    setEnablingId(curso.id)
    setError('')
    setSuccess('')

    const { data, error: enableError } = await habilitarCursoEnPeriodoActivo(curso.id)

    if (enableError) {
      setError(enableError.message)
      setEnablingId(null)
      return
    }

    const periodoName = data?.periodoActivo?.nombre || 'el periodo activo'
    setSuccess(
      data?.alreadyEnabled
        ? `El curso "${formatCurso(curso)}" ya esta habilitado para ${periodoName}.`
        : `Curso "${formatCurso(curso)}" habilitado correctamente para ${periodoName}.`
    )
    await loadCursos()
    setEnablingId(null)
  }

  const activeColumns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'nivel', label: 'Nivel' },
    { key: 'paralelo', label: 'Paralelo' },
    { key: 'especialidad', label: 'Especialidad', render: (row) => row.especialidad || '-' },
    {
      key: 'estado',
      label: 'Estado',
      render: (row) => <EstadoBadge estado={row.estado} />,
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (row) => (
        <button
          type="button"
          onClick={() => {
            setSelected(row)
            setFormOpen(true)
          }}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Editar
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cursos"
        description="Gestiona cursos por periodo y reutiliza la estructura academica de periodos anteriores."
        actionLabel="Nuevo curso"
        onAction={() => {
          setSelected(null)
          setFormOpen(true)
        }}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">Periodo activo</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {activePeriodo?.nombre || 'No hay periodo activo configurado'}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          La matricula solo muestra cursos asociados a este periodo. Los cursos
          historicos se pueden habilitar sin modificar su periodo original.
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {formOpen ? (
        <CursoForm
          key={selected?.id ?? 'new-curso'}
          initialData={selected}
          onCancel={() => {
            setSelected(null)
            setFormOpen(false)
          }}
          onSubmit={handleSubmit}
          submitting={saving}
        />
      ) : null}

      <section className="space-y-4">
        <SectionHeader
          title="Cursos del periodo activo"
          description="Estos cursos estan disponibles para matricula y re-matricula."
        />

        {activeCursos.length || loading ? (
          <DataTable
            columns={activeColumns}
            rows={activeCursos}
            loading={loading}
            emptyMessage="No hay cursos en el periodo activo."
          />
        ) : (
          <EmptyState
            title="Sin cursos activos"
            description="Crea un curso nuevo o habilita cursos desde periodos anteriores."
            actionLabel="Nuevo curso"
            onAction={() => {
              setSelected(null)
              setFormOpen(true)
            }}
          />
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Cursos de periodos anteriores"
          description="Selecciona solo los cursos que la institucion usara en el periodo activo."
        />

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Cargando cursos historicos...
          </div>
        ) : historicalGroups.length ? (
          historicalGroups.map((group) => (
            <HistoricalPeriodSection
              key={group.periodo.id}
              group={group}
              activeCursos={activeCursos}
              activePeriodo={activePeriodo}
              enablingId={enablingId}
              onEnable={handleEnableCurso}
              onEdit={(curso) => {
                setSelected(curso)
                setFormOpen(true)
              }}
            />
          ))
        ) : (
          <EmptyState
            title="Sin cursos historicos"
            description="Cuando existan cursos en periodos anteriores, podras habilitarlos para el periodo activo desde aqui."
          />
        )}
      </section>
    </div>
  )
}

function HistoricalPeriodSection({
  group,
  activeCursos,
  activePeriodo,
  enablingId,
  onEnable,
  onEdit,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{group.periodo.nombre}</h3>
          <p className="text-sm text-slate-500">
            Cursos disponibles para reutilizar en {activePeriodo?.nombre || 'el periodo activo'}.
          </p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          Periodo historico
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-12 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span className="col-span-4">Curso</span>
          <span className="col-span-2">Nivel</span>
          <span className="col-span-2">Paralelo</span>
          <span className="col-span-2">Estado</span>
          <span className="col-span-2 text-right">Acciones</span>
        </div>

        {group.cursos.map((curso) => {
          const enabledCurso = activeCursos.find((activeCurso) =>
            isEquivalentCurso(activeCurso, curso)
          )
          const isEnabled = Boolean(enabledCurso)

          return (
            <div
              key={curso.id}
              className="grid grid-cols-12 items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm"
            >
              <div className="col-span-4">
                <p className="font-semibold text-slate-900">{formatCurso(curso)}</p>
                {curso.descripcion ? (
                  <p className="mt-1 text-xs text-slate-500">{curso.descripcion}</p>
                ) : null}
              </div>
              <span className="col-span-2 text-slate-600">{curso.nivel || '-'}</span>
              <span className="col-span-2 text-slate-600">{curso.paralelo || '-'}</span>
              <div className="col-span-2">
                {isEnabled ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Ya habilitado
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    Historico
                  </span>
                )}
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(curso)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onEnable(curso)}
                  disabled={isEnabled || enablingId === curso.id}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isEnabled
                    ? 'Ya habilitado'
                    : enablingId === curso.id
                      ? 'Habilitando...'
                      : 'Habilitar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SectionHeader({ title, description }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  )
}

function EstadoBadge({ estado }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {estado === true ? 'Activo' : estado === false ? 'Inactivo' : 'Sin estado'}
    </span>
  )
}

function formatCurso(curso) {
  if (!curso) return '-'
  return (
    curso.nombre ||
    [curso.nivel, curso.paralelo, curso.especialidad].filter(Boolean).join(' ')
  )
}

function normalizeValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

function isEquivalentCurso(a, b) {
  const sameName = normalizeValue(a.nombre) && normalizeValue(a.nombre) === normalizeValue(b.nombre)

  const sameStructure =
    normalizeValue(a.nivel) === normalizeValue(b.nivel) &&
    normalizeValue(a.paralelo) === normalizeValue(b.paralelo) &&
    normalizeValue(a.especialidad) === normalizeValue(b.especialidad)

  return sameName || sameStructure
}
