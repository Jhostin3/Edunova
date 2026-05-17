import { useEffect, useState } from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import {
  formatDate,
  formatTime,
  getEstudianteDashboardData,
} from '../../services/estudianteDashboardService'

export function EstudianteDashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadDashboard = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setDashboard(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setError('')

      const { data, error: requestError } = await getEstudianteDashboardData(user.id)

      if (cancelled) return

      if (requestError) {
        setDashboard(null)
        setError(requestError.message)
      } else {
        setDashboard(data)
      }

      setLoading(false)
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const displayName = [dashboard?.estudiante?.nombres, dashboard?.estudiante?.apellidos]
    .filter(Boolean)
    .join(' ')

  const cursoActualLabel = !dashboard?.curso
    ? 'Sin curso asignado'
    : dashboard.curso.curso_nombre ||
      [
        dashboard.curso.nivel,
        dashboard.curso.paralelo,
        dashboard.curso.especialidad,
      ]
        .filter(Boolean)
        .join(' ')

  const ultimaAsistencia = dashboard?.asistencias?.[0] ?? null

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mi dashboard"
          description="Cargando tu informacion academica y tus asistencias."
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mi dashboard"
          description="Consulta tu informacion academica, horario y asistencias recientes."
        />
        <EmptyState
          title="No se pudo cargar tu informacion"
          description={error}
        />
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mi dashboard"
          description="Consulta tu informacion academica, horario y asistencias recientes."
        />
        <EmptyState
          title="No se encontro informacion"
          description="No se encontro un estudiante asociado a esta cuenta."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bienvenido, ${displayName || 'Estudiante'}`}
        description={`Curso actual: ${cursoActualLabel}`}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Curso actual"
          value={cursoActualLabel}
          helper={dashboard?.curso ? 'Asignacion vigente' : 'Sin asignacion activa'}
        />
        <SummaryCard
          title="Asistencias recientes"
          value={String(dashboard.asistencias.length)}
          helper="Ultimos registros cargados"
        />
        <SummaryCard
          title="Ultima entrada"
          value={ultimaAsistencia?.hora_entrada ? formatTime(ultimaAsistencia.hora_entrada) : '-'}
          helper={ultimaAsistencia?.fecha ? formatDate(ultimaAsistencia.fecha) : 'Sin registros'}
        />
        <SummaryCard
          title="Estado de entrada"
          value={ultimaAsistencia?.estado_entrada || '-'}
          helper="Ultimo estado reportado"
        />
        <SummaryCard
          title="Clubes activos"
          value={String(dashboard.clubes.length)}
          helper="Clubes extracurriculares asignados"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Mi horario semanal</h2>
            <p className="mt-1 text-sm text-slate-500">
              Vista referencial del horario asociado a tu curso actual.
            </p>
          </div>
        </div>

        {dashboard.horarioRows.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse overflow-hidden rounded-2xl border border-slate-200">
              <thead>
                <tr className="bg-slate-900 text-left text-sm text-white">
                  <th className="px-4 py-3 font-semibold">Bloque / Hora</th>
                  {dashboard.visibleDays.map((day) => (
                    <th key={day.value} className="px-4 py-3 font-semibold">
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dashboard.horarioRows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                  >
                    <td className="min-w-48 border-t border-slate-200 px-4 py-4 align-top">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {row.rowLabel}
                        </p>
                        <p className="text-xs text-slate-500">
                          {row.hora_inicio} - {row.hora_fin}
                        </p>
                      </div>
                    </td>

                    {dashboard.visibleDays.map((day) => (
                      <td
                        key={`${row.id}-${day.value}`}
                        className="min-w-40 border-l border-t border-slate-200 px-3 py-3 align-top"
                      >
                        <HorarioCell cell={row.cells[String(day.value)]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No hay horario disponible"
              description="Todavia no hay un horario visual cargado para tu curso."
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Mis clubes</h2>
            <p className="mt-1 text-sm text-slate-500">
              Consulta los clubes en los que estas inscrito, sus dias y su horario.
            </p>
          </div>
        </div>

        {dashboard.clubes.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.clubes.map((club) => (
              <article
                key={club.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <h3 className="text-base font-semibold text-slate-900">{club.nombre}</h3>
                <p className="mt-3 text-sm text-slate-600">
                  Horario: {formatTime(club.hora_inicio)} - {formatTime(club.hora_fin)}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Dias: {club.dias_labels?.join(', ') || '-'}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No tienes clubes asignados"
              description="Todavia no existen inscripciones activas de clubes para esta cuenta."
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Mis asistencias recientes
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ultimos registros de entrada y salida disponibles en el sistema.
            </p>
          </div>
        </div>

        {dashboard.asistencias.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse overflow-hidden rounded-2xl border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Hora entrada
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Hora salida
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dashboard.asistencias.map((item) => (
                  <tr key={`${item.fecha}-${item.hora_entrada}-${item.hora_salida}`}>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {formatDate(item.fecha)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {formatTime(item.hora_entrada)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {formatTime(item.hora_salida)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                        {item.estado_entrada || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No hay asistencias recientes"
              description="Todavia no existen registros recientes de asistencia para esta cuenta."
            />
          </div>
        )}
      </section>
    </div>
  )
}

function HorarioCell({ cell }) {
  if (!cell) {
    return (
      <div className="min-h-11 rounded-xl border border-dashed border-slate-200 bg-slate-50/60" />
    )
  }

  if (cell.kind === 'recreo') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
        {cell.label}
      </div>
    )
  }

  if (cell.kind === 'almuerzo') {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
        {cell.label}
      </div>
    )
  }

  if (cell.kind === 'club') {
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">
        {cell.value}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      {cell.value || '-'}
    </div>
  )
}

function SummaryCard({ title, value, helper }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </article>
  )
}
