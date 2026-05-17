import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PageHeader } from '../../../components/ui/PageHeader'
import {
  BLOCK_DURATION_MINUTES,
  getCursos,
  getDiaSemanaLabel,
  getHorarioMateriaTemplate,
  normalizeTimeString,
  saveHorarioMateriaTemplate,
} from '../../../services/horarioMateriasService'

export function HorarioMateriasPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [cursos, setCursos] = useState([])
  const [templateBlocks, setTemplateBlocks] = useState([])
  const [visibleDays, setVisibleDays] = useState([])
  const [globalRows, setGlobalRows] = useState([])
  const [loadingCursos, setLoadingCursos] = useState(true)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedCursoId = searchParams.get('curso') ?? ''

  async function loadCursos() {
    setLoadingCursos(true)
    const { data, error: requestError } = await getCursos()

    if (requestError) {
      setCursos([])
      setError(requestError.message)
    } else {
      setCursos(data)
    }

    setLoadingCursos(false)
  }

  async function loadTemplate(cursoId) {
    if (!cursoId) {
      setTemplateBlocks([])
      setVisibleDays([])
      setGlobalRows([])
      return
    }

    setLoadingTemplate(true)
    setError('')

    const { data, error: requestError } = await getHorarioMateriaTemplate(cursoId)

    if (requestError) {
      setTemplateBlocks([])
      setVisibleDays([])
      setGlobalRows([])
      setError(requestError.message)
    } else {
      setTemplateBlocks(data.blocks ?? [])
      setVisibleDays(data.visibleDays ?? [])
      setGlobalRows(data.globalRows ?? [])
    }

    setLoadingTemplate(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCursos()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTemplate(selectedCursoId)
    }, 0)

    return () => clearTimeout(timer)
  }, [selectedCursoId])

  const selectedCurso = cursos.find((curso) => curso.id === selectedCursoId) ?? null

  const tableColumns = useMemo(() => {
    return [...visibleDays].sort((a, b) => Number(a.value) - Number(b.value))
  }, [visibleDays])

  const tableRows = useMemo(() => {
    const blockMap = new Map()

    for (const block of templateBlocks) {
      const normalizedHoraInicio = normalizeTimeString(block.hora_inicio)
      const normalizedHoraFin = normalizeTimeString(block.hora_fin)
      blockMap.set(
        `${block.dia_semana}-${block.row_id ?? `${normalizedHoraInicio}-${normalizedHoraFin}-${block.kind ?? 'materia'}`}`,
        {
          ...block,
          hora_inicio: normalizedHoraInicio,
          hora_fin: normalizedHoraFin,
        }
      )
    }

    const rows = globalRows.map((row) => {
      const cells = {}

      for (const day of tableColumns) {
        const key = `${day.value}-${row.row_id}`
        const block = blockMap.get(key)

        if (block) {
          cells[String(day.value)] = block
        }
      }

      return {
        key: row.row_id,
        rowLabel: row.label,
        kind: row.kind,
        bloque_numero: row.bloque_numero,
        hora_inicio: row.hora_inicio,
        hora_fin: row.hora_fin,
        cells,
      }
    })

    console.log('[horario-visual] row_keys_generated', {
      rowKeys: rows.map((row) => row.key),
    })
    console.log('[horario-visual] unique_rows_generated', rows)

    return rows
  }, [globalRows, tableColumns, templateBlocks])

  useEffect(() => {
    console.log('[horario-visual] normalized_blocks', templateBlocks)
  }, [templateBlocks])

  useEffect(() => {
    console.log('[horario-visual] final_matrix', {
      visibleDays: tableColumns,
      tableRows,
      blocksByDay: tableColumns.map((day) => ({
        day: day.label,
        bloques: tableRows
          .map((row) => row.cells[day.value])
          .filter(Boolean)
          .map((block) => ({
            bloque_numero: block.bloque_numero,
            kind: block.kind,
            hora_inicio: block.hora_inicio,
            hora_fin: block.hora_fin,
            materia_nombre: block.materia_nombre,
          })),
      })),
    })
  }, [tableColumns, tableRows])

  const handleMateriaChange = (diaSemana, bloqueNumero, materiaNombre) => {
    setTemplateBlocks((current) =>
      current.map((block) =>
        String(block.dia_semana) === String(diaSemana) &&
        String(block.bloque_numero) === String(bloqueNumero)
          ? { ...block, materia_nombre: materiaNombre }
          : block
      )
    )
  }

  const handleSave = async () => {
    if (!selectedCursoId) {
      setError('Selecciona un curso antes de guardar el horario visual.')
      return
    }

    setSaving(true)
    setError('')

    const { error: saveError } = await saveHorarioMateriaTemplate(
      selectedCursoId,
      templateBlocks
    )

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    await loadTemplate(selectedCursoId)
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horario visual"
        description="Genera una plantilla semanal respetando recreo y almuerzo como franjas especiales no editables."
        actionNode={
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <select
              value={selectedCursoId}
              onChange={(event) => {
                const nextCursoId = event.target.value
                setSearchParams(nextCursoId ? { curso: nextCursoId } : {})
                setError('')
              }}
              className="input min-w-72"
              disabled={loadingCursos}
            >
              <option value="">Selecciona un curso</option>
              {cursos.map((curso) => (
                <option key={curso.id} value={curso.id}>
                  {curso.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                navigate(`/admin/horarios?curso=${selectedCursoId}&edit=true`)
              }
              disabled={!selectedCursoId}
              className="inline-flex items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Editar jornada
            </button>

            <button
              type="button"
              onClick={() => void loadTemplate(selectedCursoId)}
              disabled={!selectedCursoId || loadingTemplate}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Regenerar plantilla
            </button>

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!selectedCursoId || saving || loadingTemplate}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar horario visual'}
            </button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!selectedCursoId ? (
        <EmptyState
          title="Selecciona un curso"
          description="Selecciona un curso para generar automaticamente su plantilla semanal."
        />
      ) : loadingTemplate ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 shadow-sm">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          </div>
        </div>
      ) : !templateBlocks.length ? (
        <EmptyState
          title="No hay horario general configurado"
          description="Primero configura los dias largos y cortos del curso en el modulo Horarios para poder generar la plantilla visual."
        />
      ) : (
        <div className="space-y-6">
          {selectedCurso ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              Curso seleccionado:{' '}
              <span className="font-semibold text-slate-900">
                {selectedCurso.label}
              </span>
              <span className="ml-2 text-slate-400">|</span>
              <span className="ml-2">
                Duracion base por bloque: {BLOCK_DURATION_MINUTES} min
              </span>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-left text-sm text-white">
                    <th className="px-4 py-3 font-semibold">Bloque / Hora</th>
                    {tableColumns.map((day) => (
                      <th key={day.value} className="px-4 py-3 font-semibold">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {tableRows.map((row, index) => (
                    <tr
                      key={row.key}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                    >
                      <td className="min-w-48 border-t border-slate-200 px-4 py-4 align-top">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {row.rowLabel}
                          </p>
                          <p className="text-xs text-slate-500">
                            {row.hora_inicio} - {row.hora_fin}
                          </p>
                        </div>
                      </td>

                      {tableColumns.map((day) => {
                        const block = row.cells[day.value]

                        return (
                          <td
                            key={`${row.key}-${day.value}`}
                            className="min-w-44 border-l border-t border-slate-200 px-3 py-3 align-top"
                          >
                            {block ? (
                              block.kind === 'recreo' || block.kind === 'almuerzo' ? (
                                <div
                                  className={[
                                    'flex min-h-24 items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold',
                                    block.kind === 'recreo'
                                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                                      : 'border-rose-200 bg-rose-50 text-rose-700',
                                  ].join(' ')}
                                >
                                  {block.label}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <input
                                    value={block.materia_nombre ?? ''}
                                    onChange={(event) =>
                                      handleMateriaChange(
                                        block.dia_semana,
                                        block.bloque_numero,
                                        event.target.value
                                      )
                                    }
                                    placeholder="Materia"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                  />

                                  <div className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="text-slate-400">
                                      {getDiaSemanaLabel(day.value)}
                                    </span>
                                    <span
                                      className={[
                                        'inline-flex rounded-full px-2 py-1 font-medium',
                                        block.id
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'bg-slate-200 text-slate-600',
                                      ].join(' ')}
                                    >
                                      {block.id ? 'Guardado' : 'Plantilla'}
                                    </span>
                                  </div>
                                </div>
                              )
                            ) : (
                              <div className="min-h-24 rounded-xl border border-dashed border-slate-200 bg-slate-50/70" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
