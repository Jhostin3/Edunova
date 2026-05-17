import { useEffect, useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import {
  createRepresentante,
  listRepresentantes,
  updateRepresentante,
} from '../../services/representanteService'
import {
  IDENTIFICATION_TYPE_LABELS,
  inferIdentificationType,
} from '../../utils/identification'
import { RepresentanteForm } from './RepresentanteForm'

export function RepresentantesPage() {
  const [representantes, setRepresentantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  async function loadRepresentantes() {
    setLoading(true)
    setError('')
    const { data, error: fetchError } = await listRepresentantes()
    if (fetchError) {
      setError(fetchError.message)
      setRepresentantes([])
    } else {
      setRepresentantes(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadRepresentantes()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  const openNewForm = () => {
    setSelected(null)
    setFormOpen(true)
  }

  const handleSubmit = async (payload) => {
    setSaving(true)
    const action = selected
      ? updateRepresentante(selected.id, payload)
      : createRepresentante(payload)

    const { error: saveError } = await action
    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    await loadRepresentantes()
    setSelected(null)
    setFormOpen(false)
    setSaving(false)
  }

  const columns = [
    { key: 'nombres', label: 'Nombres' },
    { key: 'apellidos', label: 'Apellidos' },
    {
      key: 'cedula',
      label: 'Identificación',
      render: (row) => <IdentificationCell row={row} />,
    },
    { key: 'relacion', label: 'Relacion' },
    { key: 'telefono', label: 'Telefono' },
    {
      key: 'estado',
      label: 'Estado',
      render: (row) => (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {row.estado === true ? 'Activo' : row.estado === false ? 'Inactivo' : 'Sin estado'}
        </span>
      ),
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
        title="Representantes"
        description="Administra la informacion de padres, madres o tutores vinculados al sistema."
        actionLabel="Nuevo representante"
        onAction={openNewForm}
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {formOpen ? (
        <RepresentanteForm
          key={selected?.id ?? 'new-representante'}
          initialData={selected}
          onCancel={() => {
            setSelected(null)
            setFormOpen(false)
          }}
          onSubmit={handleSubmit}
          submitting={saving}
        />
      ) : null}

      {representantes.length || loading ? (
        <DataTable
          columns={columns}
          rows={representantes}
          loading={loading}
          emptyMessage="No hay representantes registrados."
        />
      ) : (
        <EmptyState
          title="Aun no hay representantes"
          description="Crea el primer representante para tener el directorio base de padres, madres y tutores."
          actionLabel="Nuevo representante"
          onAction={openNewForm}
        />
      )}
    </div>
  )
}

function IdentificationCell({ row }) {
  const type = inferIdentificationType(row.cedula, row.tipo_identificacion)

  return (
    <div>
      <p>{row.cedula || '-'}</p>
      <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        {IDENTIFICATION_TYPE_LABELS[type]}
      </span>
    </div>
  )
}
