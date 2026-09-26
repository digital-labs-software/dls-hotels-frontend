import { getSession } from 'next-auth/react'

import type { ApiError } from '@/types/apps/clientsTypes'
import type {
  GeoItem,
  PropertyCategory,
  PropertySettings,
  UpdatePropertySettingsInput
} from '@/types/apps/hotelSettingsTypes'
import { PROPERTY_CATEGORIES } from '@/types/apps/hotelSettingsTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getHotelSettingsApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
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

const emptyToNull = (value?: string | null) => {
  if (value === undefined) {
    return undefined
  }

  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

const normalizeCategory = (value: unknown): PropertyCategory => {
  const next = String(value || '').toUpperCase()

  return (PROPERTY_CATEGORIES as readonly string[]).includes(next) ? (next as PropertyCategory) : 'HOTEL'
}

const normalizeSettings = (settings: PropertySettings): PropertySettings => ({
  ...settings,
  taxNumber: settings.taxNumber ?? null,
  businessName: settings.businessName ?? null,
  tradeName: settings.tradeName ?? null,
  description: settings.description ?? null,
  logoUrl: settings.logoUrl ?? null,
  whatsapp: settings.whatsapp ?? null,
  website: settings.website ?? null,
  category: normalizeCategory(settings.category),
  checkInTime: settings.checkInTime?.slice(0, 5) || '14:00',
  checkOutTime: settings.checkOutTime?.slice(0, 5) || '12:00',
  location: settings.location
})

const toUpdatePayload = (body: UpdatePropertySettingsInput) => {
  const payload: UpdatePropertySettingsInput = {}

  if (body.districtId !== undefined) payload.districtId = body.districtId
  if (body.address !== undefined) payload.address = body.address.trim()
  if (body.phone !== undefined) payload.phone = body.phone.trim()
  if (body.email !== undefined) payload.email = body.email.trim()
  if (body.tradeName !== undefined) payload.tradeName = emptyToNull(body.tradeName)
  if (body.description !== undefined) payload.description = emptyToNull(body.description)
  if (body.logoUrl !== undefined) payload.logoUrl = emptyToNull(body.logoUrl)
  if (body.whatsapp !== undefined) payload.whatsapp = emptyToNull(body.whatsapp)
  if (body.website !== undefined) payload.website = emptyToNull(body.website)
  if (body.checkInTime !== undefined) payload.checkInTime = body.checkInTime
  if (body.checkOutTime !== undefined) payload.checkOutTime = body.checkOutTime

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

export const hotelSettingsApi = {
  get: async (propertyId: number, token?: string) => {
    return normalizeSettings(await request<PropertySettings>(`/properties/${propertyId}/settings`, {}, token))
  },
  update: async (propertyId: number, body: UpdatePropertySettingsInput, token?: string) => {
    return normalizeSettings(
      await request<PropertySettings>(
        `/properties/${propertyId}/settings`,
        { method: 'PATCH', body: JSON.stringify(toUpdatePayload(body)) },
        token
      )
    )
  }
}

const normalizeGeoList = (data: GeoItem[]) => {
  return Array.isArray(data) ? data.map(item => ({ id: item.id, uuid: item.uuid, name: item.name })) : []
}

export const locationApi = {
  departments: async (token?: string) => {
    return normalizeGeoList(await request<GeoItem[]>('/departments', {}, token))
  },
  provincesByDepartment: async (departmentId: number, token?: string) => {
    return normalizeGeoList(await request<GeoItem[]>(`/provinces/by-department/${departmentId}`, {}, token))
  },
  districtsByProvince: async (provinceId: number, token?: string) => {
    return normalizeGeoList(await request<GeoItem[]>(`/districts/by-province/${provinceId}`, {}, token))
  }
}
