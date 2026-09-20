export type HotelRole = {
  id: number
  uuid: string
  propertyId: number
  name: string
  createdAt: string
  updatedAt: string
}

export type CreateHotelRoleDto = {
  propertyId: number
  name: string
}

export type UpdateHotelRoleDto = {
  propertyId?: number
  name?: string
}
