import type { CellValue, ReportColumn, ReportDocument, ReportTable } from './reportDocument'
import { displayCell, formatDateTime, isNumericKind } from './reportDocument'

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const text = (value: string) => escapeHtml(value).replace(/\n/g, '<br/>')

const cellHtml = (column: ReportColumn, value: CellValue) => {
  const kind = column.kind ?? 'text'

  if (kind === 'check') {
    return `<td class="check"><span class="box">${value === true ? '✓' : ''}</span></td>`
  }

  const content = text(displayCell(value, kind))

  if (kind === 'write') {
    return `<td class="write">${content}</td>`
  }

  return `<td class="${isNumericKind(kind) ? 'num' : ''}">${content}</td>`
}

const tableHtml = (table: ReportTable) => {
  const totalWidth = table.columns.reduce((sum, column) => sum + (column.width ?? 12), 0)

  const colgroup = table.columns
    .map(column => `<col style="width:${(((column.width ?? 12) / totalWidth) * 100).toFixed(2)}%"/>`)
    .join('')

  const head = table.columns
    .map(column => `<th class="${isNumericKind(column.kind) ? 'num' : ''}">${escapeHtml(column.header)}</th>`)
    .join('')

  const body = table.rows.length
    ? table.rows
        .map(item => {
          if (item.type === 'section') {
            return `<tr class="section ${item.tone ?? ''}"><td colspan="${table.columns.length}">${text(item.label)}</td></tr>`
          }

          const cells = table.columns.map((column, index) => cellHtml(column, item.cells[index])).join('')

          return `<tr class="${item.type === 'total' ? 'total' : (item.tone ?? '')}">${cells}</tr>`
        })
        .join('')
    : `<tr><td colspan="${table.columns.length}" class="empty">${escapeHtml(table.emptyText ?? 'Sin registros.')}</td></tr>`

  return `${table.title ? `<h2>${escapeHtml(table.title)}</h2>` : ''}
<table><colgroup>${colgroup}</colgroup><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

export const buildReportHtml = (report: ReportDocument) => {
  const landscape = report.orientation !== 'portrait'

  const summary = report.summary?.length
    ? `<div class="summary">${report.summary
        .map(item => `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`)
        .join('')}</div>`
    : ''

  const shift = report.showShift
    ? '<div class="shift"><span>Turno: ________________</span><span>Responsable: ______________________________</span></div>'
    : ''

  const notes = report.notes?.length
    ? `<ul class="notes">${report.notes.map(note => `<li>${text(note)}</li>`).join('')}</ul>`
    : ''

  const signatures = report.signatures?.length
    ? `<div class="signatures">${report.signatures
        .map(label => `<div><span class="line"></span>${escapeHtml(label)}</div>`)
        .join('')}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)} · ${escapeHtml(report.period)}</title>
  <style>
    @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 11px; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
    header h1 { font-size: 18px; margin: 0; text-transform: uppercase; }
    header .title { font-size: 15px; font-weight: bold; margin-top: 2px; }
    header .period { font-size: 12px; margin-top: 2px; }
    header .printed { font-size: 9px; color: #555; text-align: right; }
    .shift { display: flex; gap: 24px; font-size: 11px; margin: 6px 0 8px; }
    .summary { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .summary div { border: 1px solid #999; border-radius: 4px; padding: 3px 8px; display: flex; gap: 6px; align-items: baseline; }
    .summary span { color: #444; }
    .summary strong { font-size: 12px; }
    h2 { font-size: 12px; margin: 10px 0 4px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 6px; }
    th, td { border: 1px solid #333; padding: 4px 5px; vertical-align: middle; word-wrap: break-word; }
    th { background: #222; color: #fff; font-size: 10px; text-align: left; }
    td { font-size: 10.5px; height: 24px; }
    .num { text-align: right; white-space: nowrap; }
    td.check { text-align: center; }
    .box { display: inline-block; width: 16px; height: 16px; border: 1.6px solid #111; border-radius: 2px; line-height: 14px; font-size: 13px; font-weight: bold; text-align: center; }
    td.write { color: #111; }
    tr.section td { background: #e6e6e6; font-weight: bold; font-size: 11px; }
    tr.section.warning td { background: #ffe9c2; }
    tr.section.error td { background: #ffd6d6; }
    tr.total td { font-weight: bold; background: #f2f2f2; }
    tr.warning td { background: #fff6e5; }
    tr.error td { background: #ffeeee; }
    tr.muted td { color: #666; }
    td.empty { text-align: center; color: #666; padding: 12px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    .notes { font-size: 9.5px; color: #333; margin: 8px 0 0; padding-left: 16px; }
    .signatures { display: flex; justify-content: space-around; gap: 24px; margin-top: 40px; page-break-inside: avoid; }
    .signatures div { flex: 1; max-width: 240px; text-align: center; font-size: 11px; }
    .signatures .line { display: block; border-top: 1px solid #111; margin-bottom: 4px; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${escapeHtml(report.hotelName)}</h1>
      <div class="title">${escapeHtml(report.title)}</div>
      <div class="period">${escapeHtml(report.period)}</div>
    </div>
    <div class="printed">Impreso: ${escapeHtml(formatDateTime(new Date().toISOString()))}</div>
  </header>
  ${shift}
  ${summary}
  ${report.tables.map(tableHtml).join('')}
  ${notes}
  ${signatures}
  <script>window.onload = function () { window.focus(); window.print(); }</script>
</body>
</html>`
}

export const printReport = (report: ReportDocument) => {
  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    throw new Error('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para imprimir o guardar el PDF.')
  }

  printWindow.document.open()
  printWindow.document.write(buildReportHtml(report))
  printWindow.document.close()
}
