import { getSession } from 'next-auth/react'

import type { ApiError, Company, CreateCompanyInput, CreateGuestInput, Guest } from '@/types/apps/clientsTypes'
import type { PageMeta, Paginated } from '@/types/apps/pagination'
import type { Rate } from '@/types/apps/rateTypes'
import type { FrontDeskPayment, Reservation, ReservationGuest, ReservationRoom } from '@/types/apps/frontDeskTypes'
import type {
  Availability,
  AvailabilityRoomType,
  CreatePaymentBody,
  CreateReservationBody,
  CreateReservationRoomBody,
  ListReservationsQuery,
  Planning,
  PlanningView,
  UpdateReservationBody,
  UpdateReservationRoomBody
} from '@/types/apps/reservationsTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getReservationsApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
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

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const emptyToNull = (value?: string | null) => {
  if (value === undefined) {
    return undefined
  }

  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

const emptyMeta = (total = 0, limit = 20): PageMeta => ({
  page: 1,
  limit: total || limit,
  total,
  totalPages: total > 0 ? 1 : 0
})

const q = (params: Record<string, unknown>) =>
  new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString()

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

const normalizeBooking = (booking: Planning['bookings'][number]) => ({
  ...booking,
  reservationRoomId: toNumber(booking.reservationRoomId),
  reservationId: toNumber(booking.reservationId),
  roomTypeId: toNumber(booking.roomTypeId),
  roomId: toNullableNumber(booking.roomId),
  nights: toNumber(booking.nights),
  adults: toNumber(booking.adults),
  children: toNumber(booking.children),
  pricePerNight: toNumber(booking.pricePerNight),
  reservationBalance: toNumber(booking.reservationBalance),
  guestName: booking.guestName ?? null,
  companyName: booking.companyName ?? null,
  arrivalOverdue: Boolean(booking.arrivalOverdue),
  departureOverdue: Boolean(booking.departureOverdue)
})

const normalizePlanning = (payload: Planning): Planning => ({
  view: payload?.view ?? 'FORTNIGHT',
  today: payload?.today ?? '',
  from: payload?.from ?? '',
  to: payload?.to ?? '',
  previousFrom: payload?.previousFrom ?? '',
  nextFrom: payload?.nextFrom ?? '',
  days: Array.isArray(payload?.days) ? payload.days : [],
  rooms: Array.isArray(payload?.rooms)
    ? payload.rooms.map(room => ({
        ...room,
        id: toNumber(room.id),
        roomTypeId: toNumber(room.roomTypeId),
        floorId: toNumber(room.floorId)
      }))
    : [],
  bookings: Array.isArray(payload?.bookings) ? payload.bookings.map(normalizeBooking) : []
})

const normalizeReservation = (reservation: Reservation): Reservation => ({
  ...reservation,
  id: toNumber(reservation.id),
  propertyId: toNumber(reservation.propertyId),
  number: toNumber(reservation.number),
  totalAmount: toNumber(reservation.totalAmount),
  discountAmount: toNumber(reservation.discountAmount),
  paidAmount: toNumber(reservation.paidAmount),
  balance: toNumber(reservation.balance),
  rooms: Array.isArray(reservation.rooms)
    ? reservation.rooms.map(room => ({
        ...room,
        id: toNumber(room.id),
        roomTypeId: toNumber(room.roomTypeId),
        roomId: toNullableNumber(room.roomId),
        nights: toNumber(room.nights),
        pricePerNight: toNumber(room.pricePerNight),
        subtotal: toNumber(room.subtotal),
        adults: toNumber(room.adults),
        children: toNumber(room.children),
        guests: Array.isArray(room.guests) ? room.guests : []
      }))
    : []
})

const normalizePayment = (payment: FrontDeskPayment): FrontDeskPayment => ({
  ...payment,
  id: toNumber(payment.id),
  amount: toNumber(payment.amount),
  reference: payment.reference ?? null,
  notes: payment.notes ?? null
})

const normalizePage = <T>(payload: Paginated<T> | T[], map: (item: T) => T, limit = 20): Paginated<T> => {
  if (Array.isArray(payload)) {
    return { data: payload.map(map), meta: emptyMeta(payload.length, limit) }
  }

  const data = Array.isArray(payload?.data) ? payload.data.map(map) : []

  return {
    data,
    meta: payload?.meta ?? emptyMeta(data.length, limit)
  }
}

export const reservationsApi = {
  planning: async (propertyId: number, view: PlanningView, from?: string, token?: string) => {
    return normalizePlanning(
      await request<Planning>(`/properties/${propertyId}/planning?${q({ view, from })}`, {}, token)
    )
  },
  planningDay: async (propertyId: number, day: string, token?: string) => {
    return normalizePlanning(
      await request<Planning>(`/properties/${propertyId}/planning?${q({ from: day, to: day })}`, {}, token)
    )
  },
  availability: async (
    propertyId: number,
    params: { checkInDate: string; checkOutDate: string; adults?: number; children?: number },
    token?: string
  ) => {
    const payload = await request<Availability | { data?: AvailabilityRoomType[] }>(
      `/properties/${propertyId}/availability?${q(params)}`,
      {},
      token
    )

    const roomTypes = Array.isArray((payload as Availability)?.roomTypes)
      ? (payload as Availability).roomTypes
      : Array.isArray((payload as { data?: AvailabilityRoomType[] }).data)
        ? (payload as { data: AvailabilityRoomType[] }).data
        : []

    return {
      checkInDate: (payload as Availability).checkInDate ?? params.checkInDate,
      checkOutDate: (payload as Availability).checkOutDate ?? params.checkOutDate,
      nights: toNumber((payload as Availability).nights, 1),
      roomTypes: roomTypes.map(type => ({
        ...type,
        roomTypeId: toNumber(type.roomTypeId || (type as AvailabilityRoomType & { id?: number }).id),
        roomTypeName: type.roomTypeName || (type as AvailabilityRoomType & { name?: string }).name || '',
        basePrice: toNumber(type.basePrice),
        maxAdults: toNumber(type.maxAdults),
        maxChildren: toNumber(type.maxChildren),
        availableCount: toNumber(type.availableCount),
        totalRooms: toNumber(type.totalRooms),
        freeRooms: Array.isArray(type.freeRooms)
          ? type.freeRooms.map(room => ({
              ...room,
              id: toNumber(room.id),
              effectivePrice: toNumber(room.effectivePrice)
            }))
          : []
      }))
    } satisfies Availability
  },
  rates: async (propertyId: number, roomTypeId: number, token?: string) => {
    return normalizePage(
      await request<Paginated<Rate> | Rate[]>(
        `/properties/${propertyId}/rates?${q({ roomTypeId, isActive: true, limit: 100 })}`,
        {},
        token
      ),
      rate => ({
        ...rate,
        id: toNumber(rate.id),
        price: toNumber(rate.price),
        validFrom: rate.validFrom ?? null,
        validTo: rate.validTo ?? null
      })
    )
  },
  searchGuests: async (propertyId: number, search: string, limit = 10, token?: string) => {
    return normalizePage(
      await request<Paginated<Guest> | Guest[]>(
        `/properties/${propertyId}/guests?${q({ search, limit })}`,
        {},
        token
      ),
      guest => guest,
      limit
    )
  },
  createGuest: async (propertyId: number, body: CreateGuestInput, token?: string) => {
    return request<Guest>(`/properties/${propertyId}/guests`, { method: 'POST', body: JSON.stringify(body) }, token)
  },
  searchCompanies: async (propertyId: number, search: string, limit = 10, token?: string) => {
    return normalizePage(
      await request<Paginated<Company> | Company[]>(
        `/properties/${propertyId}/companies?${q({ search, limit })}`,
        {},
        token
      ),
      company => company,
      limit
    )
  },
  createCompany: async (propertyId: number, body: CreateCompanyInput, token?: string) => {
    return request<Company>(`/properties/${propertyId}/companies`, { method: 'POST', body: JSON.stringify(body) }, token)
  },
  list: async (propertyId: number, params: ListReservationsQuery = {}, token?: string) => {
    return normalizePage(
      await request<Paginated<Reservation> | Reservation[]>(
        `/properties/${propertyId}/reservations?${q({ page: 1, limit: 20, ...params })}`,
        {},
        token
      ),
      normalizeReservation,
      params.limit ?? 20
    )
  },
  create: async (propertyId: number, body: CreateReservationBody, token?: string) => {
    return normalizeReservation(
      await request<Reservation>(
        `/properties/${propertyId}/reservations`,
        { method: 'POST', body: JSON.stringify(body) },
        token
      )
    )
  },
  get: async (propertyId: number, uuid: string, token?: string) => {
    return normalizeReservation(await request<Reservation>(`/properties/${propertyId}/reservations/${uuid}`, {}, token))
  },
  update: async (propertyId: number, uuid: string, body: UpdateReservationBody, token?: string) => {
    return normalizeReservation(
      await request<Reservation>(
        `/properties/${propertyId}/reservations/${uuid}`,
        { method: 'PATCH', body: JSON.stringify(body) },
        token
      )
    )
  },
  cancel: async (propertyId: number, uuid: string, reason: string, token?: string) => {
    return normalizeReservation(
      await request<Reservation>(
        `/properties/${propertyId}/reservations/${uuid}/cancel`,
        { method: 'POST', body: JSON.stringify({ reason }) },
        token
      )
    )
  },
  addRoom: async (propertyId: number, uuid: string, body: CreateReservationRoomBody, token?: string) => {
    return request<ReservationRoom>(
      `/properties/${propertyId}/reservations/${uuid}/rooms`,
      { method: 'POST', body: JSON.stringify(body) },
      token
    )
  },
  updateRoom: async (
    propertyId: number,
    uuid: string,
    lineUuid: string,
    body: UpdateReservationRoomBody,
    token?: string
  ) => {
    return request<ReservationRoom>(
      `/properties/${propertyId}/reservations/${uuid}/rooms/${lineUuid}`,
      { method: 'PATCH', body: JSON.stringify(body) },
      token
    )
  },
  removeRoom: async (propertyId: number, uuid: string, lineUuid: string, token?: string) => {
    return request(
      `/properties/${propertyId}/reservations/${uuid}/rooms/${lineUuid}`,
      { method: 'DELETE' },
      token
    )
  },
  checkIn: async (propertyId: number, uuid: string, lineUuid: string, token?: string) => {
    return request<ReservationRoom>(
      `/properties/${propertyId}/reservations/${uuid}/rooms/${lineUuid}/check-in`,
      { method: 'POST', body: JSON.stringify({}) },
      token
    )
  },
  checkOut: async (propertyId: number, uuid: string, lineUuid: string, token?: string) => {
    return request<ReservationRoom>(
      `/properties/${propertyId}/reservations/${uuid}/rooms/${lineUuid}/check-out`,
      { method: 'POST', body: JSON.stringify({}) },
      token
    )
  },
  roomGuests: async (propertyId: number, lineUuid: string, token?: string) => {
    const payload = await request<ReservationGuest[] | Paginated<ReservationGuest>>(
      `/properties/${propertyId}/reservation-rooms/${lineUuid}/guests`,
      {},
      token
    )

    return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
  },
  addRoomGuest: async (propertyId: number, lineUuid: string, guestId: number, isPrimary = false, token?: string) => {
    return request<ReservationGuest>(
      `/properties/${propertyId}/reservation-rooms/${lineUuid}/guests`,
      { method: 'POST', body: JSON.stringify({ guestId, isPrimary }) },
      token
    )
  },
  setPrimaryGuest: async (propertyId: number, lineUuid: string, id: number, token?: string) => {
    return request<ReservationGuest>(
      `/properties/${propertyId}/reservation-rooms/${lineUuid}/guests/${id}`,
      { method: 'PATCH', body: JSON.stringify({ isPrimary: true }) },
      token
    )
  },
  removeRoomGuest: async (propertyId: number, lineUuid: string, id: number, token?: string) => {
    return request(
      `/properties/${propertyId}/reservation-rooms/${lineUuid}/guests/${id}`,
      { method: 'DELETE' },
      token
    )
  },
  payments: async (propertyId: number, uuid: string, token?: string) => {
    const payload = await request<FrontDeskPayment[] | Paginated<FrontDeskPayment>>(
      `/properties/${propertyId}/reservations/${uuid}/payments`,
      {},
      token
    )
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []

    return rows.map(normalizePayment)
  },
  addPayment: async (propertyId: number, uuid: string, body: CreatePaymentBody, token?: string) => {
    return normalizePayment(
      await request<FrontDeskPayment>(
        `/properties/${propertyId}/reservations/${uuid}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: Number(body.amount),
            method: body.method,
            reference: emptyToNull(body.reference) ?? null,
            notes: emptyToNull(body.notes) ?? null
          })
        },
        token
      )
    )
  }
}
