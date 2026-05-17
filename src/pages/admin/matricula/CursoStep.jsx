export function CursoStep({
  cursos,
  periodos,
  activePeriodo: providedActivePeriodo,
  selectedCursoId,
  onCursoChange,
}) {
  const activePeriodo = providedActivePeriodo || periodos.find((periodo) => periodo.activo)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-medium text-slate-700">Periodo lectivo</p>
        <p className="mt-1 text-sm text-slate-600">
          {activePeriodo?.nombre || 'No hay periodo activo configurado.'}
        </p>
      </div>

      <label>
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          Curso
        </span>
        <select
          value={selectedCursoId}
          onChange={(event) => onCursoChange(event.target.value)}
          className="input"
        >
          <option value="">Sin asignar por ahora</option>
          {cursos.map((curso) => (
            <option key={curso.id} value={curso.id}>
              {formatCurso(curso)}
            </option>
          ))}
        </select>
      </label>

      {!cursos.length ? (
        <p className="text-sm text-amber-700">
          No hay cursos activos disponibles para el periodo activo. Puedes continuar y asignarlo luego.
        </p>
      ) : null}
    </div>
  )
}

function formatCurso(curso) {
  return (
    curso.nombre ||
    [curso.nivel, curso.paralelo, curso.especialidad].filter(Boolean).join(' ')
  )
}
