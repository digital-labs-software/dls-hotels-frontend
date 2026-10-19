import { getSession } from 'next-auth/react'

import type { ApiError } from '@/types/apps/clientsTypes'
import type { DocumentType } from '@/types/apps/clientsTypes'
import type { PaymentMethod } from '@/types/apps/frontDeskTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getSalesApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as ApiError).message

    if (Array.isArray(message) && message.length > 0) return message.join('\n')
    if (typeof message === 'string' && message.trim()) return message
  }

  if (error instanceof Error && error.message) return error.message

  return fallback
}

export type ProductChargeUnit = 'UNIT' | 'HOUR' | 'NIGHT' | 'CUP'

export type SaleProduct = {
  uuid: string
  name: string
  price: number
  note: string | null
  chargeUnit: ProductChargeUnit
  taxAffectation: 'TAXED' | 'EXONERATED' | 'UNAFFECTED' | 'EXPORT'
  unitCode: string
  isActive: boolean
  restored?: boolean
}

export type InHouseRoom = {
  reservationRoomUuid: string
  roomNumber: string
  reservationCode: string
  guestUuid: string | null
  guestName: string | null
}

export type Consumption = {
  uuid: string
  billing: 'ROOM' | 'NOW'
  method: PaymentMethod | null
  customerName: string | null
  documentType: DocumentType | null
  documentNumber: string | null
  guestUuid: string | null
  guestName: string | null
  reservationRoomUuid: string | null
  roomNumber: string | null
  total: number
  voidedAt: string | null
  voidReason: string | null
  createdAt: string
  items: { description: string; quantity: number; unitPrice: number; total: number; chargeUnit: ProductChargeUnit }[]
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

  if (!response.ok) throw payload ?? new Error('No se pudo completar la venta.')

  return payload as T
}

export const salesApi = {
  products: (propertyId: number) => request<SaleProduct[]>(`/properties/${propertyId}/sales/products`),
  createProduct: (propertyId: number, body: { name: string; price: number; note?: string | null; chargeUnit?: ProductChargeUnit }) =>
    request<SaleProduct>(`/properties/${propertyId}/sales/products`, { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (
    propertyId: number,
    uuid: string,
    body: { name?: string; price?: number; note?: string | null; chargeUnit?: ProductChargeUnit; isActive?: boolean }
  ) =>
    request<SaleProduct>(`/properties/${propertyId}/sales/products/${uuid}`, { method: 'PATCH', body: JSON.stringify(body) }),
  removeProduct: (propertyId: number, uuid: string) =>
    request<void>(`/properties/${propertyId}/sales/products/${uuid}`, { method: 'DELETE' }),
  inHouse: (propertyId: number) => request<InHouseRoom[]>(`/properties/${propertyId}/sales/in-house`),
  consumptions: (propertyId: number, day: string) =>
    request<Consumption[]>(`/properties/${propertyId}/sales/consumptions?day=${day}`),
  createConsumption: (
    propertyId: number,
    body: {
      billing: 'ROOM' | 'NOW'
      reservationRoomUuid?: string
      guestUuid?: string
      customerName?: string | null
      documentType?: DocumentType | null
      documentNumber?: string | null
      method?: PaymentMethod
      items: { productUuid: string; quantity: number }[]
    }
  ) => request<Consumption>(`/properties/${propertyId}/sales/consumptions`, { method: 'POST', body: JSON.stringify(body) }),
  voidConsumption: (propertyId: number, uuid: string, reason: string) =>
    request<Consumption>(`/properties/${propertyId}/sales/consumptions/${uuid}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason })
    })
}
