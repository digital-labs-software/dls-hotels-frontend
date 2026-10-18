import { getSession } from 'next-auth/react'

import type { ApiError } from '@/types/apps/clientsTypes'
import type { PageMeta, Paginated } from '@/types/apps/pagination'

export type AuditEvent = {
  uuid: string
  occurredAt: string
  action: 'CREATED' | 'UPDATED' | 'DELETED'
  actionLabel: string
  entityType: string
  entityLabel: string
  summary: string
  reason: string | null
  actorName: string
  ipAddress: string | null
}

export const HOTEL_AUDIT_TYPES = [
  { value: 'season', label: 'Tarifa' },
  { value: 'room_type', label: 'Tipo de habitación' },
  { value: 'room', label: 'Habitación' },
  { value: 'reservation', label: 'Reserva' },
  { value: 'payment', label: 'Pago' },
  { value: 'cash_session', label: 'Caja' },
  { value: 'cash_expense', label: 'Egreso' },
  { value: 'cash_reinforcement', label: 'Refuerzo' },
  { value: 'employee', label: 'Empleado' },
  { value: 'role', label: 'Rol' },
  { value: 'property', label: 'Hotel' },
  { value: 'einvoice_setting', label: 'Facturación' },
  { value: 'invoice', label: 'Comprobante' }
] as const

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getAuditApiErrorMessage = (error: unknown, fallback = 'No se pudo cargar la bitácora.') => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as ApiError).message

    if (Array.isArray(message)) return message.join('\n')
    if (typeof message === 'string' && message.trim()) return message
  }

  return fallback
}

const request = async <T>(path: string): Promise<T> => {
  const session = await getSession()
  const res = await fetch(`${getApiBase()}${path}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {})
    }
  })
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw data ?? new Error('No se pudo cargar la bitácora.')
  }

  return data as T
}

export type AuditQuery = {
  from?: string
  to?: string
  action?: string
  entityType?: string
  page?: number
  limit?: number
  exportAll?: boolean
}

const toQuery = (query: AuditQuery) => {
  const search = new URLSearchParams()

  if (query.from) search.set('from', query.from)
  if (query.to) search.set('to', query.to)
  if (query.action) search.set('action', query.action)
  if (query.entityType) search.set('entityType', query.entityType)
  if (query.page) search.set('page', String(query.page))
  if (query.limit) search.set('limit', String(query.limit))
  if (query.exportAll) search.set('export', 'true')

  const text = search.toString()

  return text ? `?${text}` : ''
}

export async function listAuditEvents(propertyId: number, query: AuditQuery) {
  const payload = await request<Paginated<AuditEvent>>(
    `/properties/${propertyId}/audit-events${toQuery(query)}`
  )

  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    meta: payload?.meta ?? ({ page: 1, limit: 20, total: 0, totalPages: 0 } satisfies PageMeta)
  }
}
