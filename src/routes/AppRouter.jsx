import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getDashboardPathForRole } from '../utils/roleRedirect'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'

const lazyPage = (loader, exportName) =>
  lazy(() => loader().then((module) => ({ default: module[exportName] })))

const LoginPage = lazyPage(() => import('../pages/auth/LoginPage'), 'LoginPage')
const AdminDashboard = lazyPage(
  () => import('../pages/admin/AdminDashboard'),
  'AdminDashboard'
)
const AdminPerfilPage = lazyPage(
  () => import('../pages/admin/AdminPerfilPage'),
  'AdminPerfilPage'
)
const AdminCuentaPage = lazyPage(
  () => import('../pages/admin/AdminCuentaPage'),
  'AdminCuentaPage'
)
const HorarioMateriasPage = lazyPage(
  () => import('../pages/admin/horario-materias/HorarioMateriasPage'),
  'HorarioMateriasPage'
)
const HorariosPage = lazyPage(
  () => import('../pages/admin/horarios/HorariosPage'),
  'HorariosPage'
)
const PeriodosPage = lazyPage(
  () => import('../pages/admin/periodos/PeriodosPage'),
  'PeriodosPage'
)
const UsuariosPage = lazyPage(
  () => import('../pages/admin/usuarios/UsuariosPage'),
  'UsuariosPage'
)
const MatriculaPage = lazyPage(
  () => import('../pages/admin/matricula/MatriculaPage'),
  'MatriculaPage'
)
const ReportesPage = lazyPage(
  () => import('../pages/admin/reportes/ReportesPage'),
  'ReportesPage'
)
const CoordinadorDashboard = lazyPage(
  () => import('../pages/coordinador/CoordinadorDashboard'),
  'CoordinadorDashboard'
)
const CoordinadorPerfilPage = lazyPage(
  () => import('../pages/coordinador/CoordinadorPerfilPage'),
  'CoordinadorPerfilPage'
)
const CoordinadorCuentaPage = lazyPage(
  () => import('../pages/coordinador/CoordinadorCuentaPage'),
  'CoordinadorCuentaPage'
)
const ClubesPage = lazyPage(
  () => import('../pages/coordinador/clubes/ClubesPage'),
  'ClubesPage'
)
const ClubDetailPage = lazyPage(
  () => import('../pages/coordinador/clubes/ClubDetailPage'),
  'ClubDetailPage'
)
const EstudiantesPage = lazyPage(
  () => import('../pages/estudiantes/EstudiantesPage'),
  'EstudiantesPage'
)
const RepresentantesPage = lazyPage(
  () => import('../pages/representantes/RepresentantesPage'),
  'RepresentantesPage'
)
const CursosPage = lazyPage(() => import('../pages/cursos/CursosPage'), 'CursosPage')
const TarjetasPage = lazyPage(
  () => import('../pages/tarjetas/TarjetasPage'),
  'TarjetasPage'
)
const MobileOnlyPage = lazyPage(
  () => import('../pages/shared/MobileOnlyPage'),
  'MobileOnlyPage'
)

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <div
          className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900"
          aria-hidden
        />
        <p className="mt-4 text-sm font-medium text-slate-600">
          Cargando Edunova...
        </p>
      </div>
    </div>
  )
}

function HomeRedirect() {
  const { user, role, loading } = useAuth()

  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />

  const path = getDashboardPathForRole(role?.nombre)
  return <Navigate to={path || '/login'} replace />
}

export function AppRouter() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomeRedirect />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['admin_rectorado']}>
              <DashboardLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="perfil" element={<AdminPerfilPage />} />
        <Route path="cuenta" element={<AdminCuentaPage />} />
        <Route path="matricula" element={<MatriculaPage />} />
        <Route path="periodos" element={<PeriodosPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="estudiantes" element={<EstudiantesPage />} />
        <Route path="representantes" element={<RepresentantesPage />} />
        <Route path="cursos" element={<CursosPage />} />
        <Route path="horarios" element={<HorariosPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="horarios/visual" element={<HorarioMateriasPage />} />
        <Route
          path="horario-materias"
          element={<Navigate to="/admin/horarios/visual" replace />}
        />
        <Route path="tarjetas" element={<TarjetasPage />} />
      </Route>

      <Route
        path="/coordinador"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['coordinador_clubes']}>
              <DashboardLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CoordinadorDashboard />} />
        <Route path="perfil" element={<CoordinadorPerfilPage />} />
        <Route path="cuenta" element={<CoordinadorCuentaPage />} />
        <Route path="clubes" element={<ClubesPage />} />
        <Route path="clubes/:id" element={<ClubDetailPage />} />
        <Route path="clubes/:id/inscribir" element={<ClubDetailPage />} />
      </Route>

      <Route
        path="/guardia/*"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['guardia']}>
              <MobileOnlyPage roleName="guardia" />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/estudiante/*"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['estudiante']}>
              <MobileOnlyPage roleName="estudiante" />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
