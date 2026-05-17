import { useEffect, useState } from 'react'
import { DataTable } from '../../../components/ui/DataTable'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PageHeader } from '../../../components/ui/PageHeader'
import {
  activatePeriodo,
  createPeriodo,
  listPeriodos,
  updatePeriodo,
} from '../../../services/periodoService'
import { PeriodoForm } from './PeriodoForm'

export function PeriodosPage() {
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  async function loadPeriodos() {
    setLoading(true)
    setError('')
    const { data, error: fetchError } = await listPeriodos()

    if (fetchError) {
      setError(fetchError.message)
      setPeriodos([])
    } else {
      setPeriodos(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPeriodos()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (payload) => {
    setSaving(true)
    const action = selected
      ? updatePeriodo(selected.id, payload)
      : createPeriodo(payload)

    const { error: saveError } = await action
    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    await loadPeriodos()
    setSelected(null)
    setFormOpen(false)
    setSaving(false)
  }

  const handleActivate = async (id) => {
    setError('')
    const { error: activateError } = await activatePeriodo(id)
    if (activateError) {
      setError(activateError.message)
      return
    }

    await loadPeriodos()
  }

  const columns = [
    { key: 'nombre', label: 'Nombre' },
    {
      key: 'fecha_inicio',
      label: 'Fecha inicio',
      render: (row) => row.fecha_inicio || '-',
    },
    {
      key: 'fecha_fin',
      label: 'Fecha fin',
      render: (row) => row.fecha_fin || '-',
    },
    {
      key: 'activo',
      label: 'Estado',
      render: (row) => (
        <span
          className={[
            'rounded-full px-3 py-1 text-xs font-medium',
            row.activo
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-700',
          ].join(' ')}
        >
          {row.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (row) => (
        <div className="flex items-center gap-2">
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

          {!row.activo ? (
            <button
              type="button"
              onClick={() => handleActivate(row.id)}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Activar
            </button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Periodos lectivos"
        description="Gestiona los periodos escolares del sistema y define cual queda activo para que los cursos lo usen automaticamente."
        actionLabel="Nuevo periodo"
        onAction={() => {
          setSelected(null)
          setFormOpen(true)
        }}
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {formOpen ? (
        <PeriodoForm
          key={selected?.id ?? 'new-periodo'}
          initialData={selected}
          onCancel={() => {
            setSelected(null)
            setFormOpen(false)
          }}
          onSubmit={handleSubmit}
          submitting={saving}
        />
      ) : null}

      {periodos.length || loading ? (
        <DataTable
          columns={columns}
          rows={periodos}
          loading={loading}
          emptyMessage="No hay periodos lectivos registrados."
        />
      ) : (
        <EmptyState
          title="Aun no hay periodos lectivos"
          description="Crea el primer periodo para que el sistema pueda asignarlo automaticamente a los cursos."
          actionLabel="Nuevo periodo"
          onAction={() => {
            setSelected(null)
            setFormOpen(true)
          }}
        />
      )}
    </div>
  )
}
