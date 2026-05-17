import { useEffect, useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { listTarjetas } from '../../services/tarjetaService'

export function TarjetasPage() {
  const [tarjetas, setTarjetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadTarjetas() {
    setLoading(true)
    setError('')
    const { data, error: fetchError } = await listTarjetas()
    if (fetchError) {
      setError(fetchError.message)
      setTarjetas([])
    } else {
      setTarjetas(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTarjetas()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'uid_nfc', label: 'UID NFC' },
    {
      key: 'estudiante',
      label: 'Estudiante',
      render: (row) =>
        row.estudiante
          ? `${row.estudiante.nombres} ${row.estudiante.apellidos}`
          : row.estudiante_id || '-',
    },
    {
      key: 'fecha_asignacion',
      label: 'Fecha asignacion',
      render: (row) => row.fecha_asignacion || '-',
    },
    {
      key: 'is_active',
      label: 'Estado',
      render: (row) => (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {row.is_active ? 'Activa' : 'Inactiva'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarjetas NFC"
        description="Consulta las asignaciones NFC existentes. El registro y actualizacion del UID se realiza desde la app movil administrativa."
      />

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Esta pantalla es solo de consulta. La web administrativa no escanea,
        registra ni desactiva tarjetas NFC.
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {tarjetas.length || loading ? (
        <DataTable
          columns={columns}
          rows={tarjetas}
          loading={loading}
          emptyMessage="No hay tarjetas NFC registradas."
        />
      ) : (
        <EmptyState
          title="Aun no hay tarjetas NFC"
          description="Todavia no hay asignaciones NFC registradas desde la app movil administrativa."
        />
      )}
    </div>
  )
}
