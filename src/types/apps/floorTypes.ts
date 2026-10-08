export type Floor = {
  id: number
  uuid: string
  propertyId: number
  name: string

  /** Posición en las listas (1..N). La asigna el servidor; se cambia arrastrando en la lista. */
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export type CreateFloorDto = {
  name: string
}

export type FloorSequenceResult = {
  created: Floor[]
  skipped: string[]
}

/** Nombre de los pisos que crea el botón "Crear varios pisos". */
export const numberedFloorName = (number: number) => `Piso ${number}`

export type UpdateFloorDto = {
  name?: string
}
