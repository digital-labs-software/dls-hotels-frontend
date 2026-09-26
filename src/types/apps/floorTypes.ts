export type Floor = {
  id: number
  uuid: string
  propertyId: number
  name: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export type CreateFloorDto = {
  name: string
  displayOrder: number
}

export type UpdateFloorDto = {
  name?: string
  displayOrder?: number
}
