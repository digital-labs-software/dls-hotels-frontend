import type { CompanyType, DocumentType } from '@/types/apps/clientsTypes'
import type { EinvoiceDocumentType, EinvoiceStatus } from '@/types/apps/einvoiceTypes'
import type { PaymentMethod, ReservationSource, RoomPhysicalStatus, StayStatus } from '@/types/apps/frontDeskTypes'

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

export interface MovementLine {
  reservationRoomUuid: string
  status: StayStatus
  roomNumber: string | null
  floorName: string | null
  roomStatus: RoomPhysicalStatus | null
  roomTypeName: string
  adults: number
  children: number
  guestNames: string | null
  primaryDocument: string | null
  hasPrimaryGuest: boolean
  checkInDate: string
  checkOutDate: string
  nights: number
  actualCheckInAt: string | null
  actualCheckOutAt: string | null
  overdue: boolean
}

export interface MovementGroup {
  reservationUuid: string
  reservationCode: string
  holderName: string
  holderPhone: string | null
  companyName: string | null
  companyType: CompanyType | null
  source: ReservationSource
  externalCode: string | null
  notes: string | null
  totalAmount: number
  paidAmount: number
  balance: number
  lines: MovementLine[]
}

export interface MovementReport {
  date: string
  hotelName: string
  summary: {
    reservations: number
    rooms: number
    pax: number
    done: number
    pending: number
    unassigned: number
    withBalance: number
    balanceDue: number
  }
  groups: MovementGroup[]
}

export type HousekeepingTask = 'DEPARTURE' | 'TURNOVER' | 'STAYOVER' | 'ARRIVAL' | 'DIRTY' | 'MAINTENANCE' | 'VACANT'

export interface HousekeepingRoom {
  roomId: number
  roomNumber: string
  roomTypeName: string
  roomStatus: RoomPhysicalStatus
  task: HousekeepingTask
  guestName: string | null
  pax: number
  arrivingGuestName: string | null
  arrivingPax: number
  checkOutDate: string | null
  notes: string | null
}

export interface HousekeepingReport {
  date: string
  hotelName: string
  summary: {
    departures: number
    stayovers: number
    arrivals: number
    dirty: number
    maintenance: number
    vacant: number
    totalRooms: number
  }
  floors: { floorName: string; rooms: HousekeepingRoom[] }[]
}

export interface CashMethodTotal {
  method: PaymentMethod
  count: number
  charges: number
  refunds: number
  net: number
}

export interface CashEmployeeTotal {
  employeeId: number | null
  employeeName: string
  count: number
  net: number
  cash: number
}

export interface CashPayment {
  uuid: string
  paidAt: string
  method: PaymentMethod
  amount: number
  reference: string | null
  reservationUuid: string
  reservationCode: string
  holderName: string
  roomNumbers: string | null
  employeeName: string
  notes: string | null
}

export interface CashClosingReport {
  date: string
  hotelName: string
  employeeId: number | null
  employeeName: string | null
  summary: { count: number; charges: number; refunds: number; net: number; cashExpected: number }
  byMethod: CashMethodTotal[]
  byEmployee: CashEmployeeTotal[]
  payments: CashPayment[]
}

export interface SalesRegisterItem {
  uuid: string
  issueDate: string
  documentType: EinvoiceDocumentType
  sunatTypeCode: string
  series: string
  number: number
  status: EinvoiceStatus
  customerDocType: DocumentType | null
  customerDocCode: string
  customerDocNumber: string | null
  customerName: string
  currency: 'PEN' | 'USD'
  exchangeRate: number | null
  totalTaxed: number
  totalExonerated: number
  totalUnaffected: number
  totalIgv: number
  total: number
  referenceDate: string | null
  referenceTypeCode: string | null
  referenceNumber: string | null
  reservationCode: string | null
}

export interface SalesRegisterReport {
  from: string
  to: string
  hotelName: string
  taxNumber: string | null
  businessName: string | null
  summary: {
    count: number
    pendingSunat: number
    voided: number
    totalTaxed: number
    totalExonerated: number
    totalUnaffected: number
    totalIgv: number
    total: number
  }
  byType: { documentType: EinvoiceDocumentType; count: number; total: number }[]
  items: SalesRegisterItem[]
}

export type BalanceStage = 'DEPARTED' | 'IN_HOUSE' | 'UPCOMING'

export interface BalanceItem {
  reservationUuid: string
  reservationCode: string
  holderName: string
  phone: string | null
  companyName: string | null
  companyType: CompanyType | null
  status: StayStatus
  stage: BalanceStage
  checkInDate: string
  checkOutDate: string
  roomNumbers: string | null
  totalAmount: number
  paidAmount: number
  balance: number
  lastPaymentAt: string | null
  daysSinceCheckOut: number
}

export interface BalancesReport {
  date: string
  hotelName: string
  summary: { count: number; total: number; departed: number; inHouse: number; upcoming: number }
  byCompany: { name: string; companyType: CompanyType | null; count: number; balance: number }[]
  items: BalanceItem[]
}

export interface OccupancyDay {
  date: string
  available: number
  sold: number
  pax: number
  occupancyPct: number
  revenue: number
  adr: number
  revpar: number
}

export interface OccupancyReport {
  from: string
  to: string
  hotelName: string
  summary: {
    totalRooms: number
    availableRoomNights: number
    soldRoomNights: number
    guestNights: number
    occupancyPct: number
    revenue: number
    adr: number
    revpar: number
  }
  days: OccupancyDay[]
  byRoomType: { roomTypeName: string; rooms: number; sold: number; occupancyPct: number; revenue: number; adr: number }[]
}

export interface ResidenceTotals {
  nationals: number
  foreigners: number
  unknown: number
  total: number
}

export interface MonthlyStatsReport {
  month: string
  from: string
  to: string
  hotelName: string
  businessName: string | null
  taxNumber: string | null
  category: string
  address: string
  daysInMonth: number
  rooms: number
  beds: number
  roomNightsAvailable: number
  roomNightsSold: number
  bedNightsAvailable: number
  roomOccupancyPct: number
  bedOccupancyPct: number
  averageStay: number
  arrivals: ResidenceTotals
  overnights: ResidenceTotals
  days: { date: string; roomsOccupied: number; arrivals: ResidenceTotals; overnights: ResidenceTotals }[]
}

export interface SourceTotal {
  source: ReservationSource
  reservations: number
  roomNights: number
  revenue: number
  sharePct: number
  adr: number
}

export interface CompanyProduction {
  companyUuid: string | null
  name: string
  taxNumber: string | null
  companyType: CompanyType | null
  reservations: number
  roomNights: number
  revenue: number
  sharePct: number
  balance: number
}

export interface SalesBySourceReport {
  from: string
  to: string
  hotelName: string
  summary: { reservations: number; roomNights: number; revenue: number; adr: number }
  bySource: SourceTotal[]
  byCompany: CompanyProduction[]
}

export interface LostReservation {
  reservationUuid: string
  reservationCode: string
  status: 'CANCELLED' | 'NO_SHOW'
  holderName: string
  phone: string | null
  companyName: string | null
  source: ReservationSource
  checkInDate: string
  checkOutDate: string
  nights: number
  rooms: number
  amount: number
  paidAmount: number
  reason: string | null
  cancelledAt: string | null
  cancelledBy: string | null
}

export interface CancellationsReport {
  from: string
  to: string
  hotelName: string
  summary: {
    cancelled: number
    noShow: number
    lostRevenue: number
    retained: number
    expectedReservations: number
    lostPct: number
  }
  bySource: { source: ReservationSource; cancelled: number; noShow: number; lostRevenue: number }[]
  items: LostReservation[]
}
