import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable } from '../../../components/ui/DataTable'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PageHeader } from '../../../components/ui/PageHeader'
import { useAuth } from '../../../hooks/useAuth'
import {
  createClub,
  formatClubDays,
  formatClubTime,
  getMyClubes,
  updateClub,
} from '../../../services/clubesService'
import { ClubForm } from './ClubForm'

export function ClubesPage() {
  const { user } = useAuth()
  const [clubes, setClubes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  const loadClubes = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError('')

    const { data, error: requestError } = await getMyClubes(user.id)

    if (requestError) {
      setClubes([])
      setError(requestError.message)
    } else {
      setClubes(data)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadClubes()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadClubes])

  const handleSubmit = async (payload, dias) => {
    if (!user?.id) return

    setSaving(true)
    setError('')

    const { error: saveError } = selected
      ? await updateClub(selected.id, payload, dias, user.id)
      : await createClub(payload, dias, user.id)

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    await loadClubes()
    setSaving(false)
    setSelected(null)
    setFormOpen(false)
  }

  const columns = [
    { key: 'nombre', label: 'Club' },
    {
      key: 'horario',
      label: 'Horario',
      render: (row) => `${formatClubTime(row.hora_inicio)} - ${formatClubTime(row.hora_fin)}`,
    },
    {
      key: 'dias',
      label: 'Dias',
      render: (row) => formatClubDays(row.dias),
    },
    {
      key: 'modo_asistencia',
      label: 'Modo',
      render: (row) =>
        row.modo_asistencia === 'todos_los_dias'
          ? 'Todos los dias'
          : `Flexible (${row.dias_minimos_requeridos || 0} min.)`,
    },
    {
      key: 'inscritos_count',
      label: 'Inscritos',
      render: (row) => row.inscritos_count ?? 0,
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (row) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            row.estado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {row.estado ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (row) => (
        <div className="flex gap-2">
          <Link
            to={`/coordinador/clubes/${row.id}`}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver detalle
          </Link>
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
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis clubes"
        description="Crea, edita y administra los clubes asignados a tu coordinacion."
        actionLabel="Nuevo club"
        onAction={() => {
          setSelected(null)
          setFormOpen(true)
        }}
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {formOpen ? (
        <ClubForm
          key={selected?.id ?? 'new-club'}
          initialData={selected}
          submitting={saving}
          onCancel={() => {
            setSelected(null)
            setFormOpen(false)
          }}
          onSubmit={handleSubmit}
        />
      ) : null}

      {clubes.length || loading ? (
        <DataTable
          columns={columns}
          rows={clubes}
          loading={loading}
          emptyMessage="Todavia no tienes clubes registrados."
        />
      ) : (
        <EmptyState
          title="Aun no has creado clubes"
          description="Crea el primer club para comenzar a gestionar estudiantes y dias de asistencia."
          actionLabel="Nuevo club"
          onAction={() => {
            setSelected(null)
            setFormOpen(true)
          }}
        />
      )}
    </div>
  )
}
