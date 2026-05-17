import { jsPDF } from 'jspdf'
import { IDENTIFICATION_TYPE_LABELS } from '../../../utils/identification'

const COLORS = {
  slate900: [15, 23, 42],
  slate700: [51, 65, 85],
  slate500: [100, 116, 139],
  slate200: [226, 232, 240],
  sky700: [3, 105, 161],
  sky50: [240, 249, 255],
  emerald50: [236, 253, 245],
  emerald700: [4, 120, 87],
}

export function downloadMatriculaReceipt(data) {
  const doc = buildMatriculaReceipt(data)
  doc.save(buildReceiptFilename(data))
}

export function printMatriculaReceipt(data) {
  const doc = buildMatriculaReceipt(data)
  const url = doc.output('bloburl')
  const printWindow = window.open(url, '_blank')

  if (!printWindow) return

  printWindow.addEventListener('load', () => {
    printWindow.focus()
    printWindow.print()
  })
}

function buildMatriculaReceipt(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const page = {
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight(),
    margin: 18,
  }

  drawHeader(doc, page, data)

  let y = 54
  y = drawSection(doc, page, y, 'Datos del representante', [
    ['Nombres', data.representante.nombres],
    ['Apellidos', data.representante.apellidos],
    [
      'Tipo de identificacion',
      IDENTIFICATION_TYPE_LABELS[data.representante.tipo_identificacion],
    ],
    ['Identificacion', data.representante.cedula],
    ['Telefono', data.representante.telefono],
    ['Correo', data.representante.email],
    ['Direccion', data.representante.direccion],
  ])

  y = drawSection(doc, page, y + 4, 'Datos del estudiante', [
    ['Nombres', data.estudiante.nombres],
    ['Apellidos', data.estudiante.apellidos],
    [
      'Tipo de identificacion',
      IDENTIFICATION_TYPE_LABELS[data.estudiante.tipo_identificacion],
    ],
    ['Identificacion', data.estudiante.cedula],
    ['Fecha de nacimiento', formatDate(data.estudiante.fecha_nacimiento)],
    ['Genero', formatText(data.estudiante.genero)],
    ['Direccion', data.estudiante.direccion],
  ])

  y = drawSection(doc, page, y + 4, 'Datos academicos', [
    ['Tipo de proceso', data.mode === 'rematricula' ? 'Re-matricula' : 'Nuevo ingreso'],
    ['Curso asignado', formatCurso(data.selectedCurso)],
    ['Periodo escolar', data.activePeriodo?.nombre],
    ['Fecha de matricula', formatDateTime(data.enrolledAt)],
  ])

  y = drawSection(doc, page, y + 4, 'Estado operativo', [
    ['NFC', data.estadoOperativo?.nfc_asignada ? 'Asignada' : 'Pendiente'],
    ['Rostro', data.estadoOperativo?.rostro_registrado ? 'Registrado' : 'Pendiente'],
    [
      'Asistencia',
      data.estadoOperativo?.listo_asistencia
        ? 'Listo para asistencia'
        : 'Pendiente de configuracion',
    ],
    [
      'Aviso',
      'La asignacion de NFC y rostro se realiza desde la app movil administrativa.',
    ],
  ])

  y = ensureSpaceForClosingBlocks(doc, page, y + 4)
  y = drawAccessSection(doc, page, y, data)
  drawSignatureSection(doc, page, y + 12)

  drawGeneratedFooter(doc, page)

  return doc
}

function drawHeader(doc, page, data) {
  doc.setFillColor(...COLORS.sky50)
  doc.roundedRect(page.margin, 14, page.width - page.margin * 2, 30, 3, 3, 'F')

  doc.setFillColor(...COLORS.sky700)
  doc.circle(page.margin + 13, 29, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('E', page.margin + 13, 31, { align: 'center' })

  doc.setTextColor(...COLORS.slate900)
  doc.setFontSize(11)
  doc.text('Edunova', page.margin + 25, 24)
  doc.setFontSize(18)
  doc.text('Comprobante de matricula', page.margin + 25, 33)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.slate700)
  doc.text(
    `Fecha de emision: ${formatDateTime(data.issuedAt)}`,
    page.width - page.margin,
    25,
    { align: 'right' }
  )
}

function drawSection(doc, page, y, title, rows) {
  const cleanRows = rows.filter(([, value]) => hasValue(value))
  const rowHeight = 7
  const headerHeight = 10
  const height = headerHeight + cleanRows.length * rowHeight + 6

  doc.setDrawColor(...COLORS.slate200)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(page.margin, y, page.width - page.margin * 2, height, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.slate900)
  doc.text(title, page.margin + 5, y + 7)

  doc.setFontSize(9)
  let rowY = y + headerHeight + 4
  const labelX = page.margin + 5
  const valueX = page.margin + 58

  for (const [label, value] of cleanRows) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.slate500)
    doc.text(`${label}:`, labelX, rowY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.slate700)
    doc.text(String(value), valueX, rowY, {
      maxWidth: page.width - valueX - page.margin - 4,
    })
    rowY += rowHeight
  }

  return y + height
}

function drawAccessSection(doc, page, y, data) {
  const height = 44
  const contentX = page.margin + 5
  const contentWidth = page.width - page.margin * 2 - 10
  const hasTemporaryPassword = Boolean(data.credentials?.temporaryPassword)
  const accessEmail = data.credentials?.email || data.estudiante?.correo_institucional || data.accessEmail || '-'
  const securityText = hasTemporaryPassword
    ? 'Por seguridad, esta contrasena es temporal y debe ser cambiada al primer ingreso.'
    : 'En re-matricula se conserva la cuenta existente. Si olvida su contrasena, debe solicitar restablecimiento.'

  doc.setDrawColor(167, 243, 208)
  doc.setFillColor(...COLORS.emerald50)
  doc.roundedRect(page.margin, y, page.width - page.margin * 2, height, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.slate900)
  doc.text('Acceso institucional', contentX, y + 8)

  doc.setFontSize(9)
  doc.setTextColor(...COLORS.slate700)
  doc.text('Correo institucional:', contentX, y + 18)
  doc.text(accessEmail, contentX + 43, y + 18, {
    maxWidth: contentWidth - 43,
  })

  doc.text(hasTemporaryPassword ? 'Contrasena temporal:' : 'Contrasena:', contentX, y + 26)
  doc.text(
    hasTemporaryPassword ? data.credentials.temporaryPassword : 'No se genera una nueva en re-matricula',
    contentX + 43,
    y + 26,
    { maxWidth: contentWidth - 43 }
  )

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.emerald700)
  doc.text(securityText, contentX, y + 36, { maxWidth: contentWidth })

  return y + height
}

function drawSignatureSection(doc, page, y) {
  const lineWidth = 62
  const leftX = page.margin + 8
  const rightX = page.width - page.margin - lineWidth - 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.slate900)
  doc.text('Firmas', page.margin, y)

  const lineY = y + 18
  doc.setDrawColor(...COLORS.slate500)
  doc.line(leftX, lineY, leftX + lineWidth, lineY)
  doc.line(rightX, lineY, rightX + lineWidth, lineY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.slate700)
  doc.text('Firma del representante', leftX + lineWidth / 2, lineY + 6, {
    align: 'center',
  })
  doc.text(
    'Firma de secretaria o administracion',
    rightX + lineWidth / 2,
    lineY + 6,
    { align: 'center' }
  )

  return lineY + 12
}

function drawGeneratedFooter(doc, page) {
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.slate500)
  doc.text(
    'Documento generado automaticamente por Edunova',
    page.width / 2,
    page.height - 14,
    { align: 'center' }
  )
}

function ensureSpaceForClosingBlocks(doc, page, y) {
  const closingBlocksHeight = 44 + 12 + 30 + 18
  const bottomLimit = page.height - page.margin

  if (y + closingBlocksHeight <= bottomLimit) {
    return y
  }

  doc.addPage()
  return page.margin
}

function buildReceiptFilename(data) {
  const name = [data.estudiante?.apellidos, data.estudiante?.nombres]
    .filter(Boolean)
    .join('-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toLowerCase()

  return `comprobante-matricula-${name || 'estudiante'}.pdf`
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function formatCurso(curso) {
  if (!curso) return 'Sin asignar'

  return (
    curso.nombre ||
    [curso.nivel, curso.paralelo, curso.especialidad].filter(Boolean).join(' ')
  )
}

function formatText(value) {
  if (!value) return ''
  return String(value).charAt(0).toUpperCase() + String(value).slice(1)
}

function formatDate(value) {
  if (!value) return ''

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date()

  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
