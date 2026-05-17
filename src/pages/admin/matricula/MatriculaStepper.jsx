const STEPS = ['Buscar estudiante', 'Representante', 'Estudiante', 'Curso', 'Confirmacion']

export function MatriculaStepper({ currentStep }) {
  return (
    <ol className="grid gap-3 md:grid-cols-5">
      {STEPS.map((step, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isDone = stepNumber < currentStep

        return (
          <li
            key={step}
            className={[
              'rounded-xl border px-4 py-3',
              isActive
                ? 'border-slate-900 bg-slate-900 text-white'
                : isDone
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-500',
            ].join(' ')}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">
              Paso {stepNumber}
            </p>
            <p className="mt-1 text-sm font-semibold">{step}</p>
          </li>
        )
      })}
    </ol>
  )
}
