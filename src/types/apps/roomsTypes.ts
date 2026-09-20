export const ROOM_STATUSES = ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'] as const

export type RoomStatus = (typeof ROOM_STATUSES)[number]

export type Room = {
  uuid: string
  propertyId: number
  roomTypeId: number
  floorId: number
  number: string
  photoUrl: string | null
  status: RoomStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type CreateRoomDto = {
  propertyId: number
  roomTypeId: number
  floorId: number
  number: string
  photoUrl?: string | null
  status: RoomStatus
  notes?: string | null
}

export type UpdateRoomDto = {
  roomTypeId?: number
  floorId?: number
  photoUrl?: string | null
  status?: RoomStatus
  notes?: string | null
}

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Reservada',
  OCCUPIED: 'Ocupada',
  CLEANING: 'Limpieza',
  MAINTENANCE: 'Mantenimiento'
}
