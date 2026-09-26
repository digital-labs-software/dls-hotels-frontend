export const ROOM_STATUSES = ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'] as const

export type RoomStatus = (typeof ROOM_STATUSES)[number]

export type Room = {
  id: number
  uuid: string
  propertyId: number
  roomTypeId: number
  roomTypeName: string
  floorId: number
  floorName: string
  number: string
  basePrice: number | null
  effectivePrice: number
  photoUrl: string | null
  status: RoomStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type CreateRoomDto = {
  roomTypeId: number
  floorId: number
  number: string
  basePrice?: number | null
  photoUrl?: string | null
  status: RoomStatus
  notes?: string | null
}

export type UpdateRoomDto = {
  roomTypeId?: number
  floorId?: number
  basePrice?: number | null
  photoUrl?: string | null
  status?: RoomStatus
  notes?: string | null
}

export type ListRoomsQuery = {
  page?: number
  limit?: number
  roomTypeId?: number
  floorId?: number
  status?: RoomStatus
}

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Reservada',
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
