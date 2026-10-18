/** Precio de una temporada para un tipo. El id es el que se envía al reservar. */
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

export type SeasonPrice = {
  id: number
  roomTypeId: number
  roomTypeName: string
  price: number
}

export type Season = {
  id: number
  uuid: string
  propertyId: number
  name: string
  validFrom: string | null
  validTo: string | null
  isActive: boolean
  prices: SeasonPrice[]
  createdAt: string
  updatedAt: string
  restored?: boolean
}

export type SeasonPriceInput = {
  roomTypeId: number
  price: number
}

export type CreateSeasonPayload = {
  name: string
  validFrom?: string | null
  validTo?: string | null
  isActive?: boolean
  prices: SeasonPriceInput[]
}

export type UpdateSeasonPayload = Partial<CreateSeasonPayload>

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

const rateSpan = (rate: Pick<Rate, 'validFrom' | 'validTo'>) => {
  const from = Date.parse(`${rate.validFrom ?? '0000-01-01'}T00:00:00Z`)
  const to = Date.parse(`${rate.validTo ?? '9999-12-31'}T00:00:00Z`)

  return to - from
}

/** Tarifas que cubren el día, de la vigencia más corta a la más larga. */
export const sortRatesForDate = <T extends Pick<Rate, 'validFrom' | 'validTo' | 'price' | 'isActive' | 'id'>>(
  rates: T[],
  day: string
) =>
  rates
    .filter(rate => rate.isActive !== false && isRateValidOn(rate, day))
    .sort((a, b) => {
      const span = rateSpan(a) - rateSpan(b)

      if (span !== 0) {
        return span
      }

      const price = Number(b.price) - Number(a.price)

      return price !== 0 ? price : a.id - b.id
    })

/** La tarifa activa de menor vigencia gana. Si empatan, gana el precio más alto. */
export const pickRateForDate = <T extends Pick<Rate, 'validFrom' | 'validTo' | 'price' | 'isActive' | 'id'>>(
  rates: T[],
  day: string
) => sortRatesForDate(rates, day)[0]

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
