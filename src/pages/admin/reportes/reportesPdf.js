import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export function downloadAttendanceReportPdf(report) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const issuedAt = new Date()

  doc.setFillColor(240, 249, 255)
  doc.roundedRect(14, 12, 182, 28, 3, 3, 'F')
  doc.setFillColor(3, 105, 161)
  doc.circle(27, 26, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('E', 27, 28, { align: 'center' })

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(16)
  doc.text('Reporte de asistencia', 42, 24)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 65, 85)
  doc.text(`Fecha seleccionada: ${formatDate(report.date)}`, 42, 32)
  doc.text(`Emision: ${formatDateTime(issuedAt)}`, 196, 24, { align: 'right' })

  const metrics = report.metrics
  autoTable(doc, {
    startY: 48,
    head: [['Metrica', 'Valor']],
    body: [
      ['Total de estudiantes activos', metrics.totalActivos],
      ['Estudiantes con entrada registrada', metrics.conEntrada],
      ['Estudiantes sin entrada registrada', metrics.sinEntrada],
      ['Estudiantes con salida registrada', metrics.conSalida],
      ['Estudiantes dentro del colegio', metrics.dentro],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 23, 42] },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [
      [
        'Estudiante',
        'Curso',
        'Entrada',
        'Salida',
        'Estado entrada',
        'Estado actual',
        'Observacion',
      ],
    ],
    body: report.rows.map((row) => [
      row.estudiante,
      row.curso,
      formatTime(row.hora_entrada),
      formatTime(row.hora_salida),
      row.estado_entrada,
      row.estado_actual,
      row.observacion,
    ]),
    styles: { fontSize: 7, cellPadding: 1.8 },
    headStyles: { fillColor: [15, 23, 42] },
  })

  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(
    'Documento generado automaticamente por Edunova',
    doc.internal.pageSize.getWidth() / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  )

  doc.save(`reporte-asistencia-${report.date}.pdf`)
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-EC').format(date)
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function formatTime(value) {
  if (!value) return '-'
  const [hours = '00', minutes = '00'] = String(value).split(':')
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
}
