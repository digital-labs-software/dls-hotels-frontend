import type { CreateFloorDto, Floor, UpdateFloorDto } from '@/types/apps/floorTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getFloorsApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
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

const normalizeFloor = (floor: Floor & { id?: unknown }): Floor => {
  const id = toNumber(floor.id, NaN)

  return {
    ...floor,
    id: Number.isFinite(id) && id > 0 ? id : undefined,
    propertyId: toNumber(floor.propertyId),
    displayOrder: toNumber(floor.displayOrder)
  }
}

const parseResponse = async <T>(res: Response): Promise<T> => {
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw data ?? { message: ['Ocurrió un error.'] }
  }

  return data as T
}

export async function listFloors(): Promise<Floor[]> {
  const res = await fetch(`${getApiBase()}/floors`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store'
  })

  const data = await parseResponse<Floor[]>(res)

  return Array.isArray(data) ? data.map(normalizeFloor) : []
}

export async function getFloor(uuid: string): Promise<Floor> {
  const res = await fetch(`${getApiBase()}/floors/${uuid}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store'
  })

  return normalizeFloor(await parseResponse<Floor>(res))
}

export async function createFloor(body: CreateFloorDto): Promise<Floor> {
  const res = await fetch(`${getApiBase()}/floors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      propertyId: Number(body.propertyId),
      name: body.name,
      displayOrder: Number(body.displayOrder)
    })
  })

  return normalizeFloor(await parseResponse<Floor>(res))
}

export async function updateFloor(uuid: string, body: UpdateFloorDto): Promise<Floor> {
  const payload: UpdateFloorDto = {}

  if (body.name !== undefined) {
    payload.name = body.name
  }

  if (body.displayOrder !== undefined) {
    payload.displayOrder = Number(body.displayOrder)
  }

  if (body.propertyId !== undefined) {
    payload.propertyId = Number(body.propertyId)
  }

  const res = await fetch(`${getApiBase()}/floors/${uuid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  return normalizeFloor(await parseResponse<Floor>(res))
}

export async function deleteFloor(uuid: string): Promise<Floor> {
  const res = await fetch(`${getApiBase()}/floors/${uuid}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  })

  return normalizeFloor(await parseResponse<Floor>(res))
}
