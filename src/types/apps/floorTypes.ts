export type Floor = {
  id?: number
  uuid: string
  propertyId: number
  name: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export type CreateFloorDto = {
  propertyId: number
  name: string
  displayOrder: number
}

export type UpdateFloorDto = {
  propertyId?: number
  name?: string
  displayOrder?: number
}
