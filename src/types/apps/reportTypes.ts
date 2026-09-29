import type { DocumentType } from '@/types/apps/clientsTypes'
import type { PaymentMethod } from '@/types/apps/frontDeskTypes'

export interface GuestSheetPerson {
  guestId: number
  guestUuid: string
  isPrimary: boolean
  fullName: string
  age: number | null
  nationality: string | null
  documentType: DocumentType | null
  documentNumber: string | null
}

export interface GuestSheetStay {
  reservationId: number
  reservationUuid: string
  reservationCode: string
  reservationRoomId: number
  reservationRoomUuid: string
  status: string
  agencyOrParticular: string
  companyType: string | null
  pax: number
  guestNames: string | null
  guests: GuestSheetPerson[]
  checkInDate: string
  checkOutDate: string
  paymentMethods: PaymentMethod[]
  paymentMethodLabel: string | null
  observations: string | null
}

export interface GuestSheetRoom {
  id: number
  uuid: string
  number: string
  roomTypeId: number
  roomTypeName: string
  stay: GuestSheetStay | null
}

export interface GuestSheetFloor {
  floorId: number
  floorName: string
  displayOrder: number
  occupiedCount: number
  paxCount: number
  rooms: GuestSheetRoom[]
}

export interface GuestSheetSummary {
  totalRooms: number
  occupiedRooms: number
  vacantRooms: number
  pax: number
  unassignedStays: number
}

export interface GuestSheet {
  date: string
  hotelName: string
  summary: GuestSheetSummary
  floors: GuestSheetFloor[]
  unassigned: GuestSheetStay[]
}
