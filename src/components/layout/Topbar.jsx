import { getRoleLabel } from '../../utils/roleLabels'

export function Topbar({
  onMenuClick,
  email,
  displayName,
  roleName,
  onSignOut,
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 md:hidden"
          >
            Menu
          </button>

          <div>
            <p className="text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500">{email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 sm:block">
            {getRoleLabel(roleName)}
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cerrar sesion
          </button>
        </div>
      </div>
    </header>
  )
}
