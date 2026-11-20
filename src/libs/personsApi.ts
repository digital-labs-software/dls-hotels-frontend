import { getSession } from 'next-auth/react'

import type { Paginated } from '@/types/apps/pagination'

export type SalePerson = {
  uuid: string
  firstName: string
  lastName: string
  documentType: 'DNI'
  documentNumber: string
}

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const session = await getSession()
  const headers = new Headers(init.headers)

  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (session?.accessToken) headers.set('Authorization', `Bearer ${session.accessToken}`)

  const response = await fetch(`${getApiBase()}${path}`, { ...init, headers })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) throw payload ?? new Error('No se pudo consultar la persona.')

  return payload as T
}

const toList = (payload: Paginated<SalePerson> | SalePerson[]) => (Array.isArray(payload) ? payload : payload.data)

export const personsApi = {
  search: async (propertyId: number, search: string, limit = 8) => {
    const params = new URLSearchParams({ search, limit: String(limit) })
    const payload = await request<Paginated<SalePerson> | SalePerson[]>(`/properties/${propertyId}/persons?${params}`)

    return toList(payload)
  },
  findByDni: async (propertyId: number, documentNumber: string): Promise<SalePerson | null> => {
    const number = documentNumber.trim()
    const rows = await personsApi.search(propertyId, number, 20)

    return rows.find(person => person.documentType === 'DNI' && person.documentNumber === number) ?? null
  },
  create: (propertyId: number, body: { documentNumber: string; firstName: string; lastName: string }) =>
    request<SalePerson>(`/properties/${propertyId}/persons`, { method: 'POST', body: JSON.stringify(body) })
}
