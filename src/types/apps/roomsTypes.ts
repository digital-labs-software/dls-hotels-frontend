export const ROOM_STATUSES = ['AVAILABLE', 'OCCUPIED', 'CLEANING'] as const

export type RoomStatus = (typeof ROOM_STATUSES)[number]

export const MANUAL_ROOM_STATUSES = ['AVAILABLE', 'CLEANING'] as const

export type ManualRoomStatus = (typeof MANUAL_ROOM_STATUSES)[number]

export const ROOM_DISPLAY_STATUSES = ['AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'] as const

export type RoomDisplayStatus = (typeof ROOM_DISPLAY_STATUSES)[number]

export type RoomMaintenance = {
  uuid: string
  startsOn: string
  endsOn: string
  reason: string
}

export type Room = {
  id: number
  uuid: string
  propertyId: number
  roomTypeId: number
  roomTypeName: string
  floorId: number
  floorName: string
  number: string
  priceOverride: number | null
  effectivePrice: number
  photoUrl: string | null
  status: RoomStatus
  displayStatus: RoomDisplayStatus
  maintenances: RoomMaintenance[]
  notes: string | null
  createdAt: string
  updatedAt: string
  restored?: boolean
}

export type CreateRoomDto = {
  roomTypeId: number
  floorId: number
  number: string
  priceOverride?: number | null
  photoUrl?: string | null
  status: RoomStatus
  notes?: string | null
}

export type UpdateRoomDto = {
  roomTypeId?: number
  floorId?: number
  number?: string
  priceOverride?: number | null
  photoUrl?: string | null
  status?: RoomStatus
  notes?: string | null
}

export type ListRoomsQuery = {
  page?: number
  limit?: number
  roomTypeId?: number
  floorId?: number
  status?: RoomDisplayStatus
}

export const ROOM_STATUS_LABELS: Record<RoomDisplayStatus, string> = {
  AVAILABLE: 'Disponible',
  OCCUPIED: 'Ocupada',
  CLEANING: 'Limpieza',
  MAINTENANCE: 'Mantenimiento'
}

export const formatRoomPrice = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }

  return `S/ ${Number(value).toFixed(2)}`
}
