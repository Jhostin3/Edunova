import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { DataTable } from '../../../components/ui/DataTable'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PageHeader } from '../../../components/ui/PageHeader'
import { useAuth } from '../../../hooks/useAuth'
import {
  formatClubDays,
  formatClubTime,
  getClubById,
  getClubDayLabel,
  updateClub,
} from '../../../services/clubesService'
import { getInscripcionesByClub } from '../../../services/inscripcionClubService'
import {
  IDENTIFICATION_TYPE_LABELS,
  inferIdentificationType,
} from '../../../utils/identification'
import { ClubForm } from './ClubForm'
import { InscripcionClubForm } from './InscripcionClubForm'

export function ClubDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [club, setClub] = useState(null)
  const [inscripciones, setInscripciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showEditForm, setShowEditForm] = useState(false)
  const showInscripcionForm = location.pathname.endsWith('/inscribir')

  const loadClubDetail = useCallback(async () => {
    if (!id || !user?.id) return

    setLoading(true)
    setError('')

    const [
      { data: clubData, error: clubError },
      { data: inscripcionesData, error: inscripcionesError },
    ] = await Promise.all([getClubById(id, user.id), getInscripcionesByClub(id)])

    if (clubError || inscripcionesError) {
      setClub(null)
      setInscripciones([])
      setError(clubError?.message || inscripcionesError?.message || '')
    } else {
      setClub(clubData)
      setInscripciones(inscripcionesData)
    }

    setLoading(false)
  }, [id, user])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadClubDetail()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadClubDetail])

  const handleUpdateClub = async (payload, dias) => {
    if (!user?.id || !club?.id) return

    setSaving(true)
    setError('')

    const { data, error: saveError } = await updateClub(club.id, payload, dias, user.id)

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    setClub(data)
    setShowEditForm(false)
    setSaving(false)
  }

  const columns = [
    {
      key: 'estudiante',
      label: 'Estudiante',
      render: (row) =>
        row.estudiante
          ? `${row.estudiante.nombres} ${row.estudiante.apellidos}`
          : '-',
    },
    {
      key: 'cedula',
      label: 'Identificación',
      render: (row) => <IdentificationCell student={row.estudiante} />,
    },
    {
      key: 'dias',
      label: 'Dias asignados',
      render: (row) =>
        row.dias?.length
          ? row.dias.map((day) => getClubDayLabel(day)).join(', ')
          : '-',
    },
    {
      key: 'activo',
      label: 'Estado',
      render: (row) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            row.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {row.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Detalle del club"
          description="Cargando informacion del club y sus inscripciones."
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          </div>
        </div>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Detalle del club"
          description="Revisa la configuracion del club e inscribe estudiantes por cedula."
        />
        <EmptyState
          title="No se encontro el club"
          description={error || 'No se encontro un club asociado a esta coordinacion.'}
          actionLabel="Volver a mis clubes"
          onAction={() => window.history.back()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={club.nombre}
        description="Gestiona los datos del club y sus estudiantes inscritos."
        actionNode={
          <div className="flex flex-wrap gap-3">
            <Link
              to="/coordinador/clubes"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver
            </Link>
            <button
              type="button"
              onClick={() => setShowEditForm((current) => !current)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showEditForm ? 'Cerrar edicion' : 'Editar club'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (showInscripcionForm) {
                  navigate(`/coordinador/clubes/${club.id}`)
                } else {
                  navigate(`/coordinador/clubes/${club.id}/inscribir`)
                }
              }}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {showInscripcionForm ? 'Cerrar inscripcion' : 'Inscribir estudiante'}
            </button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {showEditForm ? (
        <ClubForm
          key={`edit-${club.id}`}
          initialData={club}
          submitting={saving}
          onCancel={() => setShowEditForm(false)}
          onSubmit={handleUpdateClub}
        />
      ) : null}

      {showInscripcionForm ? (
        <InscripcionClubForm
          club={club}
          coordinadorId={user?.id}
          onCancel={() => navigate(`/coordinador/clubes/${club.id}`)}
          onSuccess={async () => {
            navigate(`/coordinador/clubes/${club.id}`)
            await loadClubDetail()
          }}
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Configuracion del club</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Horario" value={`${formatClubTime(club.hora_inicio)} - ${formatClubTime(club.hora_fin)}`} />
            <InfoItem label="Dias" value={formatClubDays(club.dias)} />
            <InfoItem
              label="Modo"
              value={
                club.modo_asistencia === 'todos_los_dias'
                  ? 'Todos los dias'
                  : 'Dias seleccionables'
              }
            />
            <InfoItem
              label="Minimo requerido"
              value={
                club.modo_asistencia === 'dias_seleccionables'
                  ? String(club.dias_minimos_requeridos ?? '-')
                  : 'No aplica'
              }
            />
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Descripcion
            </p>
            <p className="mt-1 text-sm text-slate-700">{club.descripcion || 'Sin descripcion'}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Resumen rapido</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <MetricCard label="Inscritos activos" value={String(club.inscritos_count ?? 0)} />
            <MetricCard label="Dias configurados" value={String(club.dias?.length ?? 0)} />
            <MetricCard
              label="Estado"
              value={club.estado ? 'Activo' : 'Inactivo'}
            />
            <MetricCard
              label="Modalidad"
              value={
                club.modo_asistencia === 'todos_los_dias' ? 'Obligatorio' : 'Flexible'
              }
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Estudiantes inscritos</h2>
              <p className="mt-1 text-sm text-slate-500">
                Lista de estudiantes inscritos actualmente en este club.
              </p>
            </div>
          </div>
        </div>

        {inscripciones.length ? (
          <DataTable
            columns={columns}
            rows={inscripciones}
            emptyMessage="No hay estudiantes inscritos en este club."
          />
        ) : (
          <EmptyState
            title="Aun no hay estudiantes inscritos"
            description="Inscribe el primer estudiante por cedula para comenzar a gestionar este club."
            actionLabel="Inscribir estudiante"
            onAction={() => navigate(`/coordinador/clubes/${club.id}/inscribir`)}
          />
        )}
      </section>
    </div>
  )
}

function IdentificationCell({ student }) {
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-800">{value}</p>
    </div>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}
