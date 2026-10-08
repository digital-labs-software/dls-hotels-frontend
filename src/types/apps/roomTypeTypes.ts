export type RoomType = {
  id: number
  uuid: string
  propertyId: number
  name: string
  code: string
  description: string | null
  basePrice: number
  maxAdults: number
  maxChildren: number
  maxOccupancy: number | null

  /** Posición en las listas (1..N). La asigna el servidor; se cambia arrastrando en la lista. */
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateRoomTypeDto = {
  name: string

  /** Vacía = el servidor la genera desde el nombre. */
  code?: string
  description?: string | null
  basePrice: number
  maxAdults: number
  maxChildren?: number
  maxOccupancy?: number | null
}

type GuestCapacity = {
  maxAdults: number
  maxChildren: number
  maxOccupancy?: number | null
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export const formatPeople = (count: number) => plural(count, 'persona', 'personas')

export const roomCapacity = (type: GuestCapacity) =>
  Number(type.maxOccupancy ?? Number(type.maxAdults) + Number(type.maxChildren || 0))

/** Sin límites propios: los adultos llegan al total y los niños al total menos uno (siempre va un adulto). */
export const defaultGuestLimits = (capacity: number) => ({
  maxAdults: capacity,
  maxChildren: Math.max(capacity - 1, 0)
})

export const hasGuestLimits = (type: GuestCapacity) => {
  const defaults = defaultGuestLimits(roomCapacity(type))

  return Number(type.maxAdults) !== defaults.maxAdults || Number(type.maxChildren || 0) !== defaults.maxChildren
}

export const capacitySummary = (type: GuestCapacity) => {
  const capacity = roomCapacity(type)
  const adults = Number(type.maxAdults)
  const children = Number(type.maxChildren || 0)

  if (capacity === 1) {
    return 'Entra 1 persona.'
  }

  if (!hasGuestLimits(type)) {
    return `Entran hasta ${formatPeople(capacity)}, adultos o niños. Siempre con al menos un adulto.`
  }

  if (children === 0) {
    return `Entran hasta ${formatPeople(capacity)}, solo adultos.`
  }

  return `Entran hasta ${formatPeople(capacity)}: hasta ${plural(adults, 'adulto', 'adultos')} y hasta ${plural(children, 'niño', 'niños')}.`
}

/** Texto corto para listas y tarjetas. */
export const capacityLabel = (type: GuestCapacity) => {
  const people = `Hasta ${formatPeople(roomCapacity(type))}`

  if (!hasGuestLimits(type)) {
    return people
  }

  return `${people} (hasta ${plural(Number(type.maxAdults), 'adulto', 'adultos')} y ${plural(Number(type.maxChildren || 0), 'niño', 'niños')})`
}

export const ROOM_TYPE_CODE_PATTERN = /^[A-Z0-9]{2,6}$/

/** Solo letras y números en mayúsculas, máximo 6 ("dbl-1" → "DBL1"). */
export const toRoomTypeCode = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)

const knownCodes: Record<string, string> = {
  simple: 'SGL',
  individual: 'SGL',
  matrimonial: 'MAT',
  doble: 'DBL',
  triple: 'TPL',
  cuadruple: 'CDP',
  familiar: 'FAM',
  suite: 'STE'
}

const connectors = new Set(['a', 'al', 'con', 'de', 'del', 'el', 'en', 'la', 'las', 'los', 'para', 'y'])

/** Abreviatura sugerida a partir del nombre: las categorías comunes usan su código de mercado, el resto sus 3 primeras letras. */
export const suggestRoomTypeCode = (name: string) => {
  const words = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(word => word && !connectors.has(word))

  if (words.length === 0) {
    return ''
  }

  const base = knownCodes[words[0]] ?? toRoomTypeCode(words[0]).slice(0, 3)
  const extra = words.slice(1).map(word => toRoomTypeCode(word).charAt(0)).join('')
  const code = toRoomTypeCode(base + extra)

  return code.length >= 2 ? code : toRoomTypeCode(`HAB${code}`)
}

export type UpdateRoomTypeDto = {
  name?: string
  code?: string
  description?: string | null
  basePrice?: number
  maxAdults?: number
  maxChildren?: number
  maxOccupancy?: number | null
  isActive?: boolean
}
