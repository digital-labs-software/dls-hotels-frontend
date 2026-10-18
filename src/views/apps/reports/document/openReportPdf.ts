import type { CellValue, ReportDocument, ReportRow, ReportTable } from './reportDocument'
import { displayCell, formatDateTime, isNumericKind } from './reportDocument'

type Rgb = [number, number, number]

const MARGIN = 12

/** Helvetica del PDF no trae el signo menos tipográfico que usa el cierre. */
const pdfText = (value: string) => value.replaceAll('\u2212', '-').replaceAll('\u2013', '-').replaceAll('\u2014', '-')

const cellText = (table: ReportTable, value: CellValue, index: number) =>
  pdfText(displayCell(value, table.columns[index]?.kind ?? 'text'))

const rowCells = (table: ReportTable, row: Extract<ReportRow, { cells: CellValue[] }>) =>
  table.columns.map((column, index) => {
    const numeric = isNumericKind(column.kind)
    const grand = row.type === 'grand'
    const total = row.type === 'total'

    return {
      content: cellText(table, row.cells[index], index),
      styles: {
        halign: numeric ? ('right' as const) : ('left' as const),
        fontStyle: grand || total ? ('bold' as const) : ('normal' as const),
        fontSize: grand && numeric ? 11 : grand ? 10 : 8.5,
        fillColor: (total ? [242, 242, 242] : undefined) as Rgb | undefined
      }
    }
  })

const tableBody = (table: ReportTable) => {
  if (!table.rows.length) {
    return [
      [
        {
          content: pdfText(table.emptyText ?? 'Sin registros.'),
          colSpan: table.columns.length,
          styles: { halign: 'center' as const, textColor: 100 }
        }
      ]
    ]
  }

  return table.rows.map(row => {
    if (row.type === 'section') {
      const fill: Rgb = row.tone === 'error' ? [255, 214, 214] : row.tone === 'warning' ? [255, 233, 194] : [230, 230, 230]

      return [
        {
          content: pdfText(row.label),
          colSpan: table.columns.length,
          styles: { fontStyle: 'bold' as const, fillColor: fill }
        }
      ]
    }

    const cells = rowCells(table, row)

    if (row.type === 'row' && row.tone === 'error') {
      cells.forEach(cell => {
        cell.styles.fillColor = [255, 238, 238]
      })
    }

    if (row.type === 'row' && row.tone === 'warning') {
      cells.forEach(cell => {
        cell.styles.fillColor = [255, 246, 229]
      })
    }

    return cells
  })
}

/** Abre el reporte como PDF en una pestaña. El visor del navegador imprime y descarga. */
export const openReportPdf = async (report: ReportDocument) => {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({
    orientation: report.orientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  doc.setProperties({
    title: `${report.title} · ${report.period}`,
    subject: report.hotelName
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - MARGIN * 2

  const ensure = (y: number, height: number) => {
    if (y + height <= pageHeight - 14) {
      return y
    }

    doc.addPage()

    return MARGIN
  }

  let y = 16

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(17)
  doc.text(pdfText(report.hotelName.toUpperCase()), MARGIN, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(85)
  doc.text(`Impreso: ${formatDateTime(new Date().toISOString())}`, pageWidth - MARGIN, y, { align: 'right' })

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(17)
  doc.text(pdfText(report.title), MARGIN, y)

  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(pdfText(report.period), MARGIN, y)

  y += 3
  doc.setDrawColor(17)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)
  y += 6

  for (const item of report.summary ?? []) {
    y = ensure(y, 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(68)
    doc.text(pdfText(item.label), MARGIN, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17)
    doc.text(pdfText(item.value), pageWidth - MARGIN, y, { align: 'right' })
    y += 5.2
  }

  const drawTable = (table: ReportTable) => {
    y = ensure(y, 16)
    if (table.title) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(17)
      doc.text(pdfText(table.title.toUpperCase()), MARGIN, y)
      y += 2
    }

    const totalWidth = table.columns.reduce((sum, column) => sum + (column.width ?? 12), 0)

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: 14 },
      head: [table.columns.map(column => pdfText(column.header))],
      body: tableBody(table),
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        textColor: 17,
        lineColor: 51,
        lineWidth: 0.15,
        cellPadding: 1.4,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: 17,
        fontStyle: 'bold',
        fontSize: 8
      },
      columnStyles: Object.fromEntries(
        table.columns.map((column, index) => [
          index,
          {
            cellWidth: ((column.width ?? 12) / totalWidth) * contentWidth,
            halign: isNumericKind(column.kind) ? 'right' : 'left'
          }
        ])
      )
    })

    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY

    y = (finalY ?? y) + 6
  }

  const drawHighlight = () => {
    const highlight = report.highlight

    if (!highlight) {
      return
    }

    const short = highlight.tone === 'short'
    const color: Rgb = short ? [183, 28, 28] : [17, 17, 17]

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const detail = highlight.detail ? doc.splitTextToSize(pdfText(highlight.detail), contentWidth - 8) : []
    const boxHeight = 16 + detail.length * 3.6
    y = ensure(y, boxHeight + 2)

    doc.setDrawColor(...color)
    doc.setLineWidth(0.5)
    doc.roundedRect(MARGIN, y, contentWidth, boxHeight, 1.5, 1.5)

    doc.setTextColor(...color)
    doc.setFontSize(8)
    doc.text(pdfText(highlight.label.toUpperCase()), MARGIN + 4, y + 5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(pdfText(highlight.value), MARGIN + 4, y + 12)

    if (detail.length) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(51)
      doc.text(detail, MARGIN + 4, y + 17)
    }

    y += boxHeight + 6
  }

  if (report.tables.length) {
    drawTable(report.tables[0])
    drawHighlight()
    report.tables.slice(1).forEach(drawTable)
  } else {
    drawHighlight()
  }

  for (const note of report.notes ?? []) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const lines = doc.splitTextToSize(pdfText(note), contentWidth)
    y = ensure(y, lines.length * 3.6 + 2)
    doc.setTextColor(51)
    doc.text(lines, MARGIN, y)
    y += lines.length * 3.6 + 2
  }

  const signatures = report.signatures ?? []

  if (signatures.length) {
    y = ensure(y, 22)
    y += 12
    const slot = contentWidth / signatures.length

    signatures.forEach((label, index) => {
      const x = MARGIN + index * slot + 6
      const width = slot - 12

      doc.setDrawColor(17)
      doc.setLineWidth(0.3)
      doc.line(x, y, x + width, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(17)
      doc.text(pdfText(label), x + width / 2, y + 5, { align: 'center' })
    })
  }

  const pages = doc.getNumberOfPages()

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`${page} / ${pages}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
  }

  const file = new File([doc.output('blob')], `${report.fileName}.pdf`, { type: 'application/pdf' })
  const url = URL.createObjectURL(file)
  const tab = window.open(url, '_blank')

  if (!tab) {
    URL.revokeObjectURL(url)
    throw new Error('El navegador bloqueó la pestaña del cierre. Permite ventanas emergentes para ver el PDF.')
  }
}
