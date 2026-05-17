import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../../../components/ui/PageHeader'
import { DataTable } from '../../../components/ui/DataTable'
import { getReporteAsistenciaByDate } from '../../../services/reportesAsistenciaService'
import { downloadAttendanceReportPdf } from './reportesPdf'

const COLORS = ['#0369a1', '#e2e8f0', '#0f172a', '#10b981']

function todayDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function ReportesPage() {
  const [selectedDate, setSelectedDate] = useState(todayDate)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadReport() {
      setLoading(true)
      setError('')

      const { data, error: requestError } =
        await getReporteAsistenciaByDate(selectedDate)

      if (cancelled) return

      if (requestError) {
        setReport(null)
        setError(requestError.message)
      } else {
        setReport(data)
      }

      setLoading(false)
    }

    void loadReport()

    return () => {
      cancelled = true
    }
  }, [selectedDate])

  const columns = useMemo(
    () => [
      { key: 'estudiante', label: 'Estudiante' },
      { key: 'curso', label: 'Curso' },
      {
        key: 'hora_entrada',
        label: 'Hora entrada',
        render: (row) => formatTime(row.hora_entrada),
      },
      {
        key: 'hora_salida',
        label: 'Hora salida',
        render: (row) => formatTime(row.hora_salida),
      },
      { key: 'estado_entrada', label: 'Estado entrada' },
      { key: 'estado_actual', label: 'Estado actual' },
      { key: 'observacion', label: 'Observacion' },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes de asistencia"
        description="Consulta entradas, salidas y estadisticas por fecha."
        actionNode={
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="input"
            />
            <button
              type="button"
              onClick={() => report && downloadAttendanceReportPdf(report)}
              disabled={!report || loading}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Descargar PDF
            </button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <MetricsGrid metrics={report?.metrics} loading={loading} />

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Ingresaron vs No ingresaron">
          <AttendancePie data={report?.charts.ingreso ?? []} loading={loading} />
        </ChartCard>
        <ChartCard title="Salieron vs Permanecen dentro">
          <AttendancePie data={report?.charts.permanencia ?? []} loading={loading} />
        </ChartCard>
        <ChartCard title="Entradas por curso">
          <CourseBar data={report?.charts.porCurso ?? []} loading={loading} />
        </ChartCard>
      </div>

      <DataTable
        columns={columns}
        rows={report?.rows ?? []}
        loading={loading}
        emptyMessage="No hay estudiantes activos o registros para la fecha seleccionada."
      />
    </div>
  )
}

function MetricsGrid({ metrics, loading }) {
  const items = [
    ['Total activos', metrics?.totalActivos ?? 0],
    ['Con entrada', metrics?.conEntrada ?? 0],
    ['Sin entrada', metrics?.sinEntrada ?? 0],
    ['Con salida', metrics?.conSalida ?? 0],
    ['Dentro del colegio', metrics?.dentro ?? 0],
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {loading ? '-' : value}
          </p>
        </div>
      ))}
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 h-64">{children}</div>
    </section>
  )
}

function AttendancePie({ data, loading }) {
  if (loading) return <ChartPlaceholder />
  if (!data.some((item) => item.value > 0)) return <EmptyChart />

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={86} label>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

function CourseBar({ data, loading }) {
  if (loading) return <ChartPlaceholder />
  if (!data.length) return <EmptyChart />

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="curso" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="entradas" fill="#0369a1" name="Entradas" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ChartPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-500">
      Cargando grafico...
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
      No hay datos suficientes para graficar.
    </div>
  )
}

function formatTime(value) {
  if (!value) return '-'
  const [hours = '00', minutes = '00'] = String(value).split(':')
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
}
