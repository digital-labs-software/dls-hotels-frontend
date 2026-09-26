import { getSession } from 'next-auth/react'

import type { ApiError } from '@/types/apps/clientsTypes'
import type { CreateFloorDto, Floor, UpdateFloorDto } from '@/types/apps/floorTypes'
import type { ListQuery, PageMeta, Paginated } from '@/types/apps/pagination'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getFloorsApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
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

const normalizeFloor = (floor: Floor): Floor => ({
  ...floor,
  id: toNumber(floor.id),
  propertyId: toNumber(floor.propertyId),
  displayOrder: toNumber(floor.displayOrder)
})

const emptyMeta = (total = 0): PageMeta => ({
  page: 1,
  limit: total || 20,
  total,
  totalPages: total > 0 ? 1 : 0
})

const normalizePage = (payload: Paginated<Floor> | Floor[]): Paginated<Floor> => {
  if (Array.isArray(payload)) {
    return { data: payload.map(normalizeFloor), meta: emptyMeta(payload.length) }
  }

  const data = Array.isArray(payload?.data) ? payload.data.map(normalizeFloor) : []

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

export async function listFloors(propertyId: number, params?: ListQuery, token?: string) {
  return normalizePage(
    await request<Paginated<Floor> | Floor[]>(`/properties/${propertyId}/floors${toQuery(params)}`, {}, token)
  )
}

export async function getFloor(propertyId: number, uuid: string, token?: string) {
  return normalizeFloor(await request<Floor>(`/properties/${propertyId}/floors/${uuid}`, {}, token))
}

export async function createFloor(propertyId: number, body: CreateFloorDto, token?: string) {
  return normalizeFloor(
    await request<Floor>(
      `/properties/${propertyId}/floors`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: body.name.trim(),
          displayOrder: Number(body.displayOrder)
        })
      },
      token
    )
  )
}

export async function updateFloor(propertyId: number, uuid: string, body: UpdateFloorDto, token?: string) {
  const payload: UpdateFloorDto = {}

  if (body.name !== undefined) payload.name = body.name.trim()
  if (body.displayOrder !== undefined) payload.displayOrder = Number(body.displayOrder)

  return normalizeFloor(
    await request<Floor>(
      `/properties/${propertyId}/floors/${uuid}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
      token
    )
  )
}

export async function deleteFloor(propertyId: number, uuid: string, token?: string) {
  return normalizeFloor(
    await request<Floor>(`/properties/${propertyId}/floors/${uuid}`, { method: 'DELETE' }, token)
  )
}
