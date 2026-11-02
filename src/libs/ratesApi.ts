import { getSession } from 'next-auth/react'

import type { ApiError } from '@/types/apps/clientsTypes'
import type { PageMeta, Paginated } from '@/types/apps/pagination'
import type {
  CreateRatePayload,
  HotelRate,
  ListRatesQuery,
  ListRoomRatesQuery,
  Rate,
  UpdateRatePayload
} from '@/types/apps/rateTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getRatesApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
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

const emptyMeta = (total = 0): PageMeta => ({
  page: 1,
  limit: total || 20,
  total,
  totalPages: total > 0 ? 1 : 0
})

const normalizeHotelRate = (rate: HotelRate): HotelRate => ({
  ...rate,
  id: toNumber(rate.id),
  propertyId: toNumber(rate.propertyId),
  name: rate.name || '',
  validFrom: rate.validFrom || '',
  validTo: rate.validTo || '',
  isActive: Boolean(rate.isActive),
  expired: Boolean(rate.expired)
})

const normalizeRoomRate = (rate: Rate): Rate => ({
  ...rate,
  id: toNumber(rate.id),
  rateId: toNumber(rate.rateId),
  roomId: toNumber(rate.roomId),
  roomNumber: rate.roomNumber || '',
  name: rate.name || '',
  price: toNumber(rate.price),
  validFrom: rate.validFrom || '',
  validTo: rate.validTo || '',
  isActive: Boolean(rate.isActive),
  expired: Boolean(rate.expired)
})

const normalizePage = <T>(payload: Paginated<T> | T[], map: (item: T) => T): Paginated<T> => {
  if (Array.isArray(payload)) {
    return { data: payload.map(map), meta: emptyMeta(payload.length) }
  }

  const data = Array.isArray(payload?.data) ? payload.data.map(map) : []

  return { data, meta: payload?.meta ?? emptyMeta(data.length) }
}

const toQuery = (params?: ListRatesQuery) => {
  const search = new URLSearchParams()

  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.isActive !== undefined) search.set('isActive', String(params.isActive))

  const query = search.toString()

  return query ? `?${query}` : ''
}

const toPayload = (body: CreateRatePayload | UpdateRatePayload) => {
  const payload: UpdateRatePayload = {}

  if (body.name !== undefined) payload.name = body.name.trim()
  if (body.validFrom !== undefined) payload.validFrom = body.validFrom.trim()
  if (body.validTo !== undefined) payload.validTo = body.validTo.trim()
  if (body.isActive !== undefined) payload.isActive = body.isActive

  return payload
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
    throw (data as ApiError) ?? { message: ['Ocurrió un error.'], error: 'Error', statusCode: res.status }
  }

  return data as T
}

export async function listRates(propertyId: number, params?: ListRatesQuery, token?: string) {
  return normalizePage(
    await request<Paginated<HotelRate> | HotelRate[]>(`/properties/${propertyId}/rates${toQuery(params)}`, {}, token),
    normalizeHotelRate
  )
}

export async function listExpiredRates(propertyId: number, token?: string) {
  const rows = await request<HotelRate[]>(`/properties/${propertyId}/rates/expired`, {}, token)

  return (Array.isArray(rows) ? rows : []).map(normalizeHotelRate)
}

export async function listRoomRates(propertyId: number, params: ListRoomRatesQuery, token?: string) {
  const search = new URLSearchParams()

  search.set('roomId', String(params.roomId))
  if (params.page) search.set('page', String(params.page))
  if (params.limit) search.set('limit', String(params.limit))

  return normalizePage(
    await request<Paginated<Rate> | Rate[]>(`/properties/${propertyId}/rates/prices?${search.toString()}`, {}, token),
    normalizeRoomRate
  )
}

export async function getRate(propertyId: number, uuid: string, token?: string) {
  return normalizeHotelRate(await request<HotelRate>(`/properties/${propertyId}/rates/${uuid}`, {}, token))
}

export async function createRate(propertyId: number, body: CreateRatePayload, token?: string) {
  return normalizeHotelRate(
    await request<HotelRate>(
      `/properties/${propertyId}/rates`,
      { method: 'POST', body: JSON.stringify(toPayload(body)) },
      token
    )
  )
}

export async function updateRate(propertyId: number, uuid: string, body: UpdateRatePayload, token?: string) {
  return normalizeHotelRate(
    await request<HotelRate>(
      `/properties/${propertyId}/rates/${uuid}`,
      { method: 'PATCH', body: JSON.stringify(toPayload(body)) },
      token
    )
  )
}

export async function deleteRate(propertyId: number, uuid: string, reason: string, token?: string) {
  return normalizeHotelRate(
    await request<HotelRate>(
      `/properties/${propertyId}/rates/${uuid}`,
      { method: 'DELETE', body: JSON.stringify({ reason }) },
      token
    )
  )
}
