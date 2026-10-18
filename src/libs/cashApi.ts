import { getSession } from 'next-auth/react'

import type { ApiError } from '@/types/apps/clientsTypes'
import type { PaymentMethod } from '@/types/apps/frontDeskTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getCashApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
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

export type CashSessionStatus = 'OPEN' | 'CLOSED'

export type CashMethodTotal = {
  method: PaymentMethod
  net: number
}

export type CashierOption = {
  uuid: string
  name: string
}

export type CashPaymentLine = {
  uuid: string
  paidAt: string
  method: PaymentMethod
  amount: number
  reference: string | null
  reservationCode: string
  holderName: string
  employeeName: string
}

export type CashExpenseLine = {
  uuid: string
  spentAt: string
  amount: number
  notes: string
  employeeName: string
}

export type CashReinforcementLine = {
  uuid: string
  receivedAt: string
  amount: number
  notes: string
  employeeName: string
}

export type CashSession = {
  uuid: string
  number: string
  status: CashSessionStatus
  openingAmount: number
  openedAt: string
  closedAt: string | null
  cashier: { name: string }
  openedBy: { name: string }
  closedBy: { name: string } | null
  cashCharges: number
  cashRefunds: number
  reinforcementTotal: number
  expenseTotal: number
  cashExpected: number
  countedCash: number | null
  difference: number | null
  byMethod: CashMethodTotal[]
  notes: string | null
}

export type CashSessionDetail = CashSession & {
  payments: CashPaymentLine[]
  reinforcements: CashReinforcementLine[]
  expenses: CashExpenseLine[]
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const session = await getSession()
  const accessToken = session?.accessToken

  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers
    }
  })

  if (res.status === 204) {
    return null as T
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw (data as ApiError) ?? { message: ['Ocurrió un error.'], error: 'Error', statusCode: res.status }
  }

  return data as T
}

const base = (propertyId: number) => `/properties/${propertyId}/cash-sessions`

export const cashApi = {
  current: (propertyId: number) => request<CashSessionDetail | null>(`${base(propertyId)}/current`),
  cashiers: (propertyId: number) => request<CashierOption[]>(`${base(propertyId)}/cashiers`),
  list: (propertyId: number) => request<CashSession[]>(base(propertyId)),
  findOne: (propertyId: number, uuid: string) => request<CashSessionDetail>(`${base(propertyId)}/${uuid}`),
  open: (propertyId: number, body: { openingAmount: number; cashierUuid?: string; notes?: string }) =>
    request<CashSessionDetail>(base(propertyId), { method: 'POST', body: JSON.stringify(body) }),
  addExpense: (propertyId: number, uuid: string, body: { amount: number; notes: string }) =>
    request<CashSessionDetail>(`${base(propertyId)}/${uuid}/expenses`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  removeExpense: (propertyId: number, uuid: string, expenseUuid: string, reason: string) =>
    request<CashSessionDetail>(`${base(propertyId)}/${uuid}/expenses/${expenseUuid}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason })
    }),
  addReinforcement: (propertyId: number, uuid: string, body: { amount: number; notes: string }) =>
    request<CashSessionDetail>(`${base(propertyId)}/${uuid}/reinforcements`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  removeReinforcement: (propertyId: number, uuid: string, reinforcementUuid: string, reason: string) =>
    request<CashSessionDetail>(`${base(propertyId)}/${uuid}/reinforcements/${reinforcementUuid}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason })
    }),
  close: (propertyId: number, uuid: string, body: { countedCash: number; notes?: string }) =>
    request<CashSessionDetail>(`${base(propertyId)}/${uuid}/close`, {
      method: 'POST',
      body: JSON.stringify(body)
    })
}
