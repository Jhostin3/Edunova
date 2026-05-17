import { Smartphone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const DETAILS_BY_ROLE = {
  estudiante: 'Estudiante: asistencias, horario y perfil academico.',
  guardia: 'Guardia: validacion de ingreso y consulta de estudiantes.',
}

export function MobileOnlyPage({ roleName }) {
  const navigate = useNavigate()
  const { role, signOut } = useAuth()
  const finalRoleName = roleName ?? role?.nombre
  const detail = DETAILS_BY_ROLE[finalRoleName]

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f8fbff_0%,_#f7f7fb_100%)] px-4 py-10 text-slate-900">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          <Smartphone className="h-7 w-7" aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-slate-950">
          Servicio disponible en la aplicación móvil
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Este módulo está diseñado para utilizarse desde la app móvil de
          Edunova. Ingresa desde tu dispositivo Android para acceder a tus
          funciones.
        </p>

        {detail ? (
          <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            {detail}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Cerrar sesión
        </button>
      </section>
    </div>
  )
}
