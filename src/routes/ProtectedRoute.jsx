import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isSupabaseConfigured } from '../services/supabaseClient'
import { useAuth } from '../hooks/useAuth'

/**
 * Requiere sesión. Si hay hijos en rutas anidadas, renderiza Outlet.
 */
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (!isSupabaseConfigured) {
    return <Navigate to="/login" replace />
  }

  if (loading) {
    return <RouteLoader />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
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
