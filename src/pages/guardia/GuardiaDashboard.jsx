import { PageHeader } from '../../components/ui/PageHeader'

export function GuardiaDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard de guardia"
        description="Base inicial para flujos de control de acceso y verificaciones."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Este panel esta preparado para integrar verificaciones y registros NFC.
        </p>
      </div>
    </div>
  )
}
