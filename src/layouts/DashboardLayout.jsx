import { useMemo, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  CalendarRange,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Trophy,
  User,
  Users,
} from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { useAuth } from '../hooks/useAuth'

const NAV_BY_ROLE = {
  admin_rectorado: [
    {
      to: '/admin/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      end: true,
    },
    { to: '/admin/matricula', label: 'Matrícula', icon: GraduationCap },
    { to: '/admin/periodos', label: 'Periodos lectivos', icon: CalendarRange },
    { to: '/admin/cursos', label: 'Cursos', icon: BookOpen },
    { to: '/admin/horarios', label: 'Horarios', icon: Clock3 },
    { to: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
    { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
    { to: '/admin/perfil', label: 'Mi perfil', icon: User },
    { to: '/admin/cuenta', label: 'Mi cuenta', icon: Settings },
  ],
  coordinador_clubes: [
    {
      to: '/coordinador/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      end: true,
    },
    { to: '/coordinador/perfil', label: 'Mi perfil', icon: User },
    { to: '/coordinador/cuenta', label: 'Mi cuenta', icon: Settings },
    { to: '/coordinador/clubes', label: 'Mis clubes', icon: Trophy },
  ],
  guardia: [
    {
      to: '/guardia/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      end: true,
    },
  ],
  estudiante: [
    {
      to: '/estudiante/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      end: true,
    },
    { to: '/estudiante/perfil', label: 'Mi perfil', icon: User },
    { to: '/estudiante/cuenta', label: 'Mi cuenta', icon: Settings },
  ],
}

export function DashboardLayout() {
  const { profile, role, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = useMemo(() => {
    return NAV_BY_ROLE[role?.nombre] ?? []
  }, [role?.nombre])

  const displayName =
    [profile?.nombres, profile?.apellidos].filter(Boolean).join(' ') ||
    profile?.email ||
    'Usuario'

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fbff_0%,_#f7f7fb_100%)] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar
          items={navItems}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            onMenuClick={() => setSidebarOpen(true)}
            displayName={displayName}
            email={profile?.email || 'Sin correo'}
            roleName={role?.nombre}
            onSignOut={signOut}
          />

          <main className="flex-1 px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
