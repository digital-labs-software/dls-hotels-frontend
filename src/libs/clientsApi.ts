import { getSession } from 'next-auth/react'

import type {
  ApiError,
  Company,
  CompanyType,
  CreateCompanyInput,
  CreateGuestInput,
  DocumentType,
  Guest,
  UpdateCompanyInput,
  UpdateGuestInput
} from '@/types/apps/clientsTypes'
import { COMPANY_TYPES, DOCUMENT_TYPES } from '@/types/apps/clientsTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getClientsApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
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

const normalizeDocumentType = (value: unknown): DocumentType | null => {
  const next = String(value || '').toUpperCase()

  return (DOCUMENT_TYPES as readonly string[]).includes(next) ? (next as DocumentType) : null
}

const normalizeCompanyType = (value: unknown): CompanyType => {
  const next = String(value || 'CORPORATE').toUpperCase()

  return (COMPANY_TYPES as readonly string[]).includes(next) ? (next as CompanyType) : 'CORPORATE'
}

const normalizeGuest = (guest: Guest): Guest => ({
  ...guest,
  notes: guest.notes ?? null,
  person: {
    ...guest.person,
    documentType: normalizeDocumentType(guest.person?.documentType),
    documentNumber: guest.person?.documentNumber ?? null,
    phone: guest.person?.phone ?? null,
    email: guest.person?.email ?? null,
    address: guest.person?.address ?? null,
    birthDate: guest.person?.birthDate ?? null,
    isEmployee: Boolean(guest.person?.isEmployee)
  },
  user: guest.user ?? null
})

const normalizeCompany = (company: Company): Company => ({
  ...company,
  companyType: normalizeCompanyType(company.companyType),
  taxNumber: company.taxNumber ?? null,
  tradeName: company.tradeName ?? null,
  phone: company.phone ?? null,
  email: company.email ?? null,
  address: company.address ?? null
})

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

const toGuestPayload = (body: CreateGuestInput | UpdateGuestInput) => {
  const payload: UpdateGuestInput = {}

  if (body.firstName !== undefined) payload.firstName = body.firstName.trim()
  if (body.lastName !== undefined) payload.lastName = body.lastName.trim()
  if (body.documentType !== undefined) payload.documentType = body.documentType || null
  if (body.documentNumber !== undefined) payload.documentNumber = emptyToNull(body.documentNumber)
  if (body.phone !== undefined) payload.phone = emptyToNull(body.phone)
  if (body.email !== undefined) payload.email = emptyToNull(body.email)
  if (body.address !== undefined) payload.address = emptyToNull(body.address)
  if (body.birthDate !== undefined) payload.birthDate = emptyToNull(body.birthDate)
  if (body.notes !== undefined) payload.notes = emptyToNull(body.notes)

  return payload
}

const toCompanyPayload = (body: CreateCompanyInput | UpdateCompanyInput) => {
  const payload: UpdateCompanyInput = {}

  if (body.businessName !== undefined) payload.businessName = body.businessName.trim()
  if (body.companyType !== undefined) payload.companyType = body.companyType
  if (body.taxNumber !== undefined) payload.taxNumber = emptyToNull(body.taxNumber)
  if (body.tradeName !== undefined) payload.tradeName = emptyToNull(body.tradeName)
  if (body.phone !== undefined) payload.phone = emptyToNull(body.phone)
  if (body.email !== undefined) payload.email = emptyToNull(body.email)
  if (body.address !== undefined) payload.address = emptyToNull(body.address)

  return payload
}

export const guestsApi = {
  list: async (propertyId: number, token?: string) => {
    const data = await request<Guest[]>(`/properties/${propertyId}/guests`, {}, token)

    return Array.isArray(data) ? data.map(normalizeGuest) : []
  },
  get: async (propertyId: number, uuid: string, token?: string) => {
    return normalizeGuest(await request<Guest>(`/properties/${propertyId}/guests/${uuid}`, {}, token))
  },
  create: async (propertyId: number, body: CreateGuestInput, token?: string) => {
    return normalizeGuest(
      await request<Guest>(
        `/properties/${propertyId}/guests`,
        { method: 'POST', body: JSON.stringify(toGuestPayload(body)) },
        token
      )
    )
  },
  update: async (propertyId: number, uuid: string, body: UpdateGuestInput, token?: string) => {
    return normalizeGuest(
      await request<Guest>(
        `/properties/${propertyId}/guests/${uuid}`,
        { method: 'PATCH', body: JSON.stringify(toGuestPayload(body)) },
        token
      )
    )
  },
  remove: async (propertyId: number, uuid: string, token?: string) => {
    return normalizeGuest(
      await request<Guest>(`/properties/${propertyId}/guests/${uuid}`, { method: 'DELETE' }, token)
    )
  }
}

export const companiesApi = {
  list: async (propertyId: number, token?: string) => {
    const data = await request<Company[]>(`/properties/${propertyId}/companies`, {}, token)

    return Array.isArray(data) ? data.map(normalizeCompany) : []
  },
  get: async (propertyId: number, uuid: string, token?: string) => {
    return normalizeCompany(await request<Company>(`/properties/${propertyId}/companies/${uuid}`, {}, token))
  },
  create: async (propertyId: number, body: CreateCompanyInput, token?: string) => {
    return normalizeCompany(
      await request<Company>(
        `/properties/${propertyId}/companies`,
        { method: 'POST', body: JSON.stringify(toCompanyPayload(body)) },
        token
      )
    )
  },
  update: async (propertyId: number, uuid: string, body: UpdateCompanyInput, token?: string) => {
    return normalizeCompany(
      await request<Company>(
        `/properties/${propertyId}/companies/${uuid}`,
        { method: 'PATCH', body: JSON.stringify(toCompanyPayload(body)) },
        token
      )
    )
  },
  remove: async (propertyId: number, uuid: string, token?: string) => {
    return normalizeCompany(
      await request<Company>(`/properties/${propertyId}/companies/${uuid}`, { method: 'DELETE' }, token)
    )
  }
}
