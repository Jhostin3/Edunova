export function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-8 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}
