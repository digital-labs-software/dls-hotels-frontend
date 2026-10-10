import { getSession } from 'next-auth/react'

import type { ApiError } from '@/types/apps/clientsTypes'
import type {
  BalancesReport,
  CancellationsReport,
  CashClosingReport,
  GuestSheet,
  GuestSheetFloor,
  GuestSheetStay,
  HousekeepingReport,
  MonthlyStatsReport,
  MovementReport,
  OccupancyReport,
  SalesBySourceReport,
  SalesRegisterReport
} from '@/types/apps/reportTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getReportsApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
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

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

const resolveToken = async (token?: string) => {
  if (token) {
    return token
  }

  const session = await getSession()

  return session?.accessToken
}

const request = async <T>(path: string, token?: string): Promise<T> => {
  const accessToken = await resolveToken(token)

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

const normalizeStay = (stay: GuestSheetStay): GuestSheetStay => ({
  ...stay,
  pax: toNumber(stay.pax),
  guestNames: stay.guestNames ?? null,
  guests: Array.isArray(stay.guests) ? stay.guests : [],
  paymentMethods: Array.isArray(stay.paymentMethods) ? stay.paymentMethods : [],
  paymentMethodLabel: stay.paymentMethodLabel ?? null,
  observations: stay.observations ?? null
})

const normalizeFloor = (floor: GuestSheetFloor): GuestSheetFloor => ({
  ...floor,
  floorId: toNumber(floor.floorId),
  displayOrder: toNumber(floor.displayOrder),
  occupiedCount: toNumber(floor.occupiedCount),
  paxCount: toNumber(floor.paxCount),
  rooms: Array.isArray(floor.rooms)
    ? floor.rooms.map(room => ({
        ...room,
        id: toNumber(room.id),
        roomTypeId: toNumber(room.roomTypeId),
        stay: room.stay ? normalizeStay(room.stay) : null
      }))
    : []
})

const buildQuery = (params: Record<string, string | number | undefined | null>) => {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })

  const text = query.toString()

  return text ? `?${text}` : ''
}

const report = <T>(propertyId: number, name: string, params: Record<string, string | number | undefined | null> = {}) =>
  request<T>(`/properties/${propertyId}/reports/${name}${buildQuery(params)}`)

export const reportsApi = {
  arrivals: (propertyId: number, date?: string) => report<MovementReport>(propertyId, 'arrivals', { date }),
  departures: (propertyId: number, date?: string) => report<MovementReport>(propertyId, 'departures', { date }),
  housekeeping: (propertyId: number, date?: string) =>
    report<HousekeepingReport>(propertyId, 'housekeeping', { date }),
  cashClosing: (propertyId: number, date?: string, employeeId?: number | null) =>
    report<CashClosingReport>(propertyId, 'cash-closing', { date, employeeId }),
  salesRegister: (propertyId: number, from?: string, to?: string) =>
    report<SalesRegisterReport>(propertyId, 'sales-register', { from, to }),
  balances: (propertyId: number) => report<BalancesReport>(propertyId, 'balances'),
  occupancy: (propertyId: number, from?: string, to?: string) =>
    report<OccupancyReport>(propertyId, 'occupancy', { from, to }),
  monthlyStats: (propertyId: number, month?: string) =>
    report<MonthlyStatsReport>(propertyId, 'monthly-stats', { month }),
  salesBySource: (propertyId: number, from?: string, to?: string) =>
    report<SalesBySourceReport>(propertyId, 'sales-by-source', { from, to }),
  cancellations: (propertyId: number, from?: string, to?: string) =>
    report<CancellationsReport>(propertyId, 'cancellations', { from, to }),
  guestSheet: async (propertyId: number, date?: string, token?: string) => {
    const query = date ? `?date=${encodeURIComponent(date)}` : ''
    const payload = await request<GuestSheet>(`/properties/${propertyId}/reports/guest-sheet${query}`, token)

    return {
      date: payload?.date || date || '',
      hotelName: payload?.hotelName || 'Hotel',
      summary: {
        totalRooms: toNumber(payload?.summary?.totalRooms),
        occupiedRooms: toNumber(payload?.summary?.occupiedRooms),
        vacantRooms: toNumber(payload?.summary?.vacantRooms),
        pax: toNumber(payload?.summary?.pax),
        unassignedStays: toNumber(payload?.summary?.unassignedStays)
      },
      floors: Array.isArray(payload?.floors) ? payload.floors.map(normalizeFloor) : [],
      unassigned: Array.isArray(payload?.unassigned) ? payload.unassigned.map(normalizeStay) : []
    } satisfies GuestSheet
  }
}
