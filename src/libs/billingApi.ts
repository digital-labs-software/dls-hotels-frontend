import { getSession } from 'next-auth/react'

import type {
  BillingApiError,
  BillingPaginated,
  BillingPaymentDetail,
  BillingPaymentStatus,
  BillingPaymentSummary,
  BillingSubscriptionResponse,
  BillingVoucher,
  CreateBillingVoucherDto,
  OnlineChargeDto,
  OnlineChargeResult,
  OnlineCheckout,
  VoucherMethod,
  VoucherUploadSignature
} from '@/types/apps/billingTypes'
import { DEFAULT_VOUCHER_METHODS } from '@/types/apps/billingTypes'
import { raiseIfSubscriptionSuspended } from '@/libs/subscriptionSuspended'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getBillingApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as BillingApiError).message

    if (Array.isArray(message) && message.length > 0) {
      return message.join('\n')
    }

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

const fileExtension = (file: File) => {
  const fromName = file.name.split('.').pop()?.toLowerCase() || ''
  const fromType = file.type.split('/')[1]?.toLowerCase() || ''

  return fromName && fromName !== file.name.toLowerCase() ? fromName : fromType
}

const resolveToken = async (token?: string) => {
  if (token) {
    return token
  }

  const session = await getSession()

  return session?.accessToken
}

const request = async <T>(path: string, init: RequestInit = {}, token?: string): Promise<T> => {
  const accessToken = await resolveToken(token)

  const res = await fetch(`${getApiBase()}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers
    }
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    raiseIfSubscriptionSuspended(data)

    throw (data as BillingApiError) ?? { message: ['Ocurrió un error.'], error: 'Error', statusCode: res.status }
  }

  return data as T
}

const billingPath = (propertyId: number, path = '') => `/properties/${propertyId}/billing${path}`

const normalizeVoucher = (voucher: BillingVoucher): BillingVoucher => ({
  ...voucher,
  amount: toNumber(voucher.amount),
  method: voucher.method ?? null,
  operationDate: voucher.operationDate ?? null,
  reference: voucher.reference ?? null,
  notes: voucher.notes ?? null,
  reviewNotes: voucher.reviewNotes ?? null,
  reviewedAt: voucher.reviewedAt ?? null,
  createdAt: voucher.createdAt ?? null
})

const normalizePayment = (payment: BillingPaymentSummary): BillingPaymentSummary => ({
  ...payment,
  amount: toNumber(payment.amount),
  discountAmount: toNumber(payment.discountAmount),
  total: toNumber(payment.total),
  currency: payment.currency || 'PEN',
  periodStart: payment.periodStart ?? null,
  periodEnd: payment.periodEnd ?? null,
  dueDate: payment.dueDate ?? null,
  paidAt: payment.paidAt ?? null,
  method: payment.method ?? null,
  reference: payment.reference ?? null,
  canPay: Boolean(payment.canPay),
  latestVoucher: payment.latestVoucher ? normalizeVoucher(payment.latestVoucher) : null
})

const normalizePaymentDetail = (payment: BillingPaymentDetail): BillingPaymentDetail => ({
  ...normalizePayment(payment),
  vouchers: Array.isArray(payment.vouchers) ? payment.vouchers.map(normalizeVoucher) : []
})

const normalizeSubscription = (payload: BillingSubscriptionResponse): BillingSubscriptionResponse => {
  const voucherMethods = (payload.paymentOptions?.voucherMethods || DEFAULT_VOUCHER_METHODS).filter(Boolean)

  return {
    ...payload,
    account: payload.account ?? null,
    subscription: payload.subscription
      ? {
          ...payload.subscription,
          price: toNumber(payload.subscription.price),
          discountAmount: toNumber(payload.subscription.discountAmount),
          netPrice: toNumber(payload.subscription.netPrice),
          currency: payload.subscription.currency || 'PEN',
          plan: payload.subscription.plan
            ? {
                ...payload.subscription.plan,
                features: Array.isArray(payload.subscription.plan.features) ? payload.subscription.plan.features : []
              }
            : null
        }
      : null,
    balance: payload.balance
      ? {
          outstanding: {
            count: toNumber(payload.balance.outstanding?.count),
            total: toNumber(payload.balance.outstanding?.total)
          },
          overdue: {
            count: toNumber(payload.balance.overdue?.count),
            total: toNumber(payload.balance.overdue?.total)
          },
          nextPayment: payload.balance.nextPayment ? normalizePayment(payload.balance.nextPayment) : null,
          pendingVouchers: toNumber(payload.balance.pendingVouchers)
        }
      : null,
    paymentOptions: payload.paymentOptions
      ? {
          instructions: payload.paymentOptions.instructions ?? null,
          voucherMethods: voucherMethods as VoucherMethod[],
          onlinePayment: {
            enabled: Boolean(payload.paymentOptions.onlinePayment?.enabled),
            provider: payload.paymentOptions.onlinePayment?.provider ?? null,
            publicKey: payload.paymentOptions.onlinePayment?.publicKey ?? null
          }
        }
      : null,
    today: payload.today
  }
}

export const validateVoucherFile = (
  file: File,
  signed?: Pick<VoucherUploadSignature, 'maxFileBytes' | 'allowedFormats'>
) => {
  const maxBytes = signed?.maxFileBytes || 5 * 1024 * 1024
  const formats = (signed?.allowedFormats?.length ? signed.allowedFormats : ['jpg', 'jpeg', 'png', 'webp', 'pdf']).map(
    item => item.toLowerCase()
  )
  const extension = fileExtension(file)
  const mimeType = file.type.split('/')[1]?.toLowerCase() || ''

  if (file.size > maxBytes) {
    return `La constancia de pago no puede superar ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`
  }

  if (!formats.includes(extension) && !formats.includes(mimeType)) {
    return `Usa un archivo ${formats.join(', ')}.`
  }

  return null
}

export const uploadVoucherToCloudinary = async (signed: VoucherUploadSignature, file: File) => {
  const validationError = validateVoucherFile(file, signed)

  if (validationError) {
    throw new Error(validationError)
  }

  const form = new FormData()

  form.append('file', file)
  form.append('api_key', String(signed.apiKey))
  form.append('timestamp', String(signed.timestamp))
  form.append('signature', signed.signature)
  form.append('folder', signed.folder)
  form.append('public_id', signed.publicId)
  form.append('overwrite', String(signed.overwrite))

  const res = await fetch(signed.uploadUrl, { method: 'POST', body: form })
  const uploaded = await res.json().catch(() => null)
  const fileUrl = uploaded?.secure_url

  if (!res.ok || typeof fileUrl !== 'string' || !fileUrl) {
    const message = uploaded?.error?.message || uploaded?.message || 'No se pudo subir la constancia de pago a Cloudinary.'

    throw new Error(typeof message === 'string' ? message : 'No se pudo subir la constancia de pago a Cloudinary.')
  }

  return fileUrl as string
}

export const billingApi = {
  subscription: async (propertyId: number, token?: string) => {
    return normalizeSubscription(
      await request<BillingSubscriptionResponse>(billingPath(propertyId, '/subscription'), {}, token)
    )
  },

  payments: async (
    propertyId: number,
    params: { page?: number; limit?: number; status?: BillingPaymentStatus | '' } = {},
    token?: string
  ) => {
    const search = new URLSearchParams()

    search.set('page', String(params.page || 1))
    search.set('limit', String(params.limit || 20))

    if (params.status) {
      search.set('status', params.status)
    }

    const payload = await request<BillingPaginated<BillingPaymentSummary>>(
      billingPath(propertyId, `/payments?${search.toString()}`),
      {},
      token
    )

    return {
      data: Array.isArray(payload.data) ? payload.data.map(normalizePayment) : [],
      meta: {
        page: toNumber(payload.meta?.page, 1),
        limit: toNumber(payload.meta?.limit, 20),
        total: toNumber(payload.meta?.total),
        totalPages: toNumber(payload.meta?.totalPages, 1)
      }
    }
  },

  payment: async (propertyId: number, uuid: string, token?: string) => {
    return normalizePaymentDetail(
      await request<BillingPaymentDetail>(billingPath(propertyId, `/payments/${uuid}`), {}, token)
    )
  },

  uploadSignature: async (propertyId: number, paymentUuid: string, token?: string) => {
    return request<VoucherUploadSignature>(
      billingPath(propertyId, `/payments/${paymentUuid}/vouchers/upload-signature`),
      { method: 'POST' },
      token
    )
  },

  createVoucher: async (propertyId: number, paymentUuid: string, body: CreateBillingVoucherDto, token?: string) => {
    return normalizeVoucher(
      await request<BillingVoucher>(
        billingPath(propertyId, `/payments/${paymentUuid}/vouchers`),
        { method: 'POST', body: JSON.stringify(body) },
        token
      )
    )
  },

  withdrawVoucher: async (propertyId: number, paymentUuid: string, voucherUuid: string, token?: string) => {
    return request<unknown>(
      billingPath(propertyId, `/payments/${paymentUuid}/vouchers/${voucherUuid}`),
      { method: 'DELETE' },
      token
    )
  },

  // Culqi v1.5: these return 503 while CULQI_ENABLED=false.
  onlineCheckout: async (propertyId: number, paymentUuid: string, token?: string) => {
    return request<OnlineCheckout>(
      billingPath(propertyId, `/payments/${paymentUuid}/online/checkout`),
      { method: 'POST' },
      token
    )
  },

  onlineCharge: async (propertyId: number, paymentUuid: string, body: OnlineChargeDto, token?: string) => {
    return request<OnlineChargeResult>(
      billingPath(propertyId, `/payments/${paymentUuid}/online/charge`),
      { method: 'POST', body: JSON.stringify(body) },
      token
    )
  }
}
