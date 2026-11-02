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
import Typography from '@mui/material/Typography'

import DateField from '@/components/date-picker/DateField'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import {
  getPricesApiErrorMessage,
  pricesApi,
  type PriceNight,
  type PriceQuote,
  type PriceRoomQuote,
  type PriceTypeQuote
} from '@/libs/pricesApi'
import { addDays, limaToday } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'

const formatEs = (iso: string) => {
  const [year, month, day] = iso.split('-')

  return year && month && day ? `${day}/${month}/${year}` : iso
}

const uniform = (nights: PriceNight[]) => nights.every(night => night.price === nights[0]?.price && night.label === nights[0]?.label)

const MAX_QUANTITY = 20

/** Siempre de la más barata a la más cara; si empatan, por número. */
const orderRooms = (rooms: PriceRoomQuote[]) =>
  [...rooms].sort((a, b) => {
    const byPrice = a.total - b.total

    if (byPrice !== 0) {
      return byPrice
    }

    return a.number.localeCompare(b.number, 'es', { numeric: true })
  })

const pickedTotal = (rooms: PriceRoomQuote[]) => Math.round(rooms.reduce((sum, room) => sum + room.total, 0) * 100) / 100

const rateNames = (nights: PriceNight[]) =>
  [...new Set(nights.map(night => night.label).filter(label => label !== 'Precio normal'))]

const roomAmount = (nights: PriceNight[]) => {
  if (nights.length === 0) {
    return ''
  }

  const rates = rateNames(nights)
  const rate = rates.length > 0 ? ` · ${rates.join(', ')}` : ''

  if (uniform(nights)) {
    return `${formatRoomPrice(nights[0].price)}${rate}`
  }

  const prices = nights.map(night => night.price)

  return `${formatRoomPrice(Math.min(...prices))} – ${formatRoomPrice(Math.max(...prices))}${rate}`
}

const resolvePicked = (type: PriceTypeQuote, ids: number[]) => {
  const byId = new Map(type.rooms.map(room => [room.id, room]))

  return ids.flatMap(id => {
    const room = byId.get(id)

    return room ? [room] : []
  })
}

const copyQuote = (quote: PriceQuote, pickedIds: Record<number, number[]>) => {
  const chosen = quote.types
    .map(type => ({ type, picked: resolvePicked(type, pickedIds[type.roomTypeId] ?? []) }))
    .filter(item => item.picked.length > 0)

  const total = Math.round(chosen.reduce((sum, item) => sum + pickedTotal(item.picked), 0) * 100) / 100
  const lines = [`Llegada ${formatEs(quote.from)}, salida ${formatEs(quote.to)}`]

  chosen.forEach(({ type, picked }) => {
    const labels = new Set(picked.flatMap(room => rateNames(room.nights)))
    const suffix = labels.size === 1 ? ` (${[...labels][0]})` : ''

    lines.push(`${picked.length} ${type.name}: ${formatRoomPrice(pickedTotal(picked))}${suffix}`)
  })

  lines.push(`Total ${quote.nights} ${quote.nights === 1 ? 'noche' : 'noches'}: ${formatRoomPrice(total)}`)

  return lines.join('\n')
}

const PricesPage = () => {
  const { data: session } = useSession()
  const { canViewQuotes, loaded } = useSubscriptionAccess()
  const propertyId = session?.user?.propertyId
  const [from, setFrom] = useState(limaToday)
  const [to, setTo] = useState(() => addDays(limaToday(), 1))
  const [quote, setQuote] = useState<PriceQuote | null>(null)
  const [pickedIds, setPickedIds] = useState<Record<number, number[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loaded) {
      return
    }

    if (!canViewQuotes || !propertyId || !from || !to || to <= from) {
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
  }, [canViewQuotes, from, loaded, propertyId, to])

  useEffect(() => {
    if (!quote) {
      return
    }

    setPickedIds(current => {
      let changed = false
      const next = { ...current }

      for (const type of quote.types) {
        const allowed = new Set(type.rooms.map(room => room.id))
        const kept = (current[type.roomTypeId] ?? []).filter(id => allowed.has(id))

        if (kept.length !== (current[type.roomTypeId] ?? []).length) {
          next[type.roomTypeId] = kept
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [quote])

  const changeFrom = (value: string) => {
    setFrom(value)

    if (value && to <= value) {
      setTo(addDays(value, 1))
    }
  }

  const idsOf = (roomTypeId: number) => pickedIds[roomTypeId] ?? []

  const toggleRoom = (type: PriceTypeQuote, roomId: number) => {
    const current = idsOf(type.roomTypeId)

    if (current.includes(roomId)) {
      setPickedIds(prev => ({ ...prev, [type.roomTypeId]: current.filter(id => id !== roomId) }))

      return
    }

    if (current.length >= type.availableCount || current.length >= MAX_QUANTITY) {
      return
    }

    setPickedIds(prev => ({ ...prev, [type.roomTypeId]: [...current, roomId] }))
  }

  const chosen = quote
    ? quote.types
        .map(type => ({ type, picked: resolvePicked(type, idsOf(type.roomTypeId)) }))
        .filter(item => item.picked.length > 0)
    : []

  const quoteTotal = Math.round(chosen.reduce((sum, item) => sum + pickedTotal(item.picked), 0) * 100) / 100

  const resetQuote = () => {
    setPickedIds({})
  }

  const copy = async () => {
    if (!quote || chosen.length === 0) {
      return
    }

    try {
      await navigator.clipboard.writeText(copyQuote(quote, pickedIds))
      toast.success('Cotización copiada. Péguela en el chat.')
    } catch {
      toast.error('No se pudo copiar. Seleccione el texto y cópielo a mano.')
    }
  }

  if (loaded && !canViewQuotes) {
    return (
      <Alert severity='info'>El administrador del hotel tiene que darle el permiso Cotizar.</Alert>
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

      {loading ? (
        <div className='flex justify-center py-10'>
          <CircularProgress />
        </div>
      ) : null}

      {!loading && quote && quote.types.length === 0 ? (
        <Alert severity='info'>No hay tipos de habitación activos.</Alert>
      ) : null}

      {!loading && quote && quote.types.length > 0 ? (
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start'>
          <div className='flex min-is-0 flex-1 flex-col gap-2'>
            {quote.types.map(type => {
              const selected = new Set(idsOf(type.roomTypeId))
              const quantity = selected.size
              const ordered = orderRooms(type.rooms)
              const unavailable = type.roomCount > 0 && type.availableCount === 0

              return (
                <Card
                  key={type.roomTypeId}
                  className='shrink-0'
                  sx={{ border: '2px solid', borderColor: quantity > 0 ? 'primary.main' : 'transparent' }}
                >
                  <div className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'>
                    <div className='min-is-0'>
                      <Typography variant='h6' fontWeight={700}>
                        {type.name}
                      </Typography>
                      {type.roomCount === 0 ? (
                        <Typography variant='body2' color='text.secondary'>
                          Sin habitaciones
                        </Typography>
                      ) : unavailable ? (
                        <Typography variant='body2' color='text.secondary'>
                          No hay libre en esas fechas.
                        </Typography>
                      ) : (
                        <Typography variant='body2' color='text.secondary'>
                          Libres: {type.availableCount}
                        </Typography>
                      )}
                    </div>
                    {type.availableCount > 0 ? (
                      <Typography variant='body2' color='text.secondary' className='shrink-0'>
                        Seleccionadas: {quantity}
                      </Typography>
                    ) : null}
                  </div>
                  {ordered.length > 0 ? (
                    <div className='flex flex-col gap-1 px-3 pb-3'>
                      {ordered.map(room => {
                        const marked = selected.has(room.id)

                        return (
                          <Box
                            key={room.id}
                            component='button'
                            type='button'
                            onClick={() => toggleRoom(type, room.id)}
                            className='flex items-center gap-2 rounded-md px-2 py-1.5 text-start is-full'
                            sx={{
                              border: 0,
                              cursor: 'pointer',
                              color: 'inherit',
                              font: 'inherit',
                              bgcolor: marked ? 'primary.lightOpacity' : 'transparent',
                              '&:hover': {
                                bgcolor: marked ? 'primary.lightOpacity' : 'action.hover'
                              }
                            }}
                          >
                            <i
                              className={
                                marked
                                  ? 'ri-checkbox-fill text-xl text-primary'
                                  : 'ri-checkbox-blank-line text-xl'
                              }
                            />
                            <Typography className='font-medium'>{room.number}</Typography>
                            <Typography>—</Typography>
                            <Typography className='font-medium' color={marked ? 'primary.main' : 'text.primary'}>
                              {roomAmount(room.nights)}
                            </Typography>
                          </Box>
                        )
                      })}
                    </div>
                  ) : null}
                </Card>
              )
            })}
          </div>
          <Box className='lg:sticky lg:top-6 lg:is-[360px] lg:shrink-0'>
            <Card sx={{ bgcolor: 'var(--mui-palette-primary-lightOpacity)', border: '1px solid', borderColor: 'primary.main' }}>
              <CardContent className='flex flex-col gap-4'>
                <Typography variant='h5'>Cotización</Typography>
                <Typography color='text.secondary'>
                  {quote.nights} {quote.nights === 1 ? 'noche' : 'noches'} · {formatEs(quote.from)} al {formatEs(quote.to)}
                </Typography>
                {chosen.length === 0 ? (
                  <Typography>Marque las habitaciones que pide el huésped.</Typography>
                ) : (
                  <div className='flex flex-col gap-2'>
                    {chosen.map(item => (
                      <div key={item.type.roomTypeId} className='flex items-start justify-between gap-3'>
                        <Typography>
                          {item.picked.length} {item.type.name}
                        </Typography>
                        <Typography className='shrink-0'>{formatRoomPrice(pickedTotal(item.picked))}</Typography>
                      </div>
                    ))}
                  </div>
                )}
                {chosen.length > 0 ? <Typography variant='h4'>{formatRoomPrice(quoteTotal)}</Typography> : null}
                <Button variant='contained' fullWidth disabled={chosen.length === 0} onClick={copy}>
                  Copiar cotización
                </Button>
                <Button variant='outlined' color='secondary' fullWidth disabled={chosen.length === 0} onClick={resetQuote}>
                  Nueva cotización
                </Button>
              </CardContent>
            </Card>
          </Box>
        </div>
      ) : null}
    </div>
  )
}

export default PricesPage
