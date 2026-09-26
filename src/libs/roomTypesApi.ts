import { getSession } from 'next-auth/react'

import type { ApiError } from '@/types/apps/clientsTypes'
import type { ListQuery, PageMeta, Paginated } from '@/types/apps/pagination'
import type { CreateRoomTypeDto, RoomType, UpdateRoomTypeDto } from '@/types/apps/roomTypeTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getRoomTypesApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
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

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const normalizeRoomType = (item: RoomType): RoomType => ({
  ...item,
  id: toNumber(item.id),
  propertyId: toNumber(item.propertyId),
  displayOrder: toNumber(item.displayOrder),
  description: item.description ?? null,
  basePrice: toNumber(item.basePrice),
  maxAdults: toNumber(item.maxAdults, 1),
  maxChildren: toNumber(item.maxChildren),
  maxOccupancy: toNullableNumber(item.maxOccupancy)
})

const emptyMeta = (total = 0): PageMeta => ({
  page: 1,
  limit: total || 20,
  total,
  totalPages: total > 0 ? 1 : 0
})

const normalizePage = (payload: Paginated<RoomType> | RoomType[]): Paginated<RoomType> => {
  if (Array.isArray(payload)) {
    return { data: payload.map(normalizeRoomType), meta: emptyMeta(payload.length) }
  }

  const data = Array.isArray(payload?.data) ? payload.data.map(normalizeRoomType) : []

  return {
    data,
    meta: payload?.meta ?? emptyMeta(data.length)
  }
}

const toQuery = (params?: ListQuery) => {
  const search = new URLSearchParams()

  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))

  const query = search.toString()

  return query ? `?${query}` : ''
}

const toPayload = (body: CreateRoomTypeDto | UpdateRoomTypeDto) => {
  const payload: UpdateRoomTypeDto = {}

  if (body.name !== undefined) payload.name = body.name.trim()
  if (body.description !== undefined) payload.description = body.description?.trim() ? body.description.trim() : null
  if (body.basePrice !== undefined) payload.basePrice = Number(body.basePrice)
  if (body.maxAdults !== undefined) payload.maxAdults = Number(body.maxAdults)
  if (body.maxChildren !== undefined) payload.maxChildren = Number(body.maxChildren)
  if (body.maxOccupancy !== undefined) payload.maxOccupancy = body.maxOccupancy === null ? null : Number(body.maxOccupancy)
  if (body.displayOrder !== undefined) payload.displayOrder = Number(body.displayOrder)

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

export async function listRoomTypes(propertyId: number, params?: ListQuery, token?: string) {
  return normalizePage(
    await request<Paginated<RoomType> | RoomType[]>(`/properties/${propertyId}/room-types${toQuery(params)}`, {}, token)
  )
}

export async function getRoomType(propertyId: number, uuid: string, token?: string) {
  return normalizeRoomType(await request<RoomType>(`/properties/${propertyId}/room-types/${uuid}`, {}, token))
}

export async function createRoomType(propertyId: number, body: CreateRoomTypeDto, token?: string) {
  return normalizeRoomType(
    await request<RoomType>(
      `/properties/${propertyId}/room-types`,
      { method: 'POST', body: JSON.stringify(toPayload(body)) },
      token
    )
  )
}

export async function updateRoomType(propertyId: number, uuid: string, body: UpdateRoomTypeDto, token?: string) {
  return normalizeRoomType(
    await request<RoomType>(
      `/properties/${propertyId}/room-types/${uuid}`,
      { method: 'PATCH', body: JSON.stringify(toPayload(body)) },
      token
    )
  )
}

export async function deleteRoomType(propertyId: number, uuid: string, token?: string) {
  return normalizeRoomType(
    await request<RoomType>(`/properties/${propertyId}/room-types/${uuid}`, { method: 'DELETE' }, token)
  )
}
