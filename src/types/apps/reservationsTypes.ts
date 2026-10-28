import type { StayStatus } from '@/types/apps/frontDeskTypes'

export type PlanningView = 'WEEK' | 'FORTNIGHT' | 'MONTH'

export type ReservationSource =
  | 'WALK_IN'
  | 'PHONE'
  | 'WHATSAPP'
  | 'WEB'
  | 'BOOKING'
  | 'AIRBNB'
  | 'EXPEDIA'
  | 'CORPORATE'
  | 'OTHER'

export type PaymentMethod = 'CASH' | 'CARD' | 'YAPE' | 'PLIN' | 'TRANSFER' | 'OTHER'

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING'

export interface PlanningMaintenance {
  uuid: string
  roomId: number
  startsOn: string
  endsOn: string
  reason: string
}

export interface PlanningRoom {
  id: number
  uuid: string
  number: string
  roomTypeId: number
  roomTypeName: string
  floorId: number
  floorName: string
  status: RoomStatus
}

export interface PlanningBooking {
  reservationRoomId: number
  reservationRoomUuid: string
  reservationId: number
  reservationUuid: string
  reservationCode: string
  source: ReservationSource
  status: StayStatus
  roomTypeId: number
  roomTypeName: string
  roomId: number | null
  roomNumber: string | null
  checkInDate: string
  checkOutDate: string
  nights: number
  adults: number
  children: number
  pricePerNight: number
  guestName: string | null
  companyName: string | null
  reservationBalance: number
  actualCheckInAt: string | null
  arrivalOverdue: boolean
  departureOverdue: boolean
}

export interface Planning {
  view: PlanningView | 'CUSTOM'
  today: string
  from: string
  to: string
  previousFrom: string
  nextFrom: string
  days: string[]
  rooms: PlanningRoom[]
  bookings: PlanningBooking[]
  maintenances: PlanningMaintenance[]
}

export interface AvailabilityRoom {
  id: number
  uuid: string
  number: string
  floorName: string
  status: RoomStatus
  effectivePrice: number
}

export interface AvailabilityRoomType {
  roomTypeId: number
  roomTypeName: string
  basePrice: number
  maxAdults: number
  maxChildren: number
  maxOccupancy: number | null
  fitsRequestedGuests: boolean | null
  totalRooms: number
  availableCount: number
  freeRooms: AvailabilityRoom[]
}

export interface Availability {
  checkInDate: string
  checkOutDate: string
  nights: number
  roomTypes: AvailabilityRoomType[]
}

export interface CreateReservationRoomBody {
  roomTypeId: number
  roomId?: number | null
  rateId?: number | null
  checkInDate: string
  checkOutDate: string
  adults?: number
  children?: number
  pricePerNight?: number | null
  guests?: { guestId: number; isPrimary?: boolean }[]
}

export interface CreateReservationBody {
  guestId?: number | null
  companyId?: number | null
  source?: ReservationSource
  externalCode?: string | null
  status?: 'PENDING' | 'CONFIRMED'
  discountAmount?: number
  notes?: string | null
  rooms: CreateReservationRoomBody[]
}

export type UpdateReservationBody = Partial<Omit<CreateReservationBody, 'rooms'>>

export type UpdateReservationRoomBody = Partial<Omit<CreateReservationRoomBody, 'guests'>> & {
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW'
}

export interface CreatePaymentBody {
  amount: number
  method: PaymentMethod
  reference?: string | null
  paidAt?: string
  notes?: string | null
  reservationRoomUuid?: string | null
}

export interface RoomFolio {
  uuid: string
  roomNumber: string | null
  holderName: string | null
  balance: number
  paid: number
}

export interface ReservationFolios {
  totalDue: number
  unassignedPaid: number
  rooms: RoomFolio[]
}

export interface ListReservationsQuery {
  page?: number
  limit?: number
  status?: StayStatus
  from?: string
  to?: string
  guestId?: number
  companyId?: number
  search?: string
}

/** «Jorge Pérez» → nombres y apellido. Con una sola palabra, el apellido queda pendiente. */
export const splitGuestName = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '—' }

  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

export type NewReservationPrefill = {
  roomId?: number | null
  roomTypeId?: number
  roomNumber?: string
  roomTypeName?: string
  checkInDate: string
  checkOutDate: string
  notes?: string
}

export type ReservationNote = {
  uuid: string
  stayDate: string
  text: string
  status: 'OPEN' | 'DONE'
  createdByName: string
  createdAt: string
  reservationUuid: string | null
}

export const PLANNING_VIEWS: { value: PlanningView; label: string }[] = [
  { value: 'WEEK', label: '7 días' },
  { value: 'FORTNIGHT', label: '15 días' },
  { value: 'MONTH', label: '1 mes' }
]

/** Ocupado rojo, reservado azul, pendiente ámbar, finalizada plomo, no se presentó púrpura. El texto va oscuro sobre fondos claros. */
export const BAR_COLORS: Record<StayStatus, { bg: string; text: string; dashed?: boolean }> = {
  CHECKED_IN: { bg: '#C62828', text: '#fff' },
  CONFIRMED: { bg: '#0D47A1', text: '#fff' },
  PENDING: { bg: '#FFF8E1', text: '#BF360C', dashed: true },
  CHECKED_OUT: { bg: '#455A64', text: '#fff' },
  NO_SHOW: { bg: '#6A1B9A', text: '#fff' },
  CANCELLED: { bg: '#ECEFF1', text: '#263238', dashed: true }
}

export const ROOM_STATE_COLORS = {
  AVAILABLE: { bg: '#43A047', text: '#fff' },
  CLEANING: { bg: '#16B1FF', text: '#fff' },
  MAINTENANCE: { bg: '#FFB400', text: '#3E2723' }
}

export const stayStatusChipSx = (status: StayStatus) => {
  const colors = BAR_COLORS[status]

  return {
    bgcolor: colors.bg,
    color: colors.text,
    border: colors.dashed ? `1px dashed ${colors.text}` : undefined
  }
}

export const BOOKING_STATUS_LABELS: Record<StayStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Reservado',
  CHECKED_IN: 'Ocupado',
  CHECKED_OUT: 'Finalizada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No se presentó'
}

export const SOURCE_LABELS: Record<ReservationSource, string> = {
  WALK_IN: 'Directo',
  PHONE: 'Teléfono',
  WHATSAPP: 'WhatsApp',
  WEB: 'Web',
  BOOKING: 'Booking',
  AIRBNB: 'Airbnb',
  EXPEDIA: 'Expedia',
  CORPORATE: 'Corporativo',
  OTHER: 'Otro'
}

export const SOURCE_OPTIONS = Object.entries(SOURCE_LABELS) as [ReservationSource, string][]

export const EXTERNAL_CODE_SOURCES: ReservationSource[] = ['BOOKING', 'AIRBNB', 'EXPEDIA', 'WEB']

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  YAPE: 'Yape',
  PLIN: 'Plin',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro'
}

export const PAYMENT_METHODS = ['YAPE', 'PLIN', 'CASH', 'TRANSFER', 'CARD', 'OTHER'] as const

const DAY = 86_400_000

const d = (s: string) => new Date(`${s}T00:00:00Z`).getTime()

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const addDays = (s: string, n: number) => {
  const start = d(s)

  if (!Number.isFinite(start)) {
    const fallback = d(todayISO())

    return new Date(fallback + n * DAY).toISOString().slice(0, 10)
  }

  return new Date(start + n * DAY).toISOString().slice(0, 10)
}

export const nightsBetween = (from: string, to: string) => {
  const start = d(from)
  const end = d(to)

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 1
  }

  return Math.max(1, Math.round((end - start) / DAY))
}

export function barLayout(b: PlanningBooking, from: string, to: string) {
  const start = Math.max(d(b.checkInDate), d(from))
  const endExclusive = Math.min(d(b.checkOutDate), d(to) + DAY)

  return {
    column: (start - d(from)) / DAY,
    span: Math.max(1, (endExclusive - start) / DAY),
    cutLeft: d(b.checkInDate) < d(from),
    cutRight: d(b.checkOutDate) > d(to) + DAY
  }
}

export function packLanes(items: PlanningBooking[]) {
  const lanes: PlanningBooking[][] = []

  for (const b of [...items].sort((x, y) => x.checkInDate.localeCompare(y.checkInDate))) {
    const lane = lanes.find(row => row[row.length - 1].checkOutDate <= b.checkInDate)

    if (lane) {
      lane.push(b)
    } else {
      lanes.push([b])
    }
  }

  return lanes
}

export function applyFilters(p: Planning, roomTypeId?: number, floorId?: number) {
  const rooms = p.rooms.filter(
    r => (!roomTypeId || r.roomTypeId === roomTypeId) && (!floorId || r.floorId === floorId)
  )

  const roomIds = new Set(rooms.map(r => r.id))

  const bookings = p.bookings.filter(b =>
    b.roomId === null ? (!roomTypeId || b.roomTypeId === roomTypeId) && !floorId : roomIds.has(b.roomId)
  )

  const maintenances = (p.maintenances ?? []).filter(item => roomIds.has(item.roomId))

  return { rooms, bookings, maintenances }
}

export function groupByType(rooms: PlanningRoom[]) {
  const map = new Map<number, { name: string; rooms: PlanningRoom[] }>()

  for (const r of rooms) {
    if (!map.has(r.roomTypeId)) {
      map.set(r.roomTypeId, { name: r.roomTypeName, rooms: [] })
    }

    map.get(r.roomTypeId)!.rooms.push(r)
  }

  return [...map.entries()].map(([id, g]) => ({ roomTypeId: id, ...g }))
}

export function dayStatus(
  room: PlanningRoom,
  bookings: PlanningBooking[],
  day: string,
  today: string,
  maintenances: PlanningMaintenance[] = []
) {
  const b = bookings.find(x => x.roomId === room.id && x.checkInDate <= day && day < x.checkOutDate)
  const block = maintenances.find(item => item.roomId === room.id && item.startsOn <= day && day < item.endsOn)

  if (b?.status && BAR_COLORS[b.status]) {
    const colors = BAR_COLORS[b.status]

    return {
      label: BOOKING_STATUS_LABELS[b.status],
      color: colors.bg,
      text: colors.text,
      booking: b,
      maintenance: undefined as PlanningMaintenance | undefined
    }
  }

  if (block) {
    return {
      label: 'Mantenimiento',
      color: ROOM_STATE_COLORS.MAINTENANCE.bg,
      text: ROOM_STATE_COLORS.MAINTENANCE.text,
      booking: undefined,
      maintenance: block
    }
  }

  if (day === today && room.status === 'CLEANING') {
    return {
      label: 'Limpieza',
      color: ROOM_STATE_COLORS.CLEANING.bg,
      text: ROOM_STATE_COLORS.CLEANING.text,
      booking: undefined,
      maintenance: undefined
    }
  }

  return {
    label: 'Disponible',
    color: ROOM_STATE_COLORS.AVAILABLE.bg,
    text: ROOM_STATE_COLORS.AVAILABLE.text,
    booking: undefined,
    maintenance: undefined
  }
}

export const arrivesToday = (b: PlanningBooking, day: string) => b.checkInDate === day
export const leavesToday = (b: PlanningBooking, day: string) => b.checkOutDate === day

export function weekdayLetter(date: string) {
  const letters = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

  return letters[new Date(`${date}T00:00:00Z`).getUTCDay()]
}

export function isWeekend(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()

  return day === 0 || day === 6
}

export function dayNumber(date: string) {
  return date.slice(8, 10).replace(/^0/, '') || date.slice(8, 10)
}

export function formatPlanningDate(value?: string | null) {
  if (!value) {
    return '—'
  }

  const [year, month, day] = value.slice(0, 10).split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}

export function formatPlanningHeading(date: string) {
  const parsed = new Date(`${date}T12:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export function formatPlanningShort(date: string) {
  const parsed = new Date(`${date}T12:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function bookingTitle(booking: PlanningBooking) {
  return booking.guestName || booking.companyName || booking.reservationCode
}

export function bookingShortTitle(booking: PlanningBooking) {
  const name = booking.guestName || booking.companyName

  if (!name) {
    return booking.reservationCode
  }

  const parts = name.trim().split(/\s+/)

  if (parts.length === 1) {
    return parts[0]
  }

  return parts[parts.length - 1]
}

export function bookingInitials(booking: PlanningBooking) {
  const name = booking.guestName || booking.companyName || booking.reservationCode
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function columnWidth(view: Planning['view']) {
  if (view === 'WEEK') {
    return 90
  }

  if (view === 'MONTH') {
    return 40
  }

  return 64
}

export function matchesSearch(booking: PlanningBooking, search: string) {
  if (!search.trim()) {
    return false
  }

  const needle = search
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

  const haystack = [booking.guestName, booking.companyName, booking.reservationCode, booking.roomNumber]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  return needle.split(/\s+/).every(part => haystack.includes(part))
}
