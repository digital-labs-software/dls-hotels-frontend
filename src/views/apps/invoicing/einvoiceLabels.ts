import type { ThemeColor } from '@core/types'
import type { Einvoice, EinvoiceActionKey, EinvoiceDocumentType, EinvoiceStatus } from '@/types/apps/einvoiceTypes'
import { EINVOICE_DOCUMENT_TYPES, EINVOICE_STATUSES } from '@/types/apps/einvoiceTypes'

export const EINVOICE_DOCUMENT_LABELS: Record<string, string> = {
  INVOICE: 'Factura',
  RECEIPT: 'Boleta',
  CREDIT_NOTE: 'Nota de crédito',
  DEBIT_NOTE: 'Nota de débito'
}

export const SERIES_PURPOSE_OPTIONS = [
  { id: 'RECEIPT', documentType: 'RECEIPT', label: 'Boleta', hint: 'Ejemplo: B001' },
  { id: 'INVOICE', documentType: 'INVOICE', label: 'Factura', hint: 'Ejemplo: F001' },
  { id: 'CREDIT_NOTE_RECEIPT', documentType: 'CREDIT_NOTE', label: 'Nota de crédito de boleta', hint: 'Ejemplo: BC01' },
  { id: 'CREDIT_NOTE_INVOICE', documentType: 'CREDIT_NOTE', label: 'Nota de crédito de factura', hint: 'Ejemplo: FC01' },
  { id: 'DEBIT_NOTE_RECEIPT', documentType: 'DEBIT_NOTE', label: 'Nota de débito de boleta', hint: 'Ejemplo: BD01' },
  { id: 'DEBIT_NOTE_INVOICE', documentType: 'DEBIT_NOTE', label: 'Nota de débito de factura', hint: 'Ejemplo: FD01' }
] as const

export const seriesPurposeLabel = (series?: string | null, documentType?: string | null) => {
  const code = (series || '').toUpperCase()
  const type = (documentType || '').toUpperCase()

  if (type === 'RECEIPT') {
    return 'Boleta'
  }

  if (type === 'INVOICE') {
    return 'Factura'
  }

  if (type === 'CREDIT_NOTE') {
    if (code.startsWith('BC') || code.startsWith('BB')) {
      return 'Nota de crédito de boleta'
    }

    if (code.startsWith('FC') || code.startsWith('FF')) {
      return 'Nota de crédito de factura'
    }

    return 'Nota de crédito'
  }

  if (type === 'DEBIT_NOTE') {
    if (code.startsWith('BD')) {
      return 'Nota de débito de boleta'
    }

    if (code.startsWith('FD')) {
      return 'Nota de débito de factura'
    }

    return 'Nota de débito'
  }

  return documentTypeLabel(type)
}

export const EINVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  QUEUED: 'En cola',
  SENT: 'Enviado',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
  ERROR: 'Error',
  VOID_REQUESTED: 'Anulación enviada',
  VOIDED: 'Anulado'
}

export const EINVOICE_STATUS_COLORS: Record<string, ThemeColor> = {
  DRAFT: 'secondary',
  QUEUED: 'warning',
  SENT: 'info',
  ACCEPTED: 'success',
  REJECTED: 'error',
  ERROR: 'error',
  VOID_REQUESTED: 'warning',
  VOIDED: 'secondary'
}

export const EINVOICE_PAYMENT_CONDITION_LABELS: Record<string, string> = {
  CASH: 'Contado',
  CREDIT: 'Crédito'
}

export const isPendingSunat = (status?: string | null) => status === 'QUEUED' || status === 'SENT'

export const formatEinvoiceMoney = (value?: number | null, currency = 'PEN') => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }

  const amount = Number(value).toFixed(2)

  return currency === 'USD' ? `$ ${amount}` : `S/ ${amount}`
}

export const formatEinvoiceNumber = (invoice: Pick<Einvoice, 'fullNumber' | 'series' | 'number' | 'status'>) => {
  if (invoice.fullNumber) {
    return invoice.fullNumber
  }

  if (invoice.series && invoice.number) {
    return `${invoice.series}-${String(invoice.number).padStart(8, '0')}`
  }

  if (invoice.status === 'DRAFT') {
    return 'Borrador'
  }

  return invoice.series || 'Sin número'
}

export const formatEinvoiceDate = (value?: string | null) => {
  if (!value) {
    return '—'
  }

  const date = value.slice(0, 10)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return value
  }

  const [year, month, day] = date.split('-')

  return `${day}/${month}/${year}`
}

export const documentTypeLabel = (value?: string | null) => EINVOICE_DOCUMENT_LABELS[value || ''] || value || 'Comprobante'

export const statusLabel = (value?: string | null) => EINVOICE_STATUS_LABELS[value || ''] || value || '—'

const ACTION_ALIASES: Record<EinvoiceActionKey, string[]> = {
  issue: ['issue', 'canIssue', 'emit'],
  edit: ['edit', 'canEdit'],
  delete: ['delete', 'canDelete', 'remove'],
  void: ['void', 'canVoid', 'annul'],
  retry: ['retry', 'canRetry'],
  note: ['note', 'canNote', 'creditNote', 'debitNote'],
  applyPayments: ['applyPayments', 'canApplyPayments', 'payments'],
  downloadPdf: ['downloadPdf', 'pdf', 'canDownloadPdf'],
  downloadXml: ['downloadXml', 'xml', 'canDownloadXml'],
  downloadCdr: ['downloadCdr', 'cdr', 'canDownloadCdr']
}

export const hasInvoiceAction = (invoice: Einvoice, action: EinvoiceActionKey) => {
  const actions = invoice.actions

  if (Array.isArray(actions)) {
    const aliases = ACTION_ALIASES[action].map(item => item.toLowerCase())

    return actions.some(item => aliases.includes(String(item).toLowerCase()))
  }

  if (actions && typeof actions === 'object') {
    return ACTION_ALIASES[action].some(key => Boolean((actions as Record<string, boolean>)[key]))
  }

  const status = String(invoice.status)

  if (action === 'issue' || action === 'edit' || action === 'delete') {
    return status === 'DRAFT'
  }

  if (action === 'retry') {
    return status === 'ERROR' || status === 'SENT'
  }

  if (action === 'void' || action === 'note') {
    return status === 'ACCEPTED'
  }

  if (action === 'applyPayments') {
    return status === 'ACCEPTED' || status === 'SENT' || status === 'QUEUED'
  }

  return Boolean(invoice[action === 'downloadPdf' ? 'pdfUrl' : action === 'downloadXml' ? 'xmlUrl' : 'cdrUrl'])
}

export const knownDocumentTypes = () => EINVOICE_DOCUMENT_TYPES
export const knownStatuses = () => EINVOICE_STATUSES

export const isEinvoiceDocumentType = (value: string): value is EinvoiceDocumentType =>
  EINVOICE_DOCUMENT_TYPES.includes(value as EinvoiceDocumentType)

export const isEinvoiceStatus = (value: string): value is EinvoiceStatus =>
  EINVOICE_STATUSES.includes(value as EinvoiceStatus)
