'use client'

import { useEffect, useState } from 'react'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import DateField from '@/components/date-picker/DateField'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { getPricesApiErrorMessage, pricesApi, type PriceNight, type PriceQuote, type PriceTypeQuote } from '@/libs/pricesApi'
import { addDays, limaToday } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'

const formatEs = (iso: string) => {
  const [year, month, day] = iso.split('-')

  return year && month && day ? `${day}/${month}/${year}` : iso
}

const uniform = (nights: PriceNight[]) => nights.every(night => night.price === nights[0]?.price && night.label === nights[0]?.label)

const MAX_QUANTITY = 20

const lineTotal = (type: PriceTypeQuote, quantity: number) => Math.round(type.total * quantity * 100) / 100

const copyQuote = (quote: PriceQuote, quantities: Record<number, number>) => {
  const chosen = quote.types
    .map(type => ({ type, quantity: quantities[type.roomTypeId] ?? 0 }))
    .filter(item => item.quantity > 0)

  const total = Math.round(chosen.reduce((sum, item) => sum + lineTotal(item.type, item.quantity), 0) * 100) / 100
  const lines = [`Llegada ${formatEs(quote.from)}, salida ${formatEs(quote.to)}`]

  chosen.forEach(({ type, quantity }) => {
    const first = type.nights[0]
    const amount = formatRoomPrice(lineTotal(type, quantity))

    if (uniform(type.nights) && first) {
      lines.push(`${quantity} ${type.name}: ${amount} (${first.label})`)

      return
    }

    lines.push(`${quantity} ${type.name}: ${amount}`)
    type.nights.forEach(night => {
      lines.push(`${formatEs(night.date)}: ${formatRoomPrice(night.price)} por habitación (${night.label})`)
    })
  })

  lines.push(`Total ${quote.nights} ${quote.nights === 1 ? 'noche' : 'noches'}: ${formatRoomPrice(total)}`)

  return lines.join('\n')
}

const PricesPage = () => {
  const { data: session } = useSession()
  const { canViewPrices, loaded } = useSubscriptionAccess()
  const propertyId = session?.user?.propertyId
  const [from, setFrom] = useState(limaToday)
  const [to, setTo] = useState(() => addDays(limaToday(), 1))
  const [quote, setQuote] = useState<PriceQuote | null>(null)
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loaded) {
      return
    }

    if (!canViewPrices || !propertyId || !from || !to || to <= from) {
      setLoading(false)
      setQuote(null)

      return
    }

    let active = true

    setLoading(true)
    setError('')

    pricesApi
      .quote(propertyId, from, to)
      .then(next => {
        if (active) {
          setQuote(next)
        }
      })
      .catch(err => {
        if (active) {
          setQuote(null)
          setError(getPricesApiErrorMessage(err))
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [canViewPrices, from, loaded, propertyId, to])

  const changeFrom = (value: string) => {
    setFrom(value)

    if (value && to <= value) {
      setTo(addDays(value, 1))
    }
  }

  const setQuantity = (roomTypeId: number, quantity: number) => {
    setQuantities(current => ({ ...current, [roomTypeId]: Math.min(MAX_QUANTITY, Math.max(0, quantity)) }))
  }

  const chosen = quote
    ? quote.types
        .map(type => ({ type, quantity: quantities[type.roomTypeId] ?? 0 }))
        .filter(item => item.quantity > 0)
    : []
  const quoteTotal = Math.round(chosen.reduce((sum, item) => sum + lineTotal(item.type, item.quantity), 0) * 100) / 100

  const copy = async () => {
    if (!quote || chosen.length === 0) {
      return
    }

    try {
      await navigator.clipboard.writeText(copyQuote(quote, quantities))
      toast.success('Cotización copiada. Péguela en el chat.')
    } catch {
      toast.error('No se pudo copiar. Seleccione el texto y cópielo a mano.')
    }
  }

  if (loaded && !canViewPrices) {
    return (
      <Alert severity='info'>El administrador del hotel tiene que darle el permiso Ver precios.</Alert>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      <Card>
        <CardContent className='flex flex-col gap-4 sm:flex-row sm:items-end'>
          <DateField className='min-is-[200px] is-full sm:is-auto' fullWidth label='Llegada' value={from} onChange={changeFrom} />
          <DateField
            className='min-is-[200px] is-full sm:is-auto'
            fullWidth
            label='Salida'
            value={to}
            minDate={from ? addDays(from, 1) : undefined}
            onChange={setTo}
          />
        </CardContent>
      </Card>

      {to <= from ? <Alert severity='warning'>La salida tiene que ser después de la llegada.</Alert> : null}
      {error ? <Alert severity='error'>{error}</Alert> : null}

      {!loading && quote && quote.types.length > 0 ? (
        <Box
          className='flex flex-wrap items-center justify-between gap-3 p-4'
          sx={{
            position: 'sticky',
            top: 8,
            zIndex: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 3
          }}
        >
          <div>
            <Typography fontWeight={600}>
              {chosen.length === 0 ? 'Ponga cuántas habitaciones pide el huésped' : `Total ${formatRoomPrice(quoteTotal)}`}
            </Typography>
            {chosen.length > 0 ? (
              <Typography variant='body2' color='text.secondary'>
                {chosen.map(item => `${item.quantity} ${item.type.name}`).join(' · ')}
              </Typography>
            ) : null}
          </div>
          <Button variant='contained' className='shrink-0' disabled={chosen.length === 0} onClick={copy}>
            Copiar cotización
          </Button>
        </Box>
      ) : null}
      {loading ? (
        <div className='flex justify-center py-10'>
          <CircularProgress />
        </div>
      ) : null}

      {!loading && quote && quote.types.length === 0 ? (
        <Alert severity='info'>No hay tipos de habitación activos.</Alert>
      ) : null}

      {!loading && quote
        ? quote.types.map(type => {
            const same = uniform(type.nights)
            const first = type.nights[0]
            const quantity = quantities[type.roomTypeId] ?? 0

            return (
              <Card key={type.roomTypeId} sx={quantity > 0 ? { outline: '2px solid', outlineColor: 'primary.main' } : undefined}>
                <CardContent className='flex flex-col gap-3'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div>
                      <Typography variant='h5'>{type.name}</Typography>
                      {same && first ? (
                        <>
                          <Typography variant='h3'>{formatRoomPrice(first.price)}</Typography>
                          <Typography color='text.secondary'>por noche · {first.label}</Typography>
                        </>
                      ) : (
                        <div className='flex flex-col gap-1 mbs-2'>
                          {type.nights.map(night => (
                            <Typography key={night.date}>
                              {formatEs(night.date)} · {formatRoomPrice(night.price)} · {night.label}
                            </Typography>
                          ))}
                        </div>
                      )}
                      <Typography className='mbs-2' fontWeight={600}>
                        {quote.nights} {quote.nights === 1 ? 'noche' : 'noches'} · {formatRoomPrice(type.total)}
                        {quantity > 1 ? ` · ${quantity} habitaciones · ${formatRoomPrice(lineTotal(type, quantity))}` : ''}
                      </Typography>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Typography color='text.secondary'>Cantidad</Typography>
                      <IconButton aria-label={`Quitar ${type.name}`} disabled={quantity === 0} onClick={() => setQuantity(type.roomTypeId, quantity - 1)}>
                        <i className='ri-subtract-line' />
                      </IconButton>
                      <Typography variant='h5' className='min-is-[1.5rem] text-center'>
                        {quantity}
                      </Typography>
                      <IconButton
                        aria-label={`Agregar ${type.name}`}
                        disabled={quantity >= MAX_QUANTITY}
                        onClick={() => setQuantity(type.roomTypeId, quantity + 1)}
                      >
                        <i className='ri-add-line' />
                      </IconButton>
                    </div>
                  </div>

                  {type.rooms.length > 0 ? (
                    <div className='flex flex-col gap-2'>
                      <Typography fontWeight={600}>Habitaciones con otro precio</Typography>
                      {type.rooms.map(room => {
                        const roomSame = uniform(room.nights)

                        return (
                          <Typography key={room.id} color='text.secondary'>
                            {room.number}
                            {roomSame && room.nights[0]
                              ? ` · ${formatRoomPrice(room.nights[0].price)} por noche · ${room.nights[0].label}`
                              : ` · ${room.nights.map(night => `${formatEs(night.date)} ${formatRoomPrice(night.price)}`).join(', ')}`}
                            {` · total ${formatRoomPrice(room.total)}`}
                          </Typography>
                        )
                      })}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )
          })
        : null}
    </div>
  )
}

export default PricesPage
