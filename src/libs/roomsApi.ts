import type { CreateRoomDto, Room, RoomStatus, UpdateRoomDto } from '@/types/apps/roomsTypes'
import { ROOM_STATUSES } from '@/types/apps/roomsTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getRoomsApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
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

const normalizeStatus = (status: unknown): RoomStatus => {
  const value = String(status || 'AVAILABLE').toUpperCase()

  return (ROOM_STATUSES as readonly string[]).includes(value) ? (value as RoomStatus) : 'AVAILABLE'
}

const normalizeRoom = (room: Room): Room => ({
  ...room,
  propertyId: toNumber(room.propertyId),
  roomTypeId: toNumber(room.roomTypeId),
  floorId: toNumber(room.floorId),
  photoUrl: room.photoUrl ?? null,
  notes: room.notes ?? null,
  status: normalizeStatus(room.status)
})

const parseResponse = async <T>(res: Response): Promise<T> => {
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw data ?? { message: ['Ocurrió un error.'] }
  }

  return data as T
}

export async function listRooms(): Promise<Room[]> {
  const res = await fetch(`${getApiBase()}/rooms`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store'
  })

  const data = await parseResponse<Room[]>(res)

  return Array.isArray(data) ? data.map(normalizeRoom) : []
}

export async function getRoom(uuid: string): Promise<Room> {
  const res = await fetch(`${getApiBase()}/rooms/${uuid}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store'
  })

  return normalizeRoom(await parseResponse<Room>(res))
}

export async function createRoom(body: CreateRoomDto): Promise<Room> {
  const res = await fetch(`${getApiBase()}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      propertyId: Number(body.propertyId),
      roomTypeId: Number(body.roomTypeId),
      floorId: Number(body.floorId),
      number: body.number,
      status: body.status,
      photoUrl: body.photoUrl ?? null,
      notes: body.notes ?? null
    })
  })

  return normalizeRoom(await parseResponse<Room>(res))
}

export async function updateRoom(uuid: string, body: UpdateRoomDto): Promise<Room> {
  const payload: UpdateRoomDto = {}

  if (body.roomTypeId !== undefined) payload.roomTypeId = Number(body.roomTypeId)
  if (body.floorId !== undefined) payload.floorId = Number(body.floorId)
  if (body.status !== undefined) payload.status = body.status
  if (body.photoUrl !== undefined) payload.photoUrl = body.photoUrl
  if (body.notes !== undefined) payload.notes = body.notes

  const res = await fetch(`${getApiBase()}/rooms/${uuid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  return normalizeRoom(await parseResponse<Room>(res))
}

export async function deleteRoom(uuid: string): Promise<Room> {
  const res = await fetch(`${getApiBase()}/rooms/${uuid}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  })

  return normalizeRoom(await parseResponse<Room>(res))
}
