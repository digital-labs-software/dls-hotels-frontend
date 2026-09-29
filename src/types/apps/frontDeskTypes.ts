export type RackStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE'

export type RoomPhysicalStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE'

export type StayStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW'

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

export const PAYMENT_METHODS = ['CASH', 'CARD', 'YAPE', 'PLIN', 'TRANSFER', 'OTHER'] as const

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  YAPE: 'Yape',
  PLIN: 'Plin',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro'
}

export const RACK_STATUS_LABELS: Record<RackStatus, string> = {
  AVAILABLE: 'Libre',
  OCCUPIED: 'Ocupada',
  CLEANING: 'Limpieza',
  MAINTENANCE: 'Mantenimiento'
}

export const STAY_STATUS_LABELS: Record<StayStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CHECKED_IN: 'En casa',
  CHECKED_OUT: 'Check-out',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No se presentó'
}

export const RESERVATION_SOURCE_LABELS: Record<ReservationSource, string> = {
  WALK_IN: 'Walk-in',
  PHONE: 'Teléfono',
  WHATSAPP: 'WhatsApp',
  WEB: 'Web',
  BOOKING: 'Booking',
  AIRBNB: 'Airbnb',
  EXPEDIA: 'Expedia',
  CORPORATE: 'Corporativo',
  OTHER: 'Otro'
}

export interface Stay {
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

export interface RackRoom {
  id: number
  uuid: string
  number: string
  roomTypeId: number
  roomTypeName: string
  effectivePrice: number
  photoUrl: string | null
  notes: string | null
  status: RoomPhysicalStatus
  displayStatus: RackStatus
  currentStay: Stay | null
  arrival: Stay | null
  departureDue: boolean
}

export interface FrontDeskFloor {
  floorId: number
  floorName: string
  displayOrder: number
  rooms: RackRoom[]
}

export interface FrontDeskSummary {
  totalRooms: number
  available: number
  occupied: number
  cleaning: number
  maintenance: number
  arrivals: number
  departures: number
  inHouse: number
}

export interface FrontDesk {
  date: string
  summary: FrontDeskSummary
  floors: FrontDeskFloor[]
  arrivals: Stay[]
  departures: Stay[]
  inHouse: Stay[]
}

export interface WalkInGuest {
  guestId?: number
  documentType?: string | null
  documentNumber?: string | null
  firstName?: string
  lastName?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  birthDate?: string | null
  notes?: string | null
}

export interface WalkInPayload {
  roomId: number
  checkOutDate: string
  adults?: number
  children?: number
  rateId?: number | null
  pricePerNight?: number | null
  holder: WalkInGuest
  companions?: WalkInGuest[]
  companyId?: number | null
  notes?: string | null
  actualCheckInAt?: string
  payment?: { amount: number; method: PaymentMethod; reference?: string | null; notes?: string | null }
}

export interface ReservationGuest {
  id: number
  reservationRoomId: number
  guestId: number
  guestUuid: string
  isPrimary: boolean
  firstName: string
  lastName: string
  documentType: string | null
  documentNumber: string | null
  createdAt: string
}

export interface ReservationRoom {
  id: number
  uuid: string
  reservationId: number
  roomTypeId: number
  roomTypeName: string
  roomId: number | null
  roomNumber: string | null
  rateId: number | null
  rateName: string | null
  status: StayStatus
  checkInDate: string
  checkOutDate: string
  nights: number
  pricePerNight: number
  subtotal: number
  adults: number
  children: number
  actualCheckInAt: string | null
  actualCheckOutAt: string | null
  guests: ReservationGuest[]
  createdAt: string
  updatedAt: string
}

export interface Reservation {
  id: number
  uuid: string
  propertyId: number
  number: number
  code: string
  guestId: number | null
  guest: {
    id: number
    uuid: string
    firstName: string
    lastName: string
    documentType: string | null
    documentNumber: string | null
  } | null
  companyId: number | null
  company: { id: number; uuid: string; businessName: string; taxNumber: string | null } | null
  source: ReservationSource
  externalCode: string | null
  status: StayStatus
  checkInDate: string
  checkOutDate: string
  nights: number
  totalAmount: number
  discountAmount: number
  paidAmount: number
  balance: number
  notes: string | null
  cancelReason: string | null
  cancelledAt: string | null
  cancelledById: number | null
  createdById: number | null
  rooms: ReservationRoom[]
  createdAt: string
  updatedAt: string
}

export interface FrontDeskPayment {
  id: number
  uuid: string
  propertyId: number
  reservationId: number
  reservationUuid: string
  reservationCode: string
  amount: number
  method: PaymentMethod
  reference: string | null
  paidAt: string
  employeeId: number | null
  notes: string | null
  createdAt: string
}

export type ListPaymentsQuery = {
  from?: string
  to?: string
  method?: PaymentMethod
  reservationId?: number
  page?: number
  limit?: number
}

export type BalanceTone = 'paid' | 'due' | 'credit'

export const limaToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

export const formatPaidAt = (value?: string | null) => {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('es-PE', { timeZone: 'America/Lima' })
}

export const reservationBalanceTone = (balance: number): BalanceTone => {
  if (balance === 0) {
    return 'paid'
  }

  if (balance > 0) {
    return 'due'
  }

  return 'credit'
}

export interface AvailabilityFreeRoom {
  id: number
  uuid?: string
  number: string
}

export interface AvailabilityRoomType {
  id: number
  name?: string
  roomTypeName?: string
  fitsRequestedGuests?: boolean
  freeRooms: AvailabilityFreeRoom[]
}

export const formatFrontDeskDate = (value?: string | null) => {
  if (!value) {
    return '—'
  }

  const [year, month, day] = value.slice(0, 10).split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}

export const formatFrontDeskHeading = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return `Recepción · ${date}`
  }

  const weekday = parsed.toLocaleDateString('es-PE', { weekday: 'long' })
  const formatted = parsed.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return `Recepción · ${weekday} ${formatted}`
}

export const nightsBetween = (from: string, to: string) => {
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)

  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
}

export const addDays = (date: string, days: number) => {
  const next = new Date(`${date}T00:00:00`)

  next.setDate(next.getDate() + days)

  return next.toISOString().slice(0, 10)
}

export const normalizeSearchText = (value: string) => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export const guestFullName = (firstName?: string | null, lastName?: string | null) => {
  return [firstName, lastName].filter(Boolean).join(' ').trim()
}
