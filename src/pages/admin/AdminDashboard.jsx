import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'

const QUICK_LINKS = [
  {
    title: 'Cursos',
    description: 'Configura la oferta academica y los paralelos disponibles.',
    to: '/admin/cursos',
  },
  {
    title: 'Periodos lectivos',
    description: 'Define el periodo escolar activo para la gestion academica.',
    to: '/admin/periodos',
  },
  {
    title: 'Horarios',
    description: 'Configura jornadas y horarios base por curso.',
    to: '/admin/horarios',
  },
  {
    title: 'Usuarios',
    description: 'Administra personal institucional y sus accesos.',
    to: '/admin/usuarios',
  },
  {
    title: 'Reportes de asistencia',
    description: 'Consulta entradas, salidas y estadisticas por fecha.',
    to: '/admin/reportes',
    action: 'Abrir reportes',
  },
]

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard administrativo"
        description="Gestiona matriculas, cursos, horarios y usuarios del sistema desde un solo panel."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
              Accion principal
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Nueva matrícula
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Registra representante, estudiante y curso en un solo proceso.
            </p>
          </div>

          <Link
            to="/admin/matricula"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Iniciar matrícula
          </Link>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            <p className="mt-4 text-sm font-medium text-sky-700">
              {item.action || 'Abrir modulo'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
