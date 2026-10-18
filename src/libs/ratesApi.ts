import { getSession } from 'next-auth/react'

import type { ApiError } from '@/types/apps/clientsTypes'
import type { PageMeta, Paginated } from '@/types/apps/pagination'
import type { CreateSeasonPayload, ListRatesQuery, Rate, Season, UpdateSeasonPayload } from '@/types/apps/rateTypes'

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

const emptyToNull = (value?: string | null) => {
  if (value === undefined) {
    return undefined
  }

  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

const normalizeRate = (rate: Rate): Rate => ({
  ...rate,
  id: toNumber(rate.id),
  propertyId: toNumber(rate.propertyId),
  roomTypeId: toNumber(rate.roomTypeId),
  roomTypeName: rate.roomTypeName || '',
  price: toNumber(rate.price),
  validFrom: rate.validFrom ?? null,
  validTo: rate.validTo ?? null,
  isActive: Boolean(rate.isActive)
})

const normalizeSeason = (season: Season): Season => ({
  ...season,
  id: toNumber(season.id),
  propertyId: toNumber(season.propertyId),
  validFrom: season.validFrom ?? null,
  validTo: season.validTo ?? null,
  isActive: Boolean(season.isActive),
  prices: (season.prices ?? []).map(price => ({
    id: toNumber(price.id),
    roomTypeId: toNumber(price.roomTypeId),
    roomTypeName: price.roomTypeName || '',
    price: toNumber(price.price)
  }))
})

const emptyMeta = (total = 0): PageMeta => ({
  page: 1,
  limit: total || 20,
  total,
  totalPages: total > 0 ? 1 : 0
})

const normalizePage = (payload: Paginated<Rate> | Rate[]): Paginated<Rate> => {
  if (Array.isArray(payload)) {
    return { data: payload.map(normalizeRate), meta: emptyMeta(payload.length) }
  }

  const data = Array.isArray(payload?.data) ? payload.data.map(normalizeRate) : []

  return {
    data,
    meta: payload?.meta ?? emptyMeta(data.length)
  }
}

const toQuery = (params?: ListRatesQuery) => {
  const search = new URLSearchParams()

  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.roomTypeId) search.set('roomTypeId', String(params.roomTypeId))
  if (params?.isActive !== undefined) search.set('isActive', String(params.isActive))

  const query = search.toString()

  return query ? `?${query}` : ''
}

const toSeasonPayload = (body: CreateSeasonPayload | UpdateSeasonPayload) => {
  const payload: UpdateSeasonPayload = {}

  if (body.name !== undefined) payload.name = body.name.trim()
  if (body.validFrom !== undefined) payload.validFrom = emptyToNull(body.validFrom) ?? null
  if (body.validTo !== undefined) payload.validTo = emptyToNull(body.validTo) ?? null
  if (body.isActive !== undefined) payload.isActive = body.isActive
  if (body.prices !== undefined) {
    payload.prices = body.prices.map(price => ({
      roomTypeId: Number(price.roomTypeId),
      price: Number(price.price)
    }))
  }

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

const normalizeSeasonPage = (payload: Paginated<Season> | Season[]): Paginated<Season> => {
  if (Array.isArray(payload)) {
    return { data: payload.map(normalizeSeason), meta: emptyMeta(payload.length) }
  }

  const data = Array.isArray(payload?.data) ? payload.data.map(normalizeSeason) : []

  return { data, meta: payload?.meta ?? emptyMeta(data.length) }
}

export async function listRates(propertyId: number, params?: ListRatesQuery, token?: string) {
  return normalizePage(
    await request<Paginated<Rate> | Rate[]>(`/properties/${propertyId}/seasons/prices${toQuery(params)}`, {}, token)
  )
}

export async function listSeasons(propertyId: number, params?: ListRatesQuery, token?: string) {
  return normalizeSeasonPage(
    await request<Paginated<Season> | Season[]>(`/properties/${propertyId}/seasons${toQuery(params)}`, {}, token)
  )
}

export async function getSeason(propertyId: number, uuid: string, token?: string) {
  return normalizeSeason(await request<Season>(`/properties/${propertyId}/seasons/${uuid}`, {}, token))
}

export async function createSeason(propertyId: number, body: CreateSeasonPayload, token?: string) {
  return normalizeSeason(
    await request<Season>(`/properties/${propertyId}/seasons`, {
      method: 'POST',
      body: JSON.stringify(toSeasonPayload(body))
    }, token)
  )
}

export async function updateSeason(propertyId: number, uuid: string, body: UpdateSeasonPayload, token?: string) {
  return normalizeSeason(
    await request<Season>(`/properties/${propertyId}/seasons/${uuid}`, {
      method: 'PATCH',
      body: JSON.stringify(toSeasonPayload(body))
    }, token)
  )
}

export async function deleteSeason(propertyId: number, uuid: string, reason: string, token?: string) {
  return normalizeSeason(
    await request<Season>(
      `/properties/${propertyId}/seasons/${uuid}`,
      { method: 'DELETE', body: JSON.stringify({ reason }) },
      token
    )
  )
}
