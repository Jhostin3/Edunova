import { useEffect, useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import {
  createEstudiante,
  listCursosForEstudiantes,
  listEstudiantes,
  listRepresentantesForEstudiantes,
  updateEstudiante,
} from '../../services/estudianteService'
import {
  IDENTIFICATION_TYPE_LABELS,
  inferIdentificationType,
} from '../../utils/identification'
import { EstudianteForm } from './EstudianteForm'

export function EstudiantesPage() {
  const [estudiantes, setEstudiantes] = useState([])
  const [representantes, setRepresentantes] = useState([])
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [createdCredentials, setCreatedCredentials] = useState(null)

  async function loadEstudiantes() {
    setLoading(true)
    setError('')
    const [
      { data: estudiantesData, error: estudiantesError },
      { data: representantesData, error: representantesError },
      { data: cursosData, error: cursosError },
    ] = await Promise.all([
      listEstudiantes(),
      listRepresentantesForEstudiantes(),
      listCursosForEstudiantes(),
    ])

    if (estudiantesError || representantesError || cursosError) {
      setError(
        estudiantesError?.message || representantesError?.message || cursosError?.message || ''
      )
      setEstudiantes([])
      setRepresentantes([])
      setCursos([])
    } else {
      setEstudiantes(estudiantesData)
      setRepresentantes(representantesData)
      setCursos(cursosData)
    }
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadEstudiantes()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  const openNewForm = () => {
    setSelected(null)
    setCreatedCredentials(null)
    setFormOpen(true)
  }

  const openEditForm = (item) => {
    setSelected(item)
    setFormOpen(true)
  }

  const closeForm = () => {
    setSelected(null)
    setFormOpen(false)
  }

  const handleSubmit = async (payload) => {
    setSaving(true)
    setError('')
    const action = selected
      ? updateEstudiante(selected.id, payload)
      : createEstudiante(payload)

    const { data: responseData, error: saveError } = await action

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    if (!selected && responseData?.credentials) {
      setCreatedCredentials(responseData.credentials)
    }

    await loadEstudiantes()
    closeForm()
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
    {
      key: 'fecha_nacimiento',
      label: 'Fecha de nacimiento',
      render: (row) => row.fecha_nacimiento || '-',
    },
    {
      key: 'representante_principal',
      label: 'Representante principal',
      render: (row) =>
        row.representante_principal
          ? `${row.representante_principal.nombres} ${row.representante_principal.apellidos} - ${row.representante_principal.relacion || 'Sin relacion'}`
          : '-',
    },
    {
      key: 'curso_actual',
      label: 'Curso actual',
      render: (row) =>
        row.curso_actual
          ? row.curso_actual.nombre ||
            [
              row.curso_actual.nivel,
              row.curso_actual.paralelo,
              row.curso_actual.especialidad,
            ]
              .filter(Boolean)
              .join(' ')
          : '-',
    },
    {
      key: 'correo_institucional',
      label: 'Correo institucional',
      render: (row) => row.correo_institucional || '-',
    },
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
      key: 'cuenta_creada',
      label: 'Cuenta',
      render: (row) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            row.cuenta_creada
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {row.cuenta_creada ? 'Creada' : 'Pendiente'}
        </span>
      ),
    },
    {
      key: 'estado_operativo',
      label: 'Configuracion',
      render: (row) => <OperationalStatusCell row={row} />,
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (row) => (
        <button
          type="button"
          onClick={() => openEditForm(row)}
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
        title="Estudiantes"
        description="Administra la informacion principal del estudiante, su representante principal y su asignacion de curso."
        actionLabel="Nuevo estudiante"
        onAction={openNewForm}
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {createdCredentials ? (
        <CredentialsNotice
          credentials={createdCredentials}
          onClose={() => setCreatedCredentials(null)}
        />
      ) : null}

      {formOpen ? (
        <EstudianteForm
          key={selected?.id ?? 'new-estudiante'}
          initialData={selected}
          representantes={representantes}
          cursos={cursos}
          onCancel={closeForm}
          onSubmit={handleSubmit}
          submitting={saving}
        />
      ) : null}

      {estudiantes.length || loading ? (
        <DataTable
          columns={columns}
          rows={estudiantes}
          loading={loading}
          emptyMessage="No hay estudiantes registrados."
        />
      ) : (
        <EmptyState
          title="Aun no hay estudiantes"
          description="Crea el primer estudiante para comenzar a poblar el sistema."
          actionLabel="Nuevo estudiante"
          onAction={openNewForm}
        />
      )}
    </div>
  )
}

function OperationalStatusCell({ row }) {
  return (
    <div className="flex flex-col gap-1.5">
      <StatusBadge ready={row.nfc_asignada} readyText="NFC" pendingText="NFC pendiente" />
      <StatusBadge
        ready={row.rostro_registrado}
        readyText="Rostro"
        pendingText="Rostro pendiente"
      />
      <StatusBadge
        ready={row.listo_asistencia}
        readyText="Listo asistencia"
        pendingText="No listo"
      />
    </div>
  )
}

function StatusBadge({ ready, readyText, pendingText }) {
  return (
    <span
      className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
        ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      {ready ? readyText : pendingText}
    </span>
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

function CredentialsNotice({ credentials, onClose }) {
  const copyValue = async (value) => {
    if (!navigator?.clipboard?.writeText) return
    await navigator.clipboard.writeText(value)
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-emerald-800">
            Cuenta institucional creada correctamente
          </h2>
          <p className="mt-1 text-sm text-emerald-700">
            Guarda estas credenciales ahora. La contrasena temporal solo se muestra una vez.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
        >
          Cerrar
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <CredentialCard
          label="Correo institucional"
          value={credentials.email}
          onCopy={() => copyValue(credentials.email)}
        />
        <CredentialCard
          label="Contrasena temporal"
          value={credentials.temporaryPassword}
          onCopy={() => copyValue(credentials.temporaryPassword)}
        />
      </div>
    </section>
  )
}

function CredentialCard({ label, value, onCopy }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        {label}
      </p>
      <p className="mt-2 break-all rounded-xl bg-slate-900 px-3 py-2 font-mono text-sm text-white">
        {value}
      </p>
      <button
        type="button"
        onClick={onCopy}
        className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Copiar
      </button>
    </div>
  )
}
