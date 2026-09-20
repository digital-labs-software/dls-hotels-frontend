import type { CreateRoomTypeDto, RoomType, UpdateRoomTypeDto } from '@/types/apps/roomTypeTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getRoomTypesApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string | string[] }).message

    if (Array.isArray(message) && message.length > 0) {
      return message[0]
    }

    if (typeof message === 'string') {
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

const normalizeRoomType = (item: RoomType): RoomType => {
  const id = toNumber(item.id, NaN)

  return {
    ...item,
    id: Number.isFinite(id) && id > 0 ? id : undefined,
    propertyId: toNumber(item.propertyId),
    displayOrder: toNumber(item.displayOrder),
    description: item.description ?? null
  }
}

const parseResponse = async <T>(res: Response): Promise<T> => {
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw data ?? { message: ['Ocurrió un error.'] }
  }

  return data as T
}

export async function listRoomTypes(): Promise<RoomType[]> {
  const res = await fetch(`${getApiBase()}/room-types`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store'
  })

  const data = await parseResponse<RoomType[]>(res)

  return Array.isArray(data) ? data.map(normalizeRoomType) : []
}

export async function getRoomType(uuid: string): Promise<RoomType> {
  const res = await fetch(`${getApiBase()}/room-types/${uuid}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store'
  })

  return normalizeRoomType(await parseResponse<RoomType>(res))
}

export async function createRoomType(body: CreateRoomTypeDto): Promise<RoomType> {
  const res = await fetch(`${getApiBase()}/room-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      propertyId: Number(body.propertyId),
      name: body.name,
      description: body.description ?? null,
      displayOrder: Number(body.displayOrder)
    })
  })

  return normalizeRoomType(await parseResponse<RoomType>(res))
}

export async function updateRoomType(uuid: string, body: UpdateRoomTypeDto): Promise<RoomType> {
  const payload: UpdateRoomTypeDto = {}

  if (body.name !== undefined) {
    payload.name = body.name
  }

  if (body.description !== undefined) {
    payload.description = body.description
  }

  if (body.displayOrder !== undefined) {
    payload.displayOrder = Number(body.displayOrder)
  }

  if (body.propertyId !== undefined) {
    payload.propertyId = Number(body.propertyId)
  }

  const res = await fetch(`${getApiBase()}/room-types/${uuid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  return normalizeRoomType(await parseResponse<RoomType>(res))
}

export async function deleteRoomType(uuid: string): Promise<RoomType> {
  const res = await fetch(`${getApiBase()}/room-types/${uuid}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  })

  return normalizeRoomType(await parseResponse<RoomType>(res))
}
