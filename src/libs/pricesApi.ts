import { getSession } from 'next-auth/react'

import type { ApiError } from '@/types/apps/clientsTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getPricesApiErrorMessage = (error: unknown, fallback = 'No se pudieron cargar los precios.') => {
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

export type PriceNight = {
  date: string
  price: number
  label: string
  source: 'rate' | 'room' | 'base'
  rateId: number | null
}

export type PriceRoomQuote = {
  id: number
  number: string
  nights: PriceNight[]
  total: number
}

export type PriceTypeQuote = {
  roomTypeId: number
  name: string
  nights: PriceNight[]
  total: number
  rooms: PriceRoomQuote[]
}

export type PriceQuote = {
  from: string
  to: string
  nights: number
  types: PriceTypeQuote[]
}

const request = async <T>(path: string): Promise<T> => {
  const session = await getSession()
  const accessToken = session?.accessToken

  const res = await fetch(`${getApiBase()}${path}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    }
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw (data as ApiError) ?? { message: ['Ocurrió un error.'], error: 'Error', statusCode: res.status }
  }

  return data as T
}

export const pricesApi = {
  quote: (propertyId: number, from: string, to: string) =>
    request<PriceQuote>(`/properties/${propertyId}/prices?from=${from}&to=${to}`)
}
