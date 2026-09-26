export type RoomType = {
  id: number
  uuid: string
  propertyId: number
  name: string
  description: string | null
  basePrice: number
  maxAdults: number
  maxChildren: number
  maxOccupancy: number | null
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export type CreateRoomTypeDto = {
  name: string
  description?: string | null
  basePrice: number
  maxAdults: number
  maxChildren?: number
  maxOccupancy?: number | null
  displayOrder: number
}

export type UpdateRoomTypeDto = {
  name?: string
  description?: string | null
  basePrice?: number
  maxAdults?: number
  maxChildren?: number
  maxOccupancy?: number | null
  displayOrder?: number
}
