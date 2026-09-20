import type { CreateHotelRoleDto, HotelRole, UpdateHotelRoleDto } from '@/types/apps/hotelRoleTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getHotelRolesApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
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

const normalizeHotelRole = (role: HotelRole): HotelRole => ({
  ...role,
  id: toNumber(role.id),
  propertyId: toNumber(role.propertyId)
})

const parseResponse = async <T>(res: Response): Promise<T> => {
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw data ?? { message: ['Ocurrió un error.'] }
  }

  return data as T
}

export async function listHotelRoles(): Promise<HotelRole[]> {
  const res = await fetch(`${getApiBase()}/roles`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store'
  })

  const data = await parseResponse<HotelRole[]>(res)

  return Array.isArray(data) ? data.map(normalizeHotelRole) : []
}

export async function getHotelRole(uuid: string): Promise<HotelRole> {
  const res = await fetch(`${getApiBase()}/roles/${uuid}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store'
  })

  return normalizeHotelRole(await parseResponse<HotelRole>(res))
}

export async function createHotelRole(body: CreateHotelRoleDto): Promise<HotelRole> {
  const res = await fetch(`${getApiBase()}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      propertyId: Number(body.propertyId),
      name: body.name
    })
  })

  return normalizeHotelRole(await parseResponse<HotelRole>(res))
}

export async function updateHotelRole(uuid: string, body: UpdateHotelRoleDto): Promise<HotelRole> {
  const payload: UpdateHotelRoleDto = {}

  if (body.name !== undefined) {
    payload.name = body.name
  }

  if (body.propertyId !== undefined) {
    payload.propertyId = Number(body.propertyId)
  }

  const res = await fetch(`${getApiBase()}/roles/${uuid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  return normalizeHotelRole(await parseResponse<HotelRole>(res))
}

export async function deleteHotelRole(uuid: string): Promise<HotelRole> {
  const res = await fetch(`${getApiBase()}/roles/${uuid}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  })

  return normalizeHotelRole(await parseResponse<HotelRole>(res))
}
