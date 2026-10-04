import { getSession } from 'next-auth/react'

import type { ApiError } from '@/types/apps/clientsTypes'
import type { Paginated } from '@/types/apps/pagination'
import type {
  CreateEinvoiceInput,
  CreateEinvoiceNoteInput,
  CreateInvoiceSeriesInput,
  Einvoice,
  EinvoiceCatalogs,
  EinvoiceCatalogOption,
  EinvoiceItem,
  EinvoiceListQuery,
  EinvoiceSettings,
  EinvoiceSubmission,
  InvoiceSeries,
  ReservationBilling,
  ReservationBillingCustomer,
  ReservationBillingPayment,
  ReservationBillingRoom,
  UpdateEinvoiceDraftInput,
  UpdateEinvoiceSettingsInput,
  UpdateInvoiceSeriesInput
} from '@/types/apps/einvoiceTypes'
import { raiseIfSubscriptionSuspended } from '@/libs/subscriptionSuspended'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getEinvoiceApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as ApiError).message

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

const toOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const q = (params: Record<string, unknown>) => {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    search.set(key, String(value))
  })

  const query = search.toString()

  return query ? `?${query}` : ''
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

    throw (data as ApiError) ?? { message: ['Ocurrió un error.'], error: 'Error', statusCode: res.status }
  }

  return data as T
}

const pathFor = (propertyId: number, path: string) => `/properties/${propertyId}/${path}`

const normalizeItem = (item: unknown): EinvoiceItem => {
  const row = asRecord(item)

  return {
    uuid: typeof row.uuid === 'string' ? row.uuid : undefined,
    reservationRoomUuid:
      typeof row.reservationRoomUuid === 'string'
        ? row.reservationRoomUuid
        : typeof row.reservation_room_uuid === 'string'
          ? row.reservation_room_uuid
          : null,
    description: String(row.description || ''),
    quantity: toNumber(row.quantity, 1),
    unitPrice: toNumber(row.unitPrice ?? row.unit_price ?? row.price),
    discount: toOptionalNumber(row.discount),
    taxAffectation: (row.taxAffectation ?? row.tax_affectation) as EinvoiceItem['taxAffectation'],
    unitCode: typeof row.unitCode === 'string' ? row.unitCode : typeof row.unit_code === 'string' ? row.unit_code : null,
    igv: toOptionalNumber(row.igv),
    subtotal: toOptionalNumber(row.subtotal),
    total: toOptionalNumber(row.total)
  }
}

const normalizeInvoice = (invoice: unknown): Einvoice => {
  const row = asRecord(invoice)
  const customer = asRecord(row.customer)

  return {
    uuid: String(row.uuid || ''),
    documentType: String(row.documentType || row.document_type || 'RECEIPT'),
    status: String(row.status || 'DRAFT'),
    series: (row.series as string | null) ?? null,
    number: toOptionalNumber(row.number) ?? undefined,
    fullNumber: (row.fullNumber as string | null) ?? (row.full_number as string | null) ?? null,
    issueDate: (row.issueDate as string | null) ?? (row.issue_date as string | null) ?? null,
    dueDate: (row.dueDate as string | null) ?? (row.due_date as string | null) ?? null,
    currency: (row.currency as string | null) ?? 'PEN',
    exchangeRate: toOptionalNumber(row.exchangeRate ?? row.exchange_rate),
    paymentCondition: (row.paymentCondition as string | null) ?? (row.payment_condition as string | null) ?? 'CASH',
    observations: (row.observations as string | null) ?? null,
    reservationUuid: (row.reservationUuid as string | null) ?? (row.reservation_uuid as string | null) ?? null,
    companyUuid: (row.companyUuid as string | null) ?? (row.company_uuid as string | null) ?? null,
    guestUuid: (row.guestUuid as string | null) ?? (row.guest_uuid as string | null) ?? null,
    customerName:
      (row.customerName as string | null) ??
      (customer.name as string | null) ??
      (customer.businessName as string | null) ??
      null,
    customerDocument:
      (row.customerDocument as string | null) ??
      (customer.documentNumber as string | null) ??
      null,
    customer: Object.keys(customer).length
      ? {
          documentType: (customer.documentType as string | null) ?? null,
          documentNumber: (customer.documentNumber as string | null) ?? null,
          name: (customer.name as string | null) ?? null,
          businessName: (customer.businessName as string | null) ?? null,
          address: (customer.address as string | null) ?? null,
          email: (customer.email as string | null) ?? null
        }
      : null,
    subtotal: toOptionalNumber(row.subtotal),
    igv: toOptionalNumber(row.igv),
    total: toOptionalNumber(row.total),
    items: asList(row.items).map(normalizeItem),
    payments: asList(row.payments).map(payment => {
      const link = asRecord(payment)

      return {
        paymentUuid: String(link.paymentUuid || link.payment_uuid || link.uuid || ''),
        amount: toNumber(link.amount),
        method: (link.method as string | null) ?? null,
        paidAt: (link.paidAt as string | null) ?? (link.paid_at as string | null) ?? null
      }
    }),
    notes: asList(row.notes).map(note => {
      const item = asRecord(note)

      return {
        uuid: String(item.uuid || ''),
        documentType: String(item.documentType || item.document_type || 'CREDIT_NOTE'),
        series: (item.series as string | null) ?? null,
        number: toOptionalNumber(item.number) ?? undefined,
        status: (item.status as string | null) ?? undefined,
        reason: (item.reason as string | null) ?? null,
        noteCode: (item.noteCode as string | null) ?? (item.note_code as string | null) ?? null
      }
    }),
    sunatResponse: (row.sunatResponse as string | null) ?? (row.sunat_response as string | null) ?? null,
    sunatMessage: (row.sunatMessage as string | null) ?? (row.sunat_message as string | null) ?? null,
    pdfUrl: (row.pdfUrl as string | null) ?? (row.pdf_url as string | null) ?? null,
    xmlUrl: (row.xmlUrl as string | null) ?? (row.xml_url as string | null) ?? null,
    cdrUrl: (row.cdrUrl as string | null) ?? (row.cdr_url as string | null) ?? null,
    actions: (row.actions as Einvoice['actions']) ?? null,
    createdAt: (row.createdAt as string | null) ?? null,
    updatedAt: (row.updatedAt as string | null) ?? null
  }
}

const normalizePage = (payload: unknown): Paginated<Einvoice> => {
  if (Array.isArray(payload)) {
    return {
      data: payload.map(normalizeInvoice),
      meta: { page: 1, limit: payload.length, total: payload.length, totalPages: 1 }
    }
  }

  const row = asRecord(payload)
  const data = asList(row.data ?? row.items ?? row.invoices).map(normalizeInvoice)
  const meta = asRecord(row.meta)

  return {
    data,
    meta: {
      page: toNumber(meta.page ?? row.page, 1),
      limit: toNumber(meta.limit ?? row.limit, data.length || 20),
      total: toNumber(meta.total ?? row.total, data.length),
      totalPages: toNumber(meta.totalPages ?? row.totalPages, 1)
    }
  }
}

const catalogOptions = (value: unknown): EinvoiceCatalogOption[] => {
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') {
        return { code: item, name: item }
      }

      const row = asRecord(item)

      return {
        code: String(row.code ?? row.value ?? row.id ?? ''),
        name: String(row.name ?? row.label ?? row.displayName ?? row.code ?? '')
      }
    })
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(([code, name]) => ({
      code,
      name: String(name)
    }))
  }

  return []
}

const normalizeCatalogs = (payload: unknown): EinvoiceCatalogs => {
  const row = asRecord(payload)
  const notes = asRecord(row.noteReasons ?? row.notes ?? row.note_reasons)

  return {
    documentTypes: catalogOptions(row.documentTypes ?? row.document_types),
    statuses: catalogOptions(row.statuses ?? row.status),
    creditNoteReasons: catalogOptions(notes.credit ?? notes.CREDIT ?? row.creditNoteReasons ?? row.catalog09),
    debitNoteReasons: catalogOptions(notes.debit ?? notes.DEBIT ?? row.debitNoteReasons ?? row.catalog10),
    identityDocumentTypes: catalogOptions(row.identityDocumentTypes ?? row.documentIdentityTypes ?? row.identityTypes),
    receiptWithoutDocumentLimit: toNumber(asRecord(row.limits).receiptWithoutDocument ?? row.receiptWithoutDocumentLimit, 700)
  }
}

const normalizeSettings = (payload: unknown): EinvoiceSettings => {
  const row = asRecord(payload)
  const issuer = asRecord(row.issuer ?? row.emitter ?? row.emisor)
  const warnings = asList(row.warnings).map(item => String(item))

  return {
    enabled: Boolean(row.enabled ?? row.active),
    igvRate: toNumber(row.igvRate ?? row.igv_rate ?? row.igv, 18),
    pricesIncludeIgv: Boolean(row.pricesIncludeIgv ?? row.prices_include_igv ?? true),
    sendToCustomer: Boolean(row.sendToCustomer ?? row.send_to_customer),
    apiUrl: (row.apiUrl as string | null) ?? (row.api_url as string | null) ?? null,
    hasToken: Boolean(row.hasToken ?? row.has_token),
    provider: (row.provider as string | null) ?? null,
    queueMode: (row.queueMode as string | null) ?? (row.queue_mode as string | null) ?? null,
    warnings,
    issuer: Object.keys(issuer).length
      ? {
          ruc: (issuer.ruc as string | null) ?? (issuer.taxNumber as string | null) ?? null,
          businessName: (issuer.businessName as string | null) ?? (issuer.razonSocial as string | null) ?? null,
          tradeName: (issuer.tradeName as string | null) ?? null,
          address: (issuer.address as string | null) ?? null,
          ubigeo: (issuer.ubigeo as string | null) ?? null,
          email: (issuer.email as string | null) ?? null
        }
      : null
  }
}

const normalizeSeries = (payload: unknown): InvoiceSeries => {
  const row = asRecord(payload)

  return {
    uuid: String(row.uuid || ''),
    documentType: String(row.documentType || row.document_type || ''),
    series: String(row.series || ''),
    nextNumber: toNumber(row.nextNumber ?? row.next_number, 1),
    isDefault: Boolean(row.isDefault ?? row.is_default),
    isActive: row.isActive === undefined && row.is_active === undefined ? true : Boolean(row.isActive ?? row.is_active),
    used: Boolean(row.used ?? row.hasDocuments ?? row.has_documents)
  }
}

const normalizeBillingCustomer = (item: unknown, kind: ReservationBillingCustomer['kind']): ReservationBillingCustomer | null => {
  const row = asRecord(item)
  const uuid = String(row.uuid || row.companyUuid || row.guestUuid || '')

  if (!uuid) {
    return null
  }

  const person = asRecord(row.person)

  return {
    uuid,
    name: String(
      row.name ||
        row.businessName ||
        row.tradeName ||
        [person.firstName, person.lastName].filter(Boolean).join(' ') ||
        'Cliente'
    ),
    documentType: (row.documentType as string | null) ?? (person.documentType as string | null) ?? null,
    documentNumber:
      (row.documentNumber as string | null) ??
      (row.taxNumber as string | null) ??
      (person.documentNumber as string | null) ??
      null,
    email: (row.email as string | null) ?? (person.email as string | null) ?? null,
    address: (row.address as string | null) ?? (person.address as string | null) ?? null,
    kind
  }
}

const normalizeBilling = (payload: unknown, reservationUuid: string): ReservationBilling => {
  const row = asRecord(payload)
  const customersSource = asRecord(row.customers ?? row.suggestedCustomers ?? row.clients)
  const customers: ReservationBillingCustomer[] = []

  asList(customersSource.companies ?? row.companies).forEach(item => {
    const customer = normalizeBillingCustomer(item, 'company')

    if (customer) {
      customers.push(customer)
    }
  })

  asList(customersSource.guests ?? row.guests ?? row.holders).forEach(item => {
    const customer = normalizeBillingCustomer(item, 'guest')

    if (customer) {
      customers.push(customer)
    }
  })

  if (customersSource.company) {
    const customer = normalizeBillingCustomer(customersSource.company, 'company')

    if (customer) {
      customers.push(customer)
    }
  }

  if (customersSource.guest) {
    const customer = normalizeBillingCustomer(customersSource.guest, 'guest')

    if (customer) {
      customers.push(customer)
    }
  }

  const rooms: ReservationBillingRoom[] = asList(row.rooms ?? row.reservationRooms ?? row.items).map(item => {
    const room = asRecord(item)

    return {
      reservationRoomUuid: String(room.reservationRoomUuid || room.reservation_room_uuid || room.uuid || ''),
      roomNumber: (room.roomNumber as string | null) ?? (room.number as string | null) ?? null,
      description: String(room.description || room.suggestedDescription || room.suggested_description || 'Servicio de hospedaje'),
      quantity: toNumber(room.quantity ?? room.nights, 1),
      unitPrice: toNumber(room.unitPrice ?? room.unit_price ?? room.pending ?? room.pendingAmount),
      billed: toNumber(room.billed ?? room.invoiced ?? room.invoicedAmount),
      pending: toNumber(room.pending ?? room.pendingAmount ?? room.balance)
    }
  })

  const payments: ReservationBillingPayment[] = asList(row.payments).map(item => {
    const payment = asRecord(item)

    return {
      paymentUuid: String(payment.paymentUuid || payment.payment_uuid || payment.uuid || ''),
      amount: toNumber(payment.amount),
      available: toNumber(payment.available ?? payment.availableAmount ?? payment.available_amount ?? payment.amount),
      method: (payment.method as string | null) ?? null,
      paidAt: (payment.paidAt as string | null) ?? (payment.paid_at as string | null) ?? null
    }
  })

  return {
    reservationUuid: String(row.reservationUuid || row.reservation_uuid || reservationUuid),
    reservationCode: (row.reservationCode as string | null) ?? (row.code as string | null) ?? null,
    customers,
    rooms,
    payments,
    invoices: asList(row.invoices ?? row.documents).map(normalizeInvoice)
  }
}

export const einvoiceApi = {
  settings: async (propertyId: number, token?: string) => {
    return normalizeSettings(await request(pathFor(propertyId, 'einvoice/settings'), {}, token))
  },
  updateSettings: async (propertyId: number, body: UpdateEinvoiceSettingsInput, token?: string) => {
    return normalizeSettings(
      await request(pathFor(propertyId, 'einvoice/settings'), { method: 'PATCH', body: JSON.stringify(body) }, token)
    )
  },
  catalogs: async (propertyId: number, token?: string) => {
    return normalizeCatalogs(await request(pathFor(propertyId, 'einvoice/catalogs'), {}, token))
  },
  series: async (propertyId: number, documentType?: string, token?: string) => {
    const payload = await request<unknown>(pathFor(propertyId, `invoice-series${q({ documentType })}`), {}, token)

    return (Array.isArray(payload) ? payload : asList(asRecord(payload).data ?? asRecord(payload).items)).map(normalizeSeries)
  },
  createSeries: async (propertyId: number, body: CreateInvoiceSeriesInput, token?: string) => {
    return normalizeSeries(
      await request(pathFor(propertyId, 'invoice-series'), { method: 'POST', body: JSON.stringify(body) }, token)
    )
  },
  updateSeries: async (propertyId: number, uuid: string, body: UpdateInvoiceSeriesInput, token?: string) => {
    return normalizeSeries(
      await request(pathFor(propertyId, `invoice-series/${uuid}`), { method: 'PATCH', body: JSON.stringify(body) }, token)
    )
  },
  deleteSeries: async (propertyId: number, uuid: string, token?: string) => {
    await request(pathFor(propertyId, `invoice-series/${uuid}`), { method: 'DELETE' }, token)
  },
  reservationBilling: async (propertyId: number, reservationUuid: string, token?: string) => {
    return normalizeBilling(
      await request(pathFor(propertyId, `reservations/${reservationUuid}/billing`), {}, token),
      reservationUuid
    )
  },
  list: async (propertyId: number, params: EinvoiceListQuery = {}, token?: string) => {
    return normalizePage(await request(pathFor(propertyId, `invoices${q(params)}`), {}, token))
  },
  get: async (propertyId: number, uuid: string, token?: string) => {
    return normalizeInvoice(await request(pathFor(propertyId, `invoices/${uuid}`), {}, token))
  },
  create: async (propertyId: number, body: CreateEinvoiceInput, token?: string) => {
    return normalizeInvoice(await request(pathFor(propertyId, 'invoices'), { method: 'POST', body: JSON.stringify(body) }, token))
  },
  updateDraft: async (propertyId: number, uuid: string, body: UpdateEinvoiceDraftInput, token?: string) => {
    return normalizeInvoice(
      await request(pathFor(propertyId, `invoices/${uuid}`), { method: 'PATCH', body: JSON.stringify(body) }, token)
    )
  },
  removeDraft: async (propertyId: number, uuid: string, token?: string) => {
    await request(pathFor(propertyId, `invoices/${uuid}`), { method: 'DELETE' }, token)
  },
  issueDraft: async (propertyId: number, uuid: string, token?: string) => {
    return normalizeInvoice(await request(pathFor(propertyId, `invoices/${uuid}/issue`), { method: 'POST' }, token))
  },
  createNote: async (propertyId: number, uuid: string, body: CreateEinvoiceNoteInput, token?: string) => {
    return normalizeInvoice(
      await request(pathFor(propertyId, `invoices/${uuid}/notes`), { method: 'POST', body: JSON.stringify(body) }, token)
    )
  },
  voidInvoice: async (propertyId: number, uuid: string, reason: string, token?: string) => {
    return normalizeInvoice(
      await request(pathFor(propertyId, `invoices/${uuid}/void`), { method: 'POST', body: JSON.stringify({ reason }) }, token)
    )
  },
  retry: async (propertyId: number, uuid: string, token?: string) => {
    return normalizeInvoice(await request(pathFor(propertyId, `invoices/${uuid}/retry`), { method: 'POST' }, token))
  },
  applyPayments: async (
    propertyId: number,
    uuid: string,
    payments: Array<{ paymentUuid: string; amount: number }>,
    token?: string
  ) => {
    return normalizeInvoice(
      await request(pathFor(propertyId, `invoices/${uuid}/payments`), { method: 'PUT', body: JSON.stringify({ payments }) }, token)
    )
  },
  submissions: async (propertyId: number, uuid: string, token?: string) => {
    const payload = await request<unknown>(pathFor(propertyId, `invoices/${uuid}/submissions`), {}, token)

    return (Array.isArray(payload) ? payload : asList(asRecord(payload).data ?? asRecord(payload).items)).map(item => {
      const row = asRecord(item)

      return {
        uuid: typeof row.uuid === 'string' ? row.uuid : undefined,
        status: (row.status as string | null) ?? null,
        provider: (row.provider as string | null) ?? null,
        message: (row.message as string | null) ?? (row.error as string | null) ?? null,
        createdAt: (row.createdAt as string | null) ?? (row.created_at as string | null) ?? null
      } satisfies EinvoiceSubmission
    })
  }
}
