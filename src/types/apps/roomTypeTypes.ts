export type RoomType = {
  id?: number
  uuid: string
  propertyId: number
  name: string
  description: string | null
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export type CreateRoomTypeDto = {
  propertyId: number
  name: string
  description?: string | null
  displayOrder: number
}

export type UpdateRoomTypeDto = {
  propertyId?: number
  name?: string
  description?: string | null
  displayOrder?: number
}
