import { getSession } from 'next-auth/react'

import type { ApiError } from '@/types/apps/clientsTypes'
import type { PageMeta, Paginated } from '@/types/apps/pagination'
import type { CreateRoomDto, ListRoomsQuery, Room, RoomStatus, UpdateRoomDto } from '@/types/apps/roomsTypes'
import { ROOM_STATUSES } from '@/types/apps/roomsTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getRoomsApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
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

const normalizeStatus = (status: unknown): RoomStatus => {
  const value = String(status || 'AVAILABLE').toUpperCase()

  return (ROOM_STATUSES as readonly string[]).includes(value) ? (value as RoomStatus) : 'AVAILABLE'
}

const normalizeRoom = (room: Room): Room => ({
  ...room,
  id: toNumber(room.id),
  propertyId: toNumber(room.propertyId),
  roomTypeId: toNumber(room.roomTypeId),
  floorId: toNumber(room.floorId),
  roomTypeName: room.roomTypeName || '',
  floorName: room.floorName || '',
  photoUrl: room.photoUrl ?? null,
  notes: room.notes ?? null,
  basePrice: toNullableNumber(room.basePrice),
  effectivePrice: toNumber(room.effectivePrice),
  status: normalizeStatus(room.status)
})

const emptyMeta = (total = 0): PageMeta => ({
  page: 1,
  limit: total || 20,
  total,
  totalPages: total > 0 ? 1 : 0
})

const normalizePage = (payload: Paginated<Room> | Room[]): Paginated<Room> => {
  if (Array.isArray(payload)) {
    return { data: payload.map(normalizeRoom), meta: emptyMeta(payload.length) }
  }

  const data = Array.isArray(payload?.data) ? payload.data.map(normalizeRoom) : []

  return {
    data,
    meta: payload?.meta ?? emptyMeta(data.length)
  }
}

const toQuery = (params?: ListRoomsQuery) => {
  const search = new URLSearchParams()

  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.roomTypeId) search.set('roomTypeId', String(params.roomTypeId))
  if (params?.floorId) search.set('floorId', String(params.floorId))
  if (params?.status) search.set('status', params.status)

  const query = search.toString()

  return query ? `?${query}` : ''
}

const emptyToNull = (value?: string | null) => {
  if (value === undefined) {
    return undefined
  }

  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

const toPayload = (body: CreateRoomDto | UpdateRoomDto) => {
  const payload: UpdateRoomDto & { number?: string } = {}

  if ('number' in body && body.number !== undefined) payload.number = body.number.trim()
  if (body.roomTypeId !== undefined) payload.roomTypeId = Number(body.roomTypeId)
  if (body.floorId !== undefined) payload.floorId = Number(body.floorId)
  if (body.status !== undefined) payload.status = body.status
  if (body.photoUrl !== undefined) payload.photoUrl = emptyToNull(body.photoUrl)
  if (body.notes !== undefined) payload.notes = emptyToNull(body.notes)
  if (body.basePrice !== undefined) payload.basePrice = body.basePrice === null ? null : Number(body.basePrice)

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

export async function listRooms(propertyId: number, params?: ListRoomsQuery, token?: string) {
  return normalizePage(
    await request<Paginated<Room> | Room[]>(`/properties/${propertyId}/rooms${toQuery(params)}`, {}, token)
  )
}

export async function getRoom(propertyId: number, uuid: string, token?: string) {
  return normalizeRoom(await request<Room>(`/properties/${propertyId}/rooms/${uuid}`, {}, token))
}

export async function createRoom(propertyId: number, body: CreateRoomDto, token?: string) {
  return normalizeRoom(
    await request<Room>(
      `/properties/${propertyId}/rooms`,
      { method: 'POST', body: JSON.stringify(toPayload(body)) },
      token
    )
  )
}

export async function updateRoom(propertyId: number, uuid: string, body: UpdateRoomDto, token?: string) {
  const payload = toPayload(body)

  delete payload.number

  return normalizeRoom(
    await request<Room>(
      `/properties/${propertyId}/rooms/${uuid}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
      token
    )
  )
}

export async function deleteRoom(propertyId: number, uuid: string, token?: string) {
  return normalizeRoom(await request<Room>(`/properties/${propertyId}/rooms/${uuid}`, { method: 'DELETE' }, token))
}
