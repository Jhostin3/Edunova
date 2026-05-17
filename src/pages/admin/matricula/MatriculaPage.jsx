import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../../components/ui/PageHeader'
import { IdentificationFields } from '../../../components/forms/IdentificationFields'
import {
  createEstudiante,
  findEstudianteByCedula,
  listCursosByPeriodoActivo,
  rematricularEstudianteExistente,
} from '../../../services/estudianteService'
import {
  createRepresentante,
  findRepresentanteByCedula,
} from '../../../services/representanteService'
import { listPeriodos } from '../../../services/periodoService'
import { ConfirmacionStep } from './ConfirmacionStep'
import { CursoStep } from './CursoStep'
import { EstudianteStep } from './EstudianteStep'
import { MatriculaStepper } from './MatriculaStepper'
import { RepresentanteStep } from './RepresentanteStep'
import { validateIdentification } from '../../../utils/identification'
import {
  downloadMatriculaReceipt,
  printMatriculaReceipt,
} from './matriculaReceiptPdf'

const REPRESENTANTE_INITIAL = {
  nombres: '',
  apellidos: '',
  tipo_identificacion: 'cedula_ecuatoriana',
  cedula: '',
  relacion: '',
  telefono: '',
  email: '',
  whatsapp: '',
  direccion: '',
}

const ESTUDIANTE_INITIAL = {
  nombres: '',
  apellidos: '',
  tipo_identificacion: 'cedula_ecuatoriana',
  cedula: '',
  fecha_nacimiento: '',
  genero: '',
  direccion: '',
}

const SEARCH_INITIAL = {
  tipo_identificacion: 'cedula_ecuatoriana',
  cedula: '',
}

export function MatriculaPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [search, setSearch] = useState(SEARCH_INITIAL)
  const [lookupDone, setLookupDone] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [matriculaMode, setMatriculaMode] = useState(null)
  const [existingStudent, setExistingStudent] = useState(null)
  const [representante, setRepresentante] = useState(REPRESENTANTE_INITIAL)
  const [estudiante, setEstudiante] = useState(ESTUDIANTE_INITIAL)
  const [cursoId, setCursoId] = useState('')
  const [cursos, setCursos] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [activePeriodo, setActivePeriodo] = useState(null)
  const [historialAcademico, setHistorialAcademico] = useState([])
  const [estadoOperativo, setEstadoOperativo] = useState(null)
  const [tarjetasNfc, setTarjetasNfc] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    let mounted = true

    async function loadOptions() {
      setLoadingOptions(true)
      const [cursosResult, periodosResult] = await Promise.all([
        listCursosByPeriodoActivo(),
        listPeriodos(),
      ])

      if (!mounted) return

      if (cursosResult.error || periodosResult.error) {
        setError(cursosResult.error?.message || periodosResult.error?.message || '')
        setCursos([])
        setPeriodos([])
        setActivePeriodo(null)
      } else {
        setCursos(cursosResult.data)
        setPeriodos(periodosResult.data)
        setActivePeriodo(
          cursosResult.periodo || periodosResult.data.find((periodo) => periodo.activo) || null
        )
      }

      setLoadingOptions(false)
    }

    void loadOptions()

    return () => {
      mounted = false
    }
  }, [])

  const selectedCurso = useMemo(
    () => cursos.find((curso) => curso.id === cursoId) ?? null,
    [cursoId, cursos]
  )

  const handleSearchChange = (event) => {
    const { name, value } = event.target
    setSearch((current) => ({ ...current, [name]: value }))
    setLookupDone(false)
    setMatriculaMode(null)
    setExistingStudent(null)
    setHistorialAcademico([])
    setEstadoOperativo(null)
    setTarjetasNfc([])
  }

  const handleRepresentanteChange = (event) => {
    const { name, value } = event.target
    setRepresentante((current) => ({ ...current, [name]: value }))
  }

  const handleEstudianteChange = (event) => {
    const { name, value } = event.target
    setEstudiante((current) => ({ ...current, [name]: value }))
  }

  const handleLookupStudent = async () => {
    const validation = validateIdentification(search.tipo_identificacion, search.cedula)
    if (!search.cedula.trim()) {
      setError('Ingresa la cedula del estudiante para buscar.')
      return
    }
    if (validation) {
      setError(validation)
      return
    }

    setLookupLoading(true)
    setError('')

    const { data, error: lookupError } = await findEstudianteByCedula(search.cedula)

    if (lookupError) {
      setError(`No se pudo buscar el estudiante: ${lookupError.message}`)
      setLookupLoading(false)
      return
    }

    setLookupDone(true)
    setLookupLoading(false)

    if (!data?.id) {
      setMatriculaMode('nuevo_ingreso')
      setExistingStudent(null)
      setRepresentante(REPRESENTANTE_INITIAL)
      setEstudiante({
        ...ESTUDIANTE_INITIAL,
        tipo_identificacion: search.tipo_identificacion,
        cedula: search.cedula.trim(),
      })
      setHistorialAcademico([])
      setEstadoOperativo(null)
      setTarjetasNfc([])
      return
    }

    const representantePrincipal = data.representante_principal ?? null
    setMatriculaMode('rematricula')
    setExistingStudent(data)
    setEstudiante({
      nombres: data.nombres ?? '',
      apellidos: data.apellidos ?? '',
      tipo_identificacion: data.tipo_identificacion || search.tipo_identificacion,
      cedula: data.cedula ?? search.cedula.trim(),
      fecha_nacimiento: data.fecha_nacimiento ?? '',
      genero: data.genero ?? '',
      direccion: data.direccion ?? '',
    })
    setRepresentante(
      representantePrincipal
        ? {
            nombres: representantePrincipal.nombres ?? '',
            apellidos: representantePrincipal.apellidos ?? '',
            tipo_identificacion:
              representantePrincipal.tipo_identificacion || 'cedula_ecuatoriana',
            cedula: representantePrincipal.cedula ?? '',
            relacion: representantePrincipal.relacion ?? '',
            telefono: representantePrincipal.telefono ?? '',
            email: representantePrincipal.email ?? '',
            whatsapp: representantePrincipal.whatsapp ?? '',
            direccion: representantePrincipal.direccion ?? '',
          }
        : REPRESENTANTE_INITIAL
    )
    setHistorialAcademico(data.historial_academico ?? [])
    setEstadoOperativo(data.estado_operativo ?? null)
    setTarjetasNfc(data.tarjetas_nfc ?? [])
  }

  const handleNext = () => {
    const validation = validateStep(step, lookupDone, representante, estudiante)
    if (validation) {
      setError(validation)
      return
    }

    setError('')
    setStep((current) => Math.min(current + 1, 5))
  }

  const handleBack = () => {
    setError('')
    setStep((current) => Math.max(current - 1, 1))
  }

  const handleCancel = () => {
    navigate('/admin/dashboard')
  }

  const handleNewMatricula = () => {
    setStep(1)
    setSearch(SEARCH_INITIAL)
    setLookupDone(false)
    setLookupLoading(false)
    setMatriculaMode(null)
    setExistingStudent(null)
    setRepresentante(REPRESENTANTE_INITIAL)
    setEstudiante(ESTUDIANTE_INITIAL)
    setCursoId('')
    setHistorialAcademico([])
    setEstadoOperativo(null)
    setTarjetasNfc([])
    setError('')
    setSuccess(null)
  }

  const handleConfirm = async () => {
    const validation =
      validateStep(1, lookupDone, representante, estudiante) ||
      validateStep(2, lookupDone, representante, estudiante) ||
      validateStep(3, lookupDone, representante, estudiante)

    if (validation) {
      setError(validation)
      return
    }

    setSaving(true)
    setError('')
    setSuccess(null)

    const representantePayload = buildRepresentantePayload(representante)
    const { data: representanteData, error: representanteError } =
      await getOrCreateRepresentante(representantePayload)

    if (representanteError || !representanteData?.id) {
      setError(
        `No se pudo guardar el representante: ${representanteError?.message || 'respuesta invalida'}`
      )
      setSaving(false)
      return
    }

    const estudiantePayload = buildEstudiantePayload(
      estudiante,
      representanteData.id,
      cursoId
    )

    const saveResult = existingStudent?.id
      ? await rematricularEstudianteExistente(existingStudent.id, estudiantePayload)
      : await createEstudiante(estudiantePayload)

    if (saveResult.error || !saveResult.data?.student?.id) {
      setError(
        `Representante guardado, pero no se pudo guardar la matricula: ${
          saveResult.error?.message || 'respuesta invalida'
        }`
      )
      setSaving(false)
      return
    }

    const refreshedResult = await findEstudianteByCedula(estudiantePayload.cedula)
    const refreshedStudent = refreshedResult.data ?? null

    setSuccess({
      mode: existingStudent?.id ? 'rematricula' : 'nuevo_ingreso',
      estudiante: saveResult.data.student,
      credentials: saveResult.data.credentials ?? null,
      accessEmail:
        saveResult.data.credentials?.email ||
        saveResult.data.student?.correo_institucional ||
        existingStudent?.correo_institucional ||
        estudiantePayload.correo_institucional ||
        '',
      representante: {
        ...representantePayload,
        id: representanteData.id,
      },
      estudianteForm: estudiantePayload,
      selectedCurso,
      activePeriodo,
      historialAcademico:
        refreshedStudent?.historial_academico ?? saveResult.data.historial_academico ?? [],
      estadoOperativo:
        refreshedStudent?.estado_operativo ?? saveResult.data.estado_operativo ?? null,
      tarjetasNfc: refreshedStudent?.tarjetas_nfc ?? saveResult.data.tarjetas_nfc ?? [],
      infoMessage: existingStudent?.id
        ? 'Estudiante existente re-matriculado sin duplicar su registro.'
        : 'Nuevo ingreso registrado correctamente.',
      issuedAt: new Date().toISOString(),
      enrolledAt: new Date().toISOString(),
    })
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matricula"
        description="Registra nuevos ingresos o re-matricula estudiantes existentes por periodo lectivo."
      />

      <MatriculaStepper currentStep={success ? 5 : step} />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <SuccessState success={success} onNew={handleNewMatricula} />
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <StepTitle step={step} />

          <div className="mt-6">
            {step === 1 ? (
              <BuscarEstudianteStep
                search={search}
                lookupDone={lookupDone}
                lookupLoading={lookupLoading}
                mode={matriculaMode}
                existingStudent={existingStudent}
                historialAcademico={historialAcademico}
                estadoOperativo={estadoOperativo}
                tarjetasNfc={tarjetasNfc}
                onChange={handleSearchChange}
                onLookup={handleLookupStudent}
              />
            ) : null}

            {step === 2 ? (
              <RepresentanteStep
                form={representante}
                onChange={handleRepresentanteChange}
              />
            ) : null}

            {step === 3 ? (
              <EstudianteStep form={estudiante} onChange={handleEstudianteChange} />
            ) : null}

            {step === 4 ? (
              <CursoStep
                cursos={cursos}
                periodos={periodos}
                activePeriodo={activePeriodo}
                selectedCursoId={cursoId}
                onCursoChange={setCursoId}
              />
            ) : null}

            {step === 5 ? (
              <ConfirmacionStep
                mode={matriculaMode}
                representante={representante}
                estudiante={estudiante}
                selectedCurso={selectedCurso}
                activePeriodo={activePeriodo}
                historialAcademico={historialAcademico}
                estadoOperativo={estadoOperativo}
                tarjetasNfc={tarjetasNfc}
              />
            ) : null}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Atras
                </button>
              ) : null}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loadingOptions && step === 4}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Confirmar matricula'}
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function BuscarEstudianteStep({
  search,
  lookupDone,
  lookupLoading,
  mode,
  existingStudent,
  historialAcademico,
  estadoOperativo,
  tarjetasNfc,
  onChange,
  onLookup,
}) {
  const identificationError = validateIdentification(
    search.tipo_identificacion,
    search.cedula
  )

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <IdentificationFields
          type={search.tipo_identificacion}
          value={search.cedula}
          error={identificationError}
          onTypeChange={(value) =>
            onChange({ target: { name: 'tipo_identificacion', value } })
          }
          onValueChange={(value) => onChange({ target: { name: 'cedula', value } })}
        />
        <button
          type="button"
          onClick={onLookup}
          disabled={lookupLoading}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {lookupLoading ? 'Buscando...' : 'Buscar estudiante'}
        </button>
      </div>

      {lookupDone ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              mode === 'rematricula'
                ? 'bg-sky-100 text-sky-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {mode === 'rematricula' ? 'Estudiante existente' : 'Nuevo ingreso'}
          </span>

          <h3 className="mt-3 text-lg font-semibold text-slate-900">
            {mode === 'rematricula'
              ? `${existingStudent?.nombres ?? ''} ${existingStudent?.apellidos ?? ''}`
              : 'No existe un estudiante con esta identificacion'}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {mode === 'rematricula'
              ? 'Se reutilizara el registro existente y se creara una nueva asignacion academica para el periodo activo.'
              : 'Continua para registrar sus datos personales y matricularlo como nuevo ingreso.'}
          </p>

          {mode === 'rematricula' ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <HistorialCard historial={historialAcademico} />
              <EstadoOperativoCard estado={estadoOperativo} />
              <TarjetasResumenCard tarjetas={tarjetasNfc} />
            </div>
          ) : null}

          <MobileAdminNotice />
        </div>
      ) : null}
    </div>
  )
}

function StepTitle({ step }) {
  const titles = {
    1: ['Buscar estudiante', 'Primero verifica si ya existe por identificacion.'],
    2: ['Datos del representante', 'Reutiliza o completa al padre, madre o tutor.'],
    3: ['Datos del estudiante', 'Completa o actualiza la informacion base.'],
    4: ['Asignacion academica', 'Selecciona un curso del periodo activo.'],
    5: ['Confirmacion y guardado', 'Revisa la matricula antes de guardarla.'],
  }
  const [title, description] = titles[step]

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  )
}

function SuccessState({ success, onNew }) {
  const receiptData = {
    ...success,
    estudiante: {
      ...success.estudianteForm,
      correo_institucional:
        success.accessEmail || success.estudiante?.correo_institucional || '',
    },
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-emerald-800">
        {success.mode === 'rematricula'
          ? 'Re-matricula registrada correctamente'
          : 'Matricula registrada correctamente'}
      </h2>
      <p className="mt-2 text-sm text-emerald-700">
        La asignacion academica fue guardada para el periodo activo sin registrar
        NFC ni rostro desde la web.
      </p>

      {success.credentials || success.accessEmail ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <CredentialCard
            label="Correo institucional"
            value={success.credentials?.email || success.accessEmail}
          />
          {success.credentials?.temporaryPassword ? (
            <CredentialCard
              label="Contrasena temporal"
              value={success.credentials.temporaryPassword}
            />
          ) : (
            <div className="rounded-xl border border-sky-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                Contrasena
              </p>
              <p className="mt-2 text-sm text-slate-700">
                En re-matricula se conserva la cuenta existente. Si el estudiante
                no recuerda su contrasena, debe restablecerse desde administracion.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {success.infoMessage ? (
        <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700">
          {success.infoMessage}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <HistorialCard historial={success.historialAcademico} />
        <EstadoOperativoCard estado={success.estadoOperativo} />
        <TarjetasResumenCard tarjetas={success.tarjetasNfc} />
      </div>

      <MobileAdminNotice />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => downloadMatriculaReceipt(receiptData)}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Descargar comprobante PDF
        </button>
        <button
          type="button"
          onClick={() => printMatriculaReceipt(receiptData)}
          className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          Imprimir
        </button>
        <button
          type="button"
          onClick={onNew}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-emerald-100"
        >
          Registrar otra matricula
        </button>
      </div>
    </section>
  )
}

function HistorialCard({ historial }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Historial academico</h3>
      {historial?.length ? (
        <div className="mt-3 space-y-3">
          {historial.slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-800">
                {item.curso?.periodo?.nombre || 'Periodo sin nombre'}
              </p>
              <p className="text-sm text-slate-600">{formatCurso(item.curso)}</p>
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                  item.estado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.estado ? 'Activo' : 'Historico'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Sin historial academico previo.</p>
      )}
    </section>
  )
}

function EstadoOperativoCard({ estado }) {
  const nfcReady = Boolean(estado?.nfc_asignada)
  const faceReady = Boolean(estado?.rostro_registrado)
  const attendanceReady = Boolean(estado?.listo_asistencia)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Estado operativo</h3>
      <div className="mt-3 space-y-2">
        <StatusPill ready={Boolean(estado?.matricula_completada)} readyText="Matricula completada" pendingText="Matricula pendiente" />
        <StatusPill ready={nfcReady} readyText="NFC asignada" pendingText="NFC pendiente" />
        <StatusPill ready={faceReady} readyText="Rostro registrado" pendingText="Rostro pendiente" />
        <StatusPill ready={attendanceReady} readyText="Listo asistencia" pendingText="Asistencia pendiente" />
      </div>
    </section>
  )
}

function TarjetasResumenCard({ tarjetas }) {
  const activeCard = tarjetas?.find((tarjeta) => tarjeta.is_active)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Tarjetas NFC</h3>
      <p className="mt-3 text-sm text-slate-600">
        {activeCard
          ? `Tarjeta activa registrada: ${activeCard.uid_nfc}`
          : 'No hay tarjeta NFC activa registrada.'}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Historial disponible: {tarjetas?.length ?? 0} tarjeta(s).
      </p>
    </section>
  )
}

function StatusPill({ ready, readyText, pendingText }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      {ready ? readyText : pendingText}
    </span>
  )
}

function MobileAdminNotice() {
  return (
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      La asignacion de NFC y rostro se realiza desde la app movil administrativa.
      La web solo muestra el estado y el historial disponible.
    </div>
  )
}

function CredentialCard({ label, value }) {
  const copyValue = async () => {
    if (!navigator?.clipboard?.writeText) return
    await navigator.clipboard.writeText(value)
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        {label}
      </p>
      <p className="mt-2 break-all rounded-xl bg-slate-900 px-3 py-2 font-mono text-sm text-white">
        {value}
      </p>
      <button
        type="button"
        onClick={copyValue}
        className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Copiar
      </button>
    </div>
  )
}

async function getOrCreateRepresentante(payload) {
  const { data: existing, error: lookupError } = await findRepresentanteByCedula(
    payload.cedula
  )

  if (lookupError) return { data: null, error: lookupError }
  if (existing?.id) return { data: existing, error: null }

  return createRepresentante(payload)
}

function validateStep(step, lookupDone, representante, estudiante) {
  if (step === 1 && !lookupDone) {
    return 'Busca al estudiante por cedula antes de continuar.'
  }

  if (step === 2) {
    if (!representante.nombres.trim()) return 'Ingresa los nombres del representante.'
    if (!representante.apellidos.trim()) return 'Ingresa los apellidos del representante.'
    if (!representante.cedula.trim()) return 'Ingresa la cedula del representante.'
    if (validateIdentification(representante.tipo_identificacion, representante.cedula)) {
      return validateIdentification(representante.tipo_identificacion, representante.cedula)
    }
    if (!representante.relacion.trim()) return 'Ingresa la relacion con el estudiante.'
  }

  if (step === 3) {
    if (!estudiante.nombres.trim()) return 'Ingresa los nombres del estudiante.'
    if (!estudiante.apellidos.trim()) return 'Ingresa los apellidos del estudiante.'
    if (!estudiante.cedula.trim()) return 'Ingresa la cedula del estudiante.'
    if (validateIdentification(estudiante.tipo_identificacion, estudiante.cedula)) {
      return validateIdentification(estudiante.tipo_identificacion, estudiante.cedula)
    }
  }

  return ''
}

function buildRepresentantePayload(form) {
  return {
    nombres: form.nombres.trim(),
    apellidos: form.apellidos.trim(),
    tipo_identificacion: form.tipo_identificacion,
    cedula: form.cedula.trim(),
    relacion: form.relacion.trim(),
    telefono: form.telefono.trim() || null,
    email: form.email.trim() || null,
    whatsapp: form.whatsapp.trim() || null,
    direccion: form.direccion.trim() || null,
    estado: true,
  }
}

function buildEstudiantePayload(form, representanteId, selectedCursoId) {
  return {
    nombres: form.nombres.trim(),
    apellidos: form.apellidos.trim(),
    tipo_identificacion: form.tipo_identificacion,
    cedula: form.cedula.trim(),
    fecha_nacimiento: form.fecha_nacimiento || null,
    genero: form.genero || null,
    direccion: form.direccion.trim() || null,
    estado: true,
    representante_principal_id: representanteId,
    curso_id: selectedCursoId || null,
  }
}

function formatCurso(curso) {
  if (!curso) return 'Sin curso asignado'
  return (
    curso.nombre ||
    [curso.nivel, curso.paralelo, curso.especialidad].filter(Boolean).join(' ')
  )
}
