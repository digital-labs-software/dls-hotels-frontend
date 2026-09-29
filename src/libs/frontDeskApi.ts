import { getSession } from 'next-auth/react'

import type { ApiError, Guest } from '@/types/apps/clientsTypes'
import type { PageMeta, Paginated } from '@/types/apps/pagination'
import type {
  AvailabilityFreeRoom,
  AvailabilityRoomType,
  FrontDesk,
  FrontDeskPayment,
  PaymentMethod,
  RackStatus,
  Reservation,
  ReservationGuest,
  ReservationRoom,
  Stay,
  WalkInPayload
} from '@/types/apps/frontDeskTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getFrontDeskApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
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

const normalizeStay = (stay: Stay): Stay => ({
  ...stay,
  reservationRoomId: toNumber(stay.reservationRoomId),
  reservationId: toNumber(stay.reservationId),
  roomTypeId: toNumber(stay.roomTypeId),
  roomId: toNullableNumber(stay.roomId),
  nights: toNumber(stay.nights),
  adults: toNumber(stay.adults),
  children: toNumber(stay.children),
  pricePerNight: toNumber(stay.pricePerNight),
  guestName: stay.guestName ?? null,
  companyName: stay.companyName ?? null,
  reservationBalance: toNumber(stay.reservationBalance),
  actualCheckInAt: stay.actualCheckInAt ?? null,
  arrivalOverdue: Boolean(stay.arrivalOverdue),
  departureOverdue: Boolean(stay.departureOverdue)
})

const normalizeRoom = (room: FrontDesk['floors'][number]['rooms'][number]) => ({
  ...room,
  id: toNumber(room.id),
  roomTypeId: toNumber(room.roomTypeId),
  effectivePrice: toNumber(room.effectivePrice),
  photoUrl: room.photoUrl ?? null,
  notes: room.notes ?? null,
  currentStay: room.currentStay ? normalizeStay(room.currentStay) : null,
  arrival: room.arrival ? normalizeStay(room.arrival) : null,
  departureDue: Boolean(room.departureDue)
})

const emptySummary = (): FrontDesk['summary'] => ({
  totalRooms: 0,
  available: 0,
  occupied: 0,
  cleaning: 0,
  maintenance: 0,
  arrivals: 0,
  departures: 0,
  inHouse: 0
})

const normalizeFrontDesk = (payload: FrontDesk): FrontDesk => ({
  date: payload?.date || new Date().toISOString().slice(0, 10),
  summary: { ...emptySummary(), ...(payload?.summary ?? {}) },
  floors: Array.isArray(payload?.floors)
    ? payload.floors
        .map(floor => ({
          ...floor,
          floorId: toNumber(floor.floorId),
          displayOrder: toNumber(floor.displayOrder),
          rooms: Array.isArray(floor.rooms) ? floor.rooms.map(normalizeRoom) : []
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder)
    : [],
  arrivals: Array.isArray(payload?.arrivals) ? payload.arrivals.map(normalizeStay) : [],
  departures: Array.isArray(payload?.departures) ? payload.departures.map(normalizeStay) : [],
  inHouse: Array.isArray(payload?.inHouse) ? payload.inHouse.map(normalizeStay) : []
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
  rooms: Array.isArray(reservation.rooms) ? reservation.rooms : []
})

const normalizePayment = (payment: FrontDeskPayment): FrontDeskPayment => ({
  ...payment,
  id: toNumber(payment.id),
  amount: toNumber(payment.amount),
  reference: payment.reference ?? null,
  notes: payment.notes ?? null
})

const emptyMeta = (total = 0): PageMeta => ({
  page: 1,
  limit: total || 5,
  total,
  totalPages: total > 0 ? 1 : 0
})

const toWalkInPayload = (body: WalkInPayload) => {
  const payload: WalkInPayload = {
    roomId: Number(body.roomId),
    checkOutDate: body.checkOutDate,
    holder: body.holder
  }

  if (body.adults !== undefined) payload.adults = Number(body.adults)
  if (body.children !== undefined) payload.children = Number(body.children)
  if (body.rateId !== undefined) payload.rateId = body.rateId
  if (body.pricePerNight !== undefined) payload.pricePerNight = body.pricePerNight
  if (body.companions !== undefined) payload.companions = body.companions
  if (body.companyId !== undefined) payload.companyId = body.companyId
  if (body.notes !== undefined) payload.notes = emptyToNull(body.notes) ?? null
  if (body.payment) payload.payment = body.payment

  return payload
}

export const frontDeskApi = {
  overview: async (propertyId: number, token?: string) => {
    return normalizeFrontDesk(await request<FrontDesk>(`/properties/${propertyId}/front-desk`, {}, token))
  },
  walkIn: async (propertyId: number, body: WalkInPayload, token?: string) => {
    return normalizeReservation(
      await request<Reservation>(
        `/properties/${propertyId}/front-desk/walk-in`,
        { method: 'POST', body: JSON.stringify(toWalkInPayload(body)) },
        token
      )
    )
  },
  searchGuests: async (propertyId: number, search: string, limit = 5, token?: string) => {
    const query = new URLSearchParams({ search, limit: String(limit) })
    const payload = await request<Paginated<Guest> | Guest[]>(
      `/properties/${propertyId}/guests?${query.toString()}`,
      {},
      token
    )

    if (Array.isArray(payload)) {
      return { data: payload, meta: emptyMeta(payload.length) }
    }

    return {
      data: Array.isArray(payload?.data) ? payload.data : [],
      meta: payload?.meta ?? emptyMeta(payload?.data?.length ?? 0)
    }
  },
  availability: async (
    propertyId: number,
    params: { checkInDate: string; checkOutDate: string; adults?: number; children?: number; roomTypeId?: number },
    token?: string
  ) => {
    const query = new URLSearchParams({
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate
    })

    if (params.adults !== undefined) query.set('adults', String(params.adults))
    if (params.children !== undefined) query.set('children', String(params.children))
    if (params.roomTypeId !== undefined) query.set('roomTypeId', String(params.roomTypeId))

    const payload = await request<{ roomTypes?: AvailabilityRoomType[]; data?: AvailabilityRoomType[] }>(
      `/properties/${propertyId}/availability?${query.toString()}`,
      {},
      token
    )

    const roomTypes = Array.isArray(payload?.roomTypes)
      ? payload.roomTypes
      : Array.isArray(payload?.data)
        ? payload.data
        : []

    return roomTypes.map(type => ({
      ...type,
      id: toNumber(type.id),
      freeRooms: Array.isArray(type.freeRooms)
        ? type.freeRooms.map(
            (room: AvailabilityFreeRoom): AvailabilityFreeRoom => ({
              ...room,
              id: toNumber(room.id)
            })
          )
        : []
    }))
  },
  reservation: async (propertyId: number, reservationUuid: string, token?: string) => {
    return normalizeReservation(
      await request<Reservation>(`/properties/${propertyId}/reservations/${reservationUuid}`, {}, token)
    )
  },
  payments: async (propertyId: number, reservationUuid: string, token?: string) => {
    const payload = await request<FrontDeskPayment[] | Paginated<FrontDeskPayment>>(
      `/properties/${propertyId}/reservations/${reservationUuid}/payments`,
      {},
      token
    )

    const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []

    return rows.map(normalizePayment)
  },
  pay: async (
    propertyId: number,
    reservationUuid: string,
    body: { amount: number; method: PaymentMethod; reference?: string | null; notes?: string | null },
    token?: string
  ) => {
    return normalizePayment(
      await request<FrontDeskPayment>(
        `/properties/${propertyId}/reservations/${reservationUuid}/payments`,
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
  },
  checkIn: async (propertyId: number, reservationUuid: string, lineUuid: string, token?: string) => {
    return request<ReservationRoom>(
      `/properties/${propertyId}/reservations/${reservationUuid}/rooms/${lineUuid}/check-in`,
      { method: 'POST', body: JSON.stringify({}) },
      token
    )
  },
  checkOut: async (propertyId: number, reservationUuid: string, lineUuid: string, token?: string) => {
    return request<ReservationRoom>(
      `/properties/${propertyId}/reservations/${reservationUuid}/rooms/${lineUuid}/check-out`,
      { method: 'POST', body: JSON.stringify({}) },
      token
    )
  },
  patchRoomLine: async (
    propertyId: number,
    reservationUuid: string,
    lineUuid: string,
    body: Record<string, unknown>,
    token?: string
  ) => {
    return request<ReservationRoom>(
      `/properties/${propertyId}/reservations/${reservationUuid}/rooms/${lineUuid}`,
      { method: 'PATCH', body: JSON.stringify(body) },
      token
    )
  },
  listLineGuests: async (propertyId: number, lineUuid: string, token?: string) => {
    const payload = await request<ReservationGuest[] | Paginated<ReservationGuest>>(
      `/properties/${propertyId}/reservation-rooms/${lineUuid}/guests`,
      {},
      token
    )

    return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
  },
  addLineGuest: async (
    propertyId: number,
    lineUuid: string,
    body: { guestId: number; isPrimary?: boolean },
    token?: string
  ) => {
    return request<ReservationGuest>(
      `/properties/${propertyId}/reservation-rooms/${lineUuid}/guests`,
      { method: 'POST', body: JSON.stringify(body) },
      token
    )
  },
  patchLineGuest: async (
    propertyId: number,
    lineUuid: string,
    guestRecordId: number,
    body: { isPrimary?: boolean },
    token?: string
  ) => {
    return request<ReservationGuest>(
      `/properties/${propertyId}/reservation-rooms/${lineUuid}/guests/${guestRecordId}`,
      { method: 'PATCH', body: JSON.stringify(body) },
      token
    )
  },
  removeLineGuest: async (propertyId: number, lineUuid: string, guestRecordId: number, token?: string) => {
    return request<ReservationGuest>(
      `/properties/${propertyId}/reservation-rooms/${lineUuid}/guests/${guestRecordId}`,
      { method: 'DELETE' },
      token
    )
  },
  setRoomStatus: async (
    propertyId: number,
    roomUuid: string,
    status: Extract<RackStatus, 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE'>,
    notes?: string | null,
    token?: string
  ) => {
    const body: { status: string; notes?: string | null } = { status }

    if (notes !== undefined) {
      body.notes = emptyToNull(notes) ?? null
    }

    return request(`/properties/${propertyId}/rooms/${roomUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }, token)
  }
}
