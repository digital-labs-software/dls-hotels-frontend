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

const dayAfter = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)

/** Una tarifa aplica si la fecha de ingreso cae dentro de su vigencia (misma regla que el backend). */
export const isRateValidOn = (rate: Pick<Rate, 'validFrom' | 'validTo'>, checkInDate: string) =>
  Boolean(checkInDate) && (rate.validFrom ?? '0000') <= checkInDate && checkInDate <= (rate.validTo ?? '9999')

export const ratesValidOn = <T extends Pick<Rate, 'validFrom' | 'validTo'>>(rates: T[], checkInDate: string) =>
  rates.filter(rate => isRateValidOn(rate, checkInDate))

/** La última noche es la víspera de la salida; si cae después del fin de la tarifa, la estadía la sobrepasa. */
export const rateEndsDuringStay = (rate: Pick<Rate, 'validTo'> | null | undefined, checkOutDate: string) =>
  Boolean(rate?.validTo && checkOutDate && checkOutDate > dayAfter(rate.validTo))

type PriceSourceInput = {
  price: string
  rate?: Pick<Rate, 'name' | 'price'> | null
  roomNumber?: string | null
  roomPrice?: number | null
  typeName?: string | null
  typePrice?: number | null
}

export const priceSourceLabel = ({ price, rate, roomNumber, roomPrice, typeName, typePrice }: PriceSourceInput) => {
  const value = Number(price)

  if (!price || !Number.isFinite(value)) {
    return ''
  }

  if (rate && value === Number(rate.price)) {
    return `Tarifa «${rate.name}»`
  }

  if (roomNumber && roomPrice != null && value === Number(roomPrice) && Number(roomPrice) !== Number(typePrice)) {
    return `Precio de la habitación ${roomNumber}`
  }

  if (typeName && typePrice != null && value === Number(typePrice)) {
    return `Precio del tipo ${typeName}`
  }

  return 'Precio escrito a mano'
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
