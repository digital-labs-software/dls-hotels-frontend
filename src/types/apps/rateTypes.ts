export type Rate = {
  id: number
  uuid: string
  propertyId: number
  roomTypeId: number
  roomTypeName: string
  name: string
  price: number
  validFrom: string | null
  validTo: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateRatePayload = {
  roomTypeId: number
  name: string
  price: number
  validFrom?: string | null
  validTo?: string | null
  isActive?: boolean
}

export type UpdateRatePayload = Partial<Omit<CreateRatePayload, 'roomTypeId'>>

export type ListRatesQuery = {
  page?: number
  limit?: number
  roomTypeId?: number
  isActive?: boolean
}

export const formatRateDate = (value: string | null | undefined) => {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}

export const formatRateValidity = (validFrom: string | null, validTo: string | null) => {
  const from = formatRateDate(validFrom)
  const to = formatRateDate(validTo)

  if (!from && !to) {
    return 'Sin límite'
  }

  if (from && !to) {
    return `Desde ${from}`
  }

  if (!from && to) {
    return `Hasta ${to}`
  }

  return `${from} – ${to}`
}
