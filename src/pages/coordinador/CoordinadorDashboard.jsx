import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import {
  formatClubDays,
  formatClubTime,
  getCoordinadorClubSummary,
} from '../../services/clubesService'

export function CoordinadorDashboard() {
  const { user, profile } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadSummary = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setSummary(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setError('')
      const { data, error: requestError } = await getCoordinadorClubSummary(user.id)

      if (cancelled) return

      if (requestError) {
        setSummary(null)
        setError(requestError.message)
      } else {
        setSummary(data)
      }

      setLoading(false)
    }

    void loadSummary()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const displayName =
    [profile?.nombres, profile?.apellidos].filter(Boolean).join(' ') || 'Coordinador'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bienvenido, ${displayName}`}
        description="Gestiona tus clubes, sus dias de funcionamiento y la inscripcion de estudiantes por cedula."
        actionNode={
          <div className="flex flex-wrap gap-3">
            <Link
              to="/coordinador/clubes"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Ver mis clubes
            </Link>
          </div>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          </div>
        </div>
      ) : summary ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Clubes registrados" value={String(summary.totalClubes)} />
            <MetricCard label="Clubes activos" value={String(summary.activos)} />
            <MetricCard label="Estudiantes inscritos" value={String(summary.totalInscritos)} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Mis clubes</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Resumen rapido de los clubes que coordinas actualmente.
                  </p>
                </div>
              </div>

              {summary.clubs.length ? (
                <div className="mt-5 space-y-3">
                  {summary.clubs.slice(0, 4).map((club) => (
                    <Link
                      key={club.id}
                      to={`/coordinador/clubes/${club.id}`}
                      className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">
                            {club.nombre}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatClubDays(club.dias)}
                          </p>
                        </div>

                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                          {club.inscritos_count ?? 0} inscritos
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-600">
                        Horario: {formatClubTime(club.hora_inicio)} - {formatClubTime(club.hora_fin)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-5">
                  <EmptyState
                    title="Aun no tienes clubes"
                    description="Crea tu primer club para comenzar a gestionar dias e inscripciones."
                    actionLabel="Ir a mis clubes"
                    onAction={() => {
                      window.location.href = '/coordinador/clubes'
                    }}
                  />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Accesos rapidos</h2>
              <div className="mt-5 space-y-3">
                <QuickLink
                  to="/coordinador/clubes"
                  title="Crear o editar clubes"
                  description="Configura nombre, horario, dias y modo de asistencia."
                />
                <QuickLink
                  to="/coordinador/clubes"
                  title="Inscribir estudiantes"
                  description="Busca por cedula y asigna los dias correspondientes."
                />
              </div>
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          title="No se pudo cargar el resumen"
          description="Intenta recargar esta vista para obtener los datos de tus clubes."
        />
      )}
    </div>
  )
}

function MetricCard({ label, value }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
    </article>
  )
}

function QuickLink({ to, title, description }) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
    >
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </Link>
  )
}
