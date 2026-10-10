/**
 * Un reporte se describe una sola vez como ReportDocument y de ahí salen la tabla en pantalla,
 * el PDF (impresión A4) y el Excel, así las columnas siempre coinciden.
 */

export type CellValue = string | number | boolean | null | undefined

/** check = casilla para marcar con lapicero; write = espacio en blanco para escribir a mano. */
export type ColumnKind = 'text' | 'number' | 'money' | 'percent' | 'check' | 'write'

export type RowTone = 'warning' | 'error' | 'success' | 'muted'

export interface ReportColumn {
  header: string
  kind?: ColumnKind

  /** Ancho en caracteres para Excel; en papel se usa como proporción. */
  width?: number
}

export type ReportRow =
  | { type: 'row'; cells: CellValue[]; tone?: RowTone }
  | { type: 'section'; label: string; tone?: RowTone }
  | { type: 'total'; cells: CellValue[] }

export interface ReportTable {
  title?: string
  columns: ReportColumn[]
  rows: ReportRow[]
  emptyText?: string
}

export interface ReportSummaryItem {
  label: string
  value: string
}

export interface ReportDocument {
  fileName: string
  title: string
  hotelName: string

  /** Fecha o periodo del reporte, ya en palabras. */
  period: string
  orientation?: 'portrait' | 'landscape'
  summary?: ReportSummaryItem[]
  tables: ReportTable[]
  notes?: string[]

  /** Líneas de firma al pie del papel (por ejemplo: Recepcionista, Administrador). */
  signatures?: string[]

  /** Agrega "Turno" y "Responsable" para llenar a mano. */
  showShift?: boolean
}

export const row = (cells: CellValue[], tone?: RowTone): ReportRow => ({ type: 'row', cells, tone })

export const section = (label: string, tone?: RowTone): ReportRow => ({ type: 'section', label, tone })

export const total = (cells: CellValue[]): ReportRow => ({ type: 'total', cells })

const moneyFormatter = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatMoney = (value: number | null | undefined, currency = 'PEN') => {
  const amount = Number(value ?? 0)
  const symbol = currency === 'USD' ? 'US$' : 'S/'

  return `${amount < 0 ? '-' : ''}${symbol} ${moneyFormatter.format(Math.abs(amount))}`
}

export const formatPercent = (value: number | null | undefined) => `${moneyFormatter.format(Number(value ?? 0))} %`

export const formatShortDate = (iso?: string | null) => {
  if (!iso) {
    return ''
  }

  const [year, month, day] = iso.slice(0, 10).split('-')

  return year && month && day ? `${day}/${month}/${year}` : iso
}

const asLocalDate = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`)

export const formatLongDate = (iso: string) => {
  const date = asLocalDate(iso)

  if (Number.isNaN(date.getTime())) {
    return iso
  }

  const text = date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const formatMonth = (month: string) => {
  const date = asLocalDate(`${month}-01`)

  if (Number.isNaN(date.getTime())) {
    return month
  }

  const text = date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const formatRange = (from: string, to: string) =>
  from === to ? formatLongDate(from) : `Del ${formatShortDate(from)} al ${formatShortDate(to)}`

export const formatTime = (isoDateTime?: string | null) => {
  if (!isoDateTime) {
    return ''
  }

  const date = new Date(isoDateTime)

  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })
}

export const formatDateTime = (isoDateTime?: string | null) => {
  if (!isoDateTime) {
    return ''
  }

  const date = new Date(isoDateTime)

  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
}

/** Texto que se ve en pantalla y en el PDF para una celda. */
export const displayCell = (value: CellValue, kind: ColumnKind = 'text') => {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  if (kind === 'money' && typeof value === 'number') {
    return formatMoney(value)
  }

  if (kind === 'percent' && typeof value === 'number') {
    return formatPercent(value)
  }

  if (typeof value === 'boolean') {
    return value ? '✓' : ''
  }

  return String(value)
}

export const isNumericKind = (kind?: ColumnKind) => kind === 'number' || kind === 'money' || kind === 'percent'
