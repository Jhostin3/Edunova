import { IDENTIFICATION_TYPE_LABELS } from '../../../utils/identification'

export function ConfirmacionStep({
  mode,
  representante,
  estudiante,
  selectedCurso,
  activePeriodo,
  historialAcademico = [],
  estadoOperativo = null,
  tarjetasNfc = [],
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        Tipo de proceso:{' '}
        <strong>{mode === 'rematricula' ? 'Re-matricula' : 'Nuevo ingreso'}</strong>.
        La asignacion de NFC y rostro se realiza desde la app movil administrativa.
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
      <SummaryCard title="Representante">
        <SummaryItem label="Nombre" value={fullName(representante)} />
        <SummaryItem
          label="Tipo"
          value={IDENTIFICATION_TYPE_LABELS[representante.tipo_identificacion]}
        />
        <SummaryItem label="Identificación" value={representante.cedula} />
        <SummaryItem label="Relacion" value={representante.relacion} />
        <SummaryItem label="Telefono" value={representante.telefono} />
      </SummaryCard>

      <SummaryCard title="Estudiante">
        <SummaryItem label="Nombre" value={fullName(estudiante)} />
        <SummaryItem
          label="Tipo"
          value={IDENTIFICATION_TYPE_LABELS[estudiante.tipo_identificacion]}
        />
        <SummaryItem label="Identificación" value={estudiante.cedula} />
        <SummaryItem
          label="Fecha de nacimiento"
          value={estudiante.fecha_nacimiento}
        />
        <SummaryItem label="Genero" value={estudiante.genero} />
      </SummaryCard>

      <SummaryCard title="Asignación">
        <SummaryItem label="Periodo" value={activePeriodo?.nombre} />
        <SummaryItem label="Curso" value={selectedCurso && formatCurso(selectedCurso)} />
        <SummaryItem
          label="NFC"
          value={estadoOperativo?.nfc_asignada ? 'Asignada' : 'Pendiente'}
        />
        <SummaryItem
          label="Rostro"
          value={estadoOperativo?.rostro_registrado ? 'Registrado' : 'Pendiente'}
        />
      </SummaryCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryCard title="Historial academico">
          {historialAcademico.length ? (
            historialAcademico.slice(0, 4).map((item) => (
              <SummaryItem
                key={item.id}
                label={item.curso?.periodo?.nombre || 'Periodo'}
                value={`${formatCurso(item.curso)} - ${item.estado ? 'Activo' : 'Historico'}`}
              />
            ))
          ) : (
            <SummaryItem label="Historial" value="Sin registros previos" />
          )}
        </SummaryCard>

        <SummaryCard title="Tarjetas NFC">
          <SummaryItem
            label="Estado"
            value={tarjetasNfc.some((tarjeta) => tarjeta.is_active) ? 'Asignada' : 'Pendiente'}
          />
          <SummaryItem label="Historial" value={`${tarjetasNfc.length} tarjeta(s)`} />
        </SummaryCard>
      </div>
    </div>
  )
}

function SummaryCard({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <dl className="mt-4 space-y-3">{children}</dl>
    </section>
  )
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-800">{value || '-'}</dd>
    </div>
  )
}

function fullName(person) {
  return [person.nombres, person.apellidos].filter(Boolean).join(' ')
}

function formatCurso(curso) {
  return (
    curso.nombre ||
    [curso.nivel, curso.paralelo, curso.especialidad].filter(Boolean).join(' ')
  )
}
