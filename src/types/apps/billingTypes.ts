import { formatRoomPrice } from '@/types/apps/roomsTypes'

export const SUBSCRIPTION_SUSPENDED_CODE = 'SUBSCRIPTION_SUSPENDED'
export const SUBSCRIPTION_SUSPENDED_EVENT = 'dls:subscription-suspended'

export const SUBSCRIPTION_VIEW = 'subscription.view'
export const SUBSCRIPTION_PAY = 'subscription.pay'

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED'

export type BillingCycle = 'MONTHLY' | 'YEARLY' | 'ANNUAL' | 'QUARTERLY' | string

export type BillingPaymentStatus = 'PENDING' | 'OVERDUE' | 'PAID' | 'VOID'

export type VoucherStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type VoucherMethod = 'TRANSFER' | 'YAPE' | 'PLIN' | 'CASH' | 'OTHER'

export type OnlineChargeStatus = 'SUCCEEDED' | 'FAILED' | 'REQUIRES_3DS'

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: 'En prueba',
  ACTIVE: 'Al día',
  PAST_DUE: 'Con deuda vencida',
  SUSPENDED: 'Suspendido',
  CANCELLED: 'Dada de baja',
  EXPIRED: 'Vencida'
}

export const PAYMENT_STATUS_LABELS: Record<BillingPaymentStatus, string> = {
  PENDING: 'Por pagar',
  OVERDUE: 'Vencido',
  PAID: 'Pagado',
  VOID: 'Anulado o bonificado'
}

export const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {
  PENDING: 'En revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado'
}

export const VOUCHER_METHOD_LABELS: Record<VoucherMethod, string> = {
  TRANSFER: 'Transferencia o depósito',
  YAPE: 'Yape',
  PLIN: 'Plin',
  CASH: 'Efectivo',
  OTHER: 'Otro'
}

export const BILLING_CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
  ANNUAL: 'Anual',
  QUARTERLY: 'Trimestral'
}

export const DEFAULT_VOUCHER_METHODS: VoucherMethod[] = ['TRANSFER', 'YAPE', 'PLIN', 'CASH', 'OTHER']

export const PAYMENT_PROOF_LABEL = 'Constancia de pago'

export const PAYMENT_PROOF_HELP =
  'Se refiere al voucher o recibo del pago: captura de Yape, Plin o constancia del banco. No es una boleta ni una factura.'

export type BillingAccount = {
  uuid: string
  documentType: string | null
  documentNumber: string | null
  businessName: string | null
}

export type BillingPlanFeature = {
  name: string
  description: string | null
  value: string | number | boolean | null
}

export type BillingPlan = {
  code: string
  name: string
  description?: string | null
  maxProperties?: number | null
  maxRooms?: number | null
  maxUsers?: number | null
  features?: BillingPlanFeature[]
}

export type HotelSubscription = {
  uuid: string
  status: SubscriptionStatus
  plan: BillingPlan | null
  billingCycle: BillingCycle
  price: number
  discountAmount: number
  netPrice: number
  currency: string
  startDate: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  autoRenew: boolean
  suspendedAt: string | null
  suspensionReason: string | null
  cancelledAt: string | null
}

export type BillingBalance = {
  outstanding: { count: number; total: number }
  overdue: { count: number; total: number }
  nextPayment: BillingPaymentSummary | null
  pendingVouchers: number
}

export type OnlinePaymentOptions = {
  enabled: boolean
  provider: string | null
  publicKey: string | null
}

export type PaymentOptions = {
  instructions: string | null
  voucherMethods: VoucherMethod[]
  onlinePayment: OnlinePaymentOptions
}

export type BillingSubscriptionResponse = {
  account: BillingAccount | null
  subscription: HotelSubscription | null
  balance: BillingBalance | null
  paymentOptions: PaymentOptions | null
  today: string
}

export type BillingVoucher = {
  uuid: string
  status: VoucherStatus
  method: VoucherMethod | null
  amount: number
  operationDate: string | null
  reference: string | null
  fileUrl: string
  notes: string | null
  reviewNotes: string | null
  reviewedAt: string | null
  createdAt: string | null
}

export type BillingPaymentSummary = {
  uuid: string
  plan?: { code: string; name: string } | null
  billingCycle?: BillingCycle | null
  periodStart: string | null
  periodEnd: string | null
  dueDate: string | null
  amount: number
  discountAmount: number
  total: number
  currency: string
  status: BillingPaymentStatus
  paidAt: string | null
  method: string | null
  reference: string | null
  canPay: boolean
  latestVoucher: BillingVoucher | null
}

export type BillingPaymentDetail = BillingPaymentSummary & {
  vouchers: BillingVoucher[]
}

export type CreateBillingVoucherDto = {
  method: VoucherMethod
  amount: number
  operationDate: string
  reference?: string | null
  fileUrl: string
  notes?: string | null
}

export type VoucherUploadSignature = {
  cloudName: string
  apiKey: string
  timestamp: number | string
  signature: string
  folder: string
  publicId: string
  overwrite: boolean | string
  uploadUrl: string
  maxFileBytes: number
  allowedFormats: string[]
  transformation?: string
}

export type OnlineCheckout = {
  provider: string
  publicKey: string
  paymentUuid: string
  amount: number
  amountInCents: number
  currency: string
  description: string
  orderId: string | null
  email: string | null
  expiresAt: string | null
}

export type Culqi3DS = {
  eci: string
  xid?: string
  cavv: string
  protocolVersion: string
  directoryServerTransactionId?: string
}

export type OnlineChargeDto = {
  tokenId: string
  email: string
  authentication3DS?: Culqi3DS
}

export type OnlineChargeResult = {
  status: OnlineChargeStatus
  message: string | null
  transactionUuid?: string | null
  payment?: BillingPaymentDetail | null
}

export type BillingApiError = {
  message: string | string[]
  error?: string
  statusCode: number
  code?: string
  suspendedAt?: string
}

export type BillingPaginated<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const formatBillingMoney = (value: number | null | undefined, currency = 'PEN') => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }

  if (currency === 'PEN') {
    return formatRoomPrice(value)
  }

  return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(Number(value))
}

export const billingCycleLabel = (value?: string | null) => {
  if (!value) {
    return '—'
  }

  return BILLING_CYCLE_LABELS[value] || value
}

export const isPdfUrl = (url?: string | null) => Boolean(url && /\.pdf(\?|$)/i.test(url))
