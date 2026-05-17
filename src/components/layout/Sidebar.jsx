import { NavLink } from 'react-router-dom'

function linkClass({ isActive }) {
  return [
    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-slate-900 text-white shadow-sm'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ')
}

export function Sidebar({ items, open, onClose }) {
  const logoSrc = `${import.meta.env.BASE_URL}logo-edunova.png`

  return (
    <>
      <div
        className={[
          'fixed inset-0 z-30 bg-slate-950/35 transition md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white px-4 py-6 shadow-xl transition-transform md:static md:translate-x-0 md:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logoSrc}
              alt="Logo Edunova"
              className="h-12 w-12 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-[0.35em] text-sky-600">
                EDUNOVA
              </p>
              <h1 className="text-xl font-bold text-slate-950">Panel</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-500 md:hidden"
          >
            Cerrar
          </button>
        </div>

        <nav className="space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={linkClass}
              onClick={onClose}
            >
              {item.icon ? (
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              ) : null}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
