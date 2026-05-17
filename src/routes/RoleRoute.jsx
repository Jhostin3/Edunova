import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getDashboardPathForRole } from '../utils/roleRedirect'

/**
 * @param {string[]} allowed — valores de roles.nombre permitidos
 */
export function RoleRoute({ allowed, children }) {
  const { role, user, loading } = useAuth()

  if (loading) {
    return <RouteLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!role?.nombre) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-center text-sm text-slate-600">
          Tu cuenta no tiene perfil o rol asignado.
        </p>
      </div>
    )
  }

  if (!allowed.includes(role.nombre)) {
    const fallback = getDashboardPathForRole(role.nombre) ?? '/login'
    return <Navigate to={fallback} replace />
  }

  return children ? children : <Outlet />
}

function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <div
          className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600"
          aria-hidden
        />
        <p className="mt-4 text-sm font-medium text-slate-600">
          Cargando Edunova...
        </p>
      </div>
    </div>
  )
}
