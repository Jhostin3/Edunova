import { useEffect, useState } from 'react'
import { DataTable } from '../../../components/ui/DataTable'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PageHeader } from '../../../components/ui/PageHeader'
import {
  createUsuario,
  listRolesForPersonal,
  listUsuarios,
  updateUsuario,
} from '../../../services/usuariosService'
import {
  IDENTIFICATION_TYPE_LABELS,
  inferIdentificationType,
} from '../../../utils/identification'
import { UsuarioForm } from './UsuarioForm'

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [createdCredentials, setCreatedCredentials] = useState(null)

  async function loadUsuarios() {
    setLoading(true)
    setError('')

    const [
      { data: usuariosData, error: usuariosError },
      { data: rolesData, error: rolesError },
    ] = await Promise.all([listUsuarios(), listRolesForPersonal()])

    if (usuariosError || rolesError) {
      setUsuarios([])
      setRoles([])
      setError(usuariosError?.message || rolesError?.message || '')
    } else {
      setUsuarios(usuariosData)
      setRoles(rolesData)
    }

    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsuarios()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  const openNewForm = () => {
    setSelected(null)
    setCreatedCredentials(null)
    setFormOpen(true)
  }

  const handleSubmit = async (payload) => {
    setSaving(true)
    setError('')

    const { data, error: saveError } = selected
      ? await updateUsuario(selected.id, payload)
      : await createUsuario(payload)

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    if (!selected && data?.credentials) {
      setCreatedCredentials(data.credentials)
    }

    await loadUsuarios()
    setSaving(false)
    setSelected(null)
    setFormOpen(false)
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
      key: 'rol_nombre',
      label: 'Rol',
      render: (row) => getRoleLabel(row.rol_nombre),
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
        title="Usuarios"
        description="Administra el personal institucional y sus cuentas de acceso al sistema."
        actionLabel="Nuevo usuario"
        onAction={openNewForm}
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
        <UsuarioForm
          key={selected?.id ?? 'new-staff'}
          initialData={selected}
          roles={roles}
          submitting={saving}
          onCancel={() => {
            setSelected(null)
            setFormOpen(false)
          }}
          onSubmit={handleSubmit}
        />
      ) : null}

      {usuarios.length || loading ? (
        <DataTable
          columns={columns}
          rows={usuarios}
          loading={loading}
          emptyMessage="No hay usuarios del personal registrados."
        />
      ) : (
        <EmptyState
          title="Aun no hay personal registrado"
          description="Crea el primer usuario institucional para comenzar a poblar el sistema."
          actionLabel="Nuevo usuario"
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

function getRoleLabel(roleName) {
  const labels = {
    admin_rectorado: 'Administrador / Rectorado',
    coordinador_clubes: 'Coordinador de clubes',
    guardia: 'Guardia',
  }

  return labels[roleName] ?? roleName ?? '-'
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
