export const INVOICES_VIEW = 'invoices.view'
export const INVOICES_ISSUE = 'invoices.issue'
export const INVOICES_VOID = 'invoices.void'
export const INVOICES_SETTINGS = 'invoices.settings'

export const EINVOICE_DOCUMENT_TYPES = ['INVOICE', 'RECEIPT', 'CREDIT_NOTE', 'DEBIT_NOTE'] as const
export type EinvoiceDocumentType = (typeof EINVOICE_DOCUMENT_TYPES)[number]

export const EINVOICE_ISSUE_TYPES = ['INVOICE', 'RECEIPT'] as const
export type EinvoiceIssueType = (typeof EINVOICE_ISSUE_TYPES)[number]

export const EINVOICE_STATUSES = [
  'DRAFT',
  'QUEUED',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'ERROR',
  'VOID_REQUESTED',
  'VOIDED'
] as const
export type EinvoiceStatus = (typeof EINVOICE_STATUSES)[number]

export const EINVOICE_PAYMENT_CONDITIONS = ['CASH', 'CREDIT'] as const
export type EinvoicePaymentCondition = (typeof EINVOICE_PAYMENT_CONDITIONS)[number]

export const EINVOICE_TAX_AFFECTATIONS = ['TAXED', 'EXONERATED', 'UNAFFECTED', 'EXPORT'] as const
export type EinvoiceTaxAffectation = (typeof EINVOICE_TAX_AFFECTATIONS)[number]

export type EinvoiceActionKey =
  | 'issue'
  | 'edit'
  | 'delete'
  | 'void'
  | 'retry'
  | 'note'
  | 'applyPayments'
  | 'downloadPdf'
  | 'downloadXml'
  | 'downloadCdr'

export type EinvoiceCustomer = {
  documentType?: string | null
  documentNumber?: string | null
  name?: string | null
  businessName?: string | null
  address?: string | null
  email?: string | null
}

export type EinvoiceItem = {
  uuid?: string
  reservationRoomUuid?: string | null
  description: string
  quantity: number
  unitPrice: number
  discount?: number | null
  taxAffectation?: EinvoiceTaxAffectation | string | null
  unitCode?: string | null
  igv?: number | null
  subtotal?: number | null
  total?: number | null
}

export type EinvoicePaymentLink = {
  paymentUuid: string
  amount: number
  method?: string | null
  paidAt?: string | null
}

export type EinvoiceNote = {
  uuid: string
  documentType: EinvoiceDocumentType | string
  series?: string | null
  number?: number | null
  status?: EinvoiceStatus | string
  reason?: string | null
  noteCode?: string | null
}

export type Einvoice = {
  uuid: string
  documentType: EinvoiceDocumentType | string
  status: EinvoiceStatus | string
  series?: string | null
  number?: number | null
  fullNumber?: string | null
  issueDate?: string | null
  dueDate?: string | null
  currency?: string | null
  exchangeRate?: number | null
  paymentCondition?: EinvoicePaymentCondition | string | null
  observations?: string | null
  reservationUuid?: string | null
  companyUuid?: string | null
  guestUuid?: string | null
  customerName?: string | null
  customerDocument?: string | null
  customer?: EinvoiceCustomer | null
  subtotal?: number | null
  igv?: number | null
  total?: number | null
  items?: EinvoiceItem[]
  payments?: EinvoicePaymentLink[]
  notes?: EinvoiceNote[]
  sunatResponse?: string | null
  sunatMessage?: string | null
  pdfUrl?: string | null
  xmlUrl?: string | null
  cdrUrl?: string | null
  actions?: Record<string, boolean> | string[] | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type EinvoiceListQuery = {
  page?: number
  limit?: number
  documentType?: string
  status?: string
  from?: string
  to?: string
  search?: string
  companyUuid?: string
  guestUuid?: string
  reservationUuid?: string
}

export type CreateEinvoiceInput = {
  documentType: EinvoiceIssueType
  reservationUuid?: string | null
  companyUuid?: string | null
  guestUuid?: string | null
  customer?: EinvoiceCustomer | null
  paymentCondition?: EinvoicePaymentCondition
  currency?: string
  exchangeRate?: number | null
  dueDate?: string | null
  issueDate?: string | null
  observations?: string | null
  items: EinvoiceItem[]
  payments?: Array<{ paymentUuid: string; amount: number }>
  draft?: boolean
}

export type UpdateEinvoiceDraftInput = {
  documentType?: EinvoiceIssueType
  companyUuid?: string | null
  guestUuid?: string | null
  customer?: EinvoiceCustomer | null
  paymentCondition?: EinvoicePaymentCondition
  currency?: string
  exchangeRate?: number | null
  dueDate?: string | null
  issueDate?: string | null
  observations?: string | null
  items?: EinvoiceItem[]
  payments?: Array<{ paymentUuid: string; amount: number }>
}

export type CreateEinvoiceNoteInput = {
  documentType: 'CREDIT_NOTE' | 'DEBIT_NOTE'
  noteCode: string
  reason: string
  items?: EinvoiceItem[]
}

export type EinvoiceSettings = {
  enabled: boolean
  igvRate: number
  pricesIncludeIgv: boolean
  sendToCustomer: boolean
  apiUrl?: string | null
  hasToken: boolean
  provider?: string | null
  queueMode?: string | null
  warnings: string[]
  issuer?: {
    ruc?: string | null
    businessName?: string | null
    tradeName?: string | null
    address?: string | null
    ubigeo?: string | null
    email?: string | null
  } | null
}

export type UpdateEinvoiceSettingsInput = {
  enabled?: boolean
  igvRate?: number
  pricesIncludeIgv?: boolean
  sendToCustomer?: boolean
  apiUrl?: string | null
  apiToken?: string | null
}

export type EinvoiceCatalogOption = {
  code: string
  name: string
}

export type EinvoiceCatalogs = {
  documentTypes: EinvoiceCatalogOption[]
  statuses: EinvoiceCatalogOption[]
  creditNoteReasons: EinvoiceCatalogOption[]
  debitNoteReasons: EinvoiceCatalogOption[]
  identityDocumentTypes: EinvoiceCatalogOption[]
  receiptWithoutDocumentLimit: number
}

export type InvoiceSeries = {
  uuid: string
  documentType: string
  series: string
  nextNumber: number
  isDefault: boolean
  isActive: boolean
  used?: boolean
}

export type CreateInvoiceSeriesInput = {
  documentType: string
  series: string
  nextNumber?: number
  isDefault?: boolean
}

export type UpdateInvoiceSeriesInput = {
  isDefault?: boolean
  isActive?: boolean
  nextNumber?: number
}

export type ReservationBillingCustomer = {
  uuid: string
  name: string
  documentType?: string | null
  documentNumber?: string | null
  email?: string | null
  address?: string | null
  kind: 'company' | 'guest'
}

export type ReservationBillingRoom = {
  reservationRoomUuid: string
  roomNumber?: string | null
  description: string
  quantity: number
  unitPrice: number
  billed: number
  pending: number
}

export type ReservationBillingPayment = {
  paymentUuid: string
  amount: number
  available: number
  method?: string | null
  paidAt?: string | null
}

export type ReservationBilling = {
  reservationUuid: string
  reservationCode?: string | null
  customers: ReservationBillingCustomer[]
  rooms: ReservationBillingRoom[]
  payments: ReservationBillingPayment[]
  invoices: Einvoice[]
}

export type EinvoiceSubmission = {
  uuid?: string
  status?: string | null
  provider?: string | null
  message?: string | null
  createdAt?: string | null
}
