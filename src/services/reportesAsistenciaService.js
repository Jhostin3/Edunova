import { supabase } from './supabaseClient'
import { getPeriodoActivo } from './periodoService'

function buildCursoLabel(curso) {
  if (!curso) return 'Sin curso'

  return (
    curso.curso_nombre ||
    curso.nombre ||
    [curso.nivel, curso.paralelo, curso.especialidad].filter(Boolean).join(' ')
  )
}

function formatObservation(row) {
  if (!row.hora_entrada) return 'Sin entrada registrada'
  if (row.hora_entrada && !row.hora_salida) return 'Permanece dentro'
  return 'Jornada cerrada'
}

export async function getReporteAsistenciaByDate(date) {
  const selectedDate = String(date ?? '').trim()

  if (!selectedDate) {
    return { data: null, error: new Error('Selecciona una fecha valida.') }
  }

  const { data: activePeriodo, error: periodoError } = await getPeriodoActivo()
  if (periodoError) return { data: null, error: periodoError }
  if (!activePeriodo?.id) {
    return { data: null, error: new Error('No existe un periodo lectivo activo.') }
  }

  const { data: activeCourses, error: coursesError } = await supabase
    .from('cursos')
    .select('id')
    .eq('periodo_id', activePeriodo.id)
    .eq('estado', true)

  if (coursesError) return { data: null, error: coursesError }

  const activeCourseIds = (activeCourses ?? []).map((course) => course.id)

  if (!activeCourseIds.length) {
    return {
      data: buildEmptyReport(selectedDate),
      error: null,
    }
  }

  const { data: activeEnrollments, error: enrollmentsError } = await supabase
    .from('estudiante_curso')
    .select('estudiante_id, curso_id')
    .in('curso_id', activeCourseIds)
    .eq('estado', true)

  if (enrollmentsError) return { data: null, error: enrollmentsError }

  const enrollmentRows = activeEnrollments ?? []
  const studentIds = [...new Set(enrollmentRows.map((row) => row.estudiante_id))]

  if (!studentIds.length) {
    return {
      data: buildEmptyReport(selectedDate),
      error: null,
    }
  }

  const [studentsResult, attendanceResult] = await Promise.all([
    supabase
      .from('estudiantes')
      .select(
        `
        id,
        nombres,
        apellidos,
        estado
      `
      )
      .in('id', studentIds)
      .eq('estado', true)
      .order('apellidos', { ascending: true }),
    supabase
      .from('v_asistencias_estudiante')
      .select(
        `
        estudiante_id,
        fecha,
        hora_entrada,
        hora_salida,
        estado_entrada
      `
      )
      .eq('fecha', selectedDate)
      .in('estudiante_id', studentIds),
  ])

  if (studentsResult.error) return { data: null, error: studentsResult.error }
  if (attendanceResult.error) return { data: null, error: attendanceResult.error }

  const students = studentsResult.data ?? []
  const attendanceByStudent = new Map(
    (attendanceResult.data ?? []).map((row) => [row.estudiante_id, row])
  )

  const cursoById = await getCursoMap(activeCourseIds)
  if (cursoById.error) return { data: null, error: cursoById.error }

  const cursoByStudent = new Map(
    enrollmentRows.map((row) => [row.estudiante_id, cursoById.data.get(row.curso_id) ?? null])
  )

  const rows = students.map((student) => {
    const attendance = attendanceByStudent.get(student.id) ?? {}
    const curso = cursoByStudent.get(student.id) ?? null
    const horaEntrada = attendance.hora_entrada ?? ''
    const horaSalida = attendance.hora_salida ?? ''

    return {
      id: student.id,
      estudiante: [student.apellidos, student.nombres].filter(Boolean).join(' '),
      curso: buildCursoLabel(curso),
      hora_entrada: horaEntrada,
      hora_salida: horaSalida,
      estado_entrada: attendance.estado_entrada || (horaEntrada ? 'Registrada' : 'Sin entrada'),
      estado_salida: horaSalida ? 'Registrada' : 'Sin salida',
      estado_actual: horaEntrada && !horaSalida ? 'Dentro' : horaSalida ? 'Fuera' : 'Ausente',
      observacion: formatObservation({
        hora_entrada: horaEntrada,
        hora_salida: horaSalida,
      }),
    }
  })

  const totalActivos = rows.length
  const conEntrada = rows.filter((row) => row.hora_entrada).length
  const conSalida = rows.filter((row) => row.hora_salida).length
  const sinEntrada = totalActivos - conEntrada
  const dentro = Math.max(conEntrada - conSalida, 0)

  const byCourseMap = new Map()
  for (const row of rows) {
    const current = byCourseMap.get(row.curso) ?? {
      curso: row.curso,
      total: 0,
      entradas: 0,
    }

    current.total += 1
    if (row.hora_entrada) current.entradas += 1
    byCourseMap.set(row.curso, current)
  }

  return {
    data: {
      date: selectedDate,
      rows,
      metrics: {
        totalActivos,
        conEntrada,
        sinEntrada,
        conSalida,
        dentro,
      },
      charts: {
        ingreso: [
          { name: 'Ingresaron', value: conEntrada },
          { name: 'No ingresaron', value: sinEntrada },
        ],
        permanencia: [
          { name: 'Salieron', value: conSalida },
          { name: 'Permanecen dentro', value: dentro },
        ],
        porCurso: Array.from(byCourseMap.values()).sort((a, b) =>
          a.curso.localeCompare(b.curso)
        ),
      },
    },
    error: null,
  }
}

function buildEmptyReport(date) {
  return {
    date,
    rows: [],
    metrics: {
      totalActivos: 0,
      conEntrada: 0,
      sinEntrada: 0,
      conSalida: 0,
      dentro: 0,
    },
    charts: {
      ingreso: [
        { name: 'Ingresaron', value: 0 },
        { name: 'No ingresaron', value: 0 },
      ],
      permanencia: [
        { name: 'Salieron', value: 0 },
        { name: 'Permanecen dentro', value: 0 },
      ],
      porCurso: [],
    },
  }
}

async function getCursoMap(courseIds) {
  const { data, error } = await supabase
    .from('cursos')
    .select(
      `
      id,
      nombre,
      nivel,
      paralelo,
      especialidad
    `
    )
    .in('id', courseIds)

  if (error) return { data: new Map(), error }
  return { data: new Map((data ?? []).map((curso) => [curso.id, curso])), error: null }
}
