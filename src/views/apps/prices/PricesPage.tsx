'use client'

import { useEffect, useState } from 'react'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
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

/** Libres primero, luego ocupadas y mantenimiento. Dentro de cada grupo, de la más barata a la más cara. */
const orderRooms = (rooms: PriceRoomQuote[]) =>
  [...rooms].sort((a, b) => {
    const rank = { free: 0, occupied: 1, maintenance: 2 }
    const byState = rank[a.availability ?? 'free'] - rank[b.availability ?? 'free']

    if (byState !== 0) {
      return byState
    }

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

const copyQuote = (quote: PriceQuote, pickedIds: Record<number, number[]>, floorName?: string) => {
  const chosen = quote.types
    .map(type => ({ type, picked: resolvePicked(type, pickedIds[type.roomTypeId] ?? []) }))
    .filter(item => item.picked.length > 0)

  const total = Math.round(chosen.reduce((sum, item) => sum + pickedTotal(item.picked), 0) * 100) / 100
  const lines = [`Llegada ${formatEs(quote.from)}, salida ${formatEs(quote.to)}`]

  if (floorName) {
    lines.push(floorName)
  }

  chosen.forEach(({ type, picked }) => {
    const labels = new Set(picked.flatMap(room => rateNames(room.nights)))
    const suffix = labels.size === 1 ? ` (${[...labels][0]})` : ''

    lines.push(`${picked.length} ${type.name}: ${formatRoomPrice(pickedTotal(picked))}${suffix}`)
  })

  lines.push(`Total ${quote.nights} ${quote.nights === 1 ? 'noche' : 'noches'}: ${formatRoomPrice(total)}`)

  const blocked = chosen.flatMap(item => item.picked).filter(room => (room.availability ?? 'free') !== 'free')

  if (blocked.length > 0) {
    const hasOccupied = blocked.some(room => room.availability === 'occupied')
    const hasMaintenance = blocked.some(room => room.availability === 'maintenance')
    const detail =
      hasOccupied && hasMaintenance ? 'ocupadas o en mantenimiento' : hasMaintenance ? 'en mantenimiento' : 'ocupadas'

    lines.push(`Precio de referencia: hay habitaciones ${detail} en esas fechas.`)
  }

  return lines.join('\n')
}

const PricesPage = () => {
  const { data: session } = useSession()
  const { canViewQuotes, loaded } = useSubscriptionAccess()
  const propertyId = session?.user?.propertyId
  const [from, setFrom] = useState(limaToday)
  const [to, setTo] = useState(() => addDays(limaToday(), 1))
  const [floorId, setFloorId] = useState<number | 'all'>('all')
  const [showOccupied, setShowOccupied] = useState(false)
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

    if (floorId !== 'all' && !(quote.floors ?? []).some(floor => floor.id === floorId)) {
      setFloorId('all')

      return
    }

    setPickedIds(current => {
      let changed = false
      const next = { ...current }

      for (const type of quote.types) {
        const onFloor = floorId === 'all' ? type.rooms : type.rooms.filter(room => room.floorId === floorId)
        const visible = showOccupied ? onFloor : onFloor.filter(room => (room.availability ?? 'free') === 'free')
        const allowed = new Set(visible.map(room => room.id))
        const kept = (current[type.roomTypeId] ?? []).filter(id => allowed.has(id))

        if (kept.length !== (current[type.roomTypeId] ?? []).length) {
          next[type.roomTypeId] = kept
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [floorId, quote, showOccupied])

  const changeFrom = (value: string) => {
    setFrom(value)

    if (value && to <= value) {
      setTo(addDays(value, 1))
    }
  }

  const idsOf = (roomTypeId: number) => pickedIds[roomTypeId] ?? []

  const toggleRoom = (type: PriceTypeQuote, roomId: number) => {
    const current = idsOf(type.roomTypeId)
    const room = type.rooms.find(item => item.id === roomId)

    if (!room) {
      return
    }

    if (current.includes(roomId)) {
      setPickedIds(prev => ({ ...prev, [type.roomTypeId]: current.filter(id => id !== roomId) }))

      return
    }

    if (current.length >= MAX_QUANTITY) {
      return
    }

    if ((room.availability ?? 'free') === 'free') {
      const freePicked = current.filter(id => {
        const picked = type.rooms.find(item => item.id === id)

        return (picked?.availability ?? 'free') === 'free'
      })

      if (freePicked.length >= type.availableCount) {
        return
      }
    }

    setPickedIds(prev => ({ ...prev, [type.roomTypeId]: [...current, roomId] }))
  }

  const chosen = quote
    ? quote.types
        .map(type => ({ type, picked: resolvePicked(type, idsOf(type.roomTypeId)) }))
        .filter(item => item.picked.length > 0)
    : []

  const quoteTotal = Math.round(chosen.reduce((sum, item) => sum + pickedTotal(item.picked), 0) * 100) / 100
  const selectedCount = chosen.reduce((sum, item) => sum + item.picked.length, 0)

  const resetQuote = () => {
    setPickedIds({})
  }

  const copy = async () => {
    if (!quote || chosen.length === 0) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        copyQuote(quote, pickedIds, floorId === 'all' ? undefined : (quote.floors ?? []).find(floor => floor.id === floorId)?.name)
      )
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
        <CardContent className='flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-0'>
          <div className='flex min-is-0 flex-col gap-4 lg:is-[420px] lg:shrink-0 lg:pe-8'>
            <Typography variant='caption' color='text.secondary'>
              Fechas
            </Typography>
            <div className='flex flex-row items-end gap-4'>
              <DateField className='min-is-0 flex-1' fullWidth label='Llegada' value={from} onChange={changeFrom} />
              <DateField
                className='min-is-0 flex-1'
                fullWidth
                label='Salida'
                value={to}
                minDate={from ? addDays(from, 1) : undefined}
                onChange={setTo}
              />
            </div>
          </div>
          {quote && (quote.floors ?? []).length > 0 ? (
            <div className='flex min-is-0 flex-col gap-4 lg:border-s lg:border-divider lg:px-8'>
              <Typography variant='caption' color='text.secondary'>
                Piso
              </Typography>
              <div className='flex flex-wrap items-center gap-2'>
                <Chip
                  label='Todos'
                  color={floorId === 'all' ? 'primary' : 'default'}
                  variant={floorId === 'all' ? 'filled' : 'outlined'}
                  onClick={() => setFloorId('all')}
                />
                {(quote.floors ?? []).map(floor => (
                  <Chip
                    key={floor.id}
                    label={floor.name}
                    color={floorId === floor.id ? 'primary' : 'default'}
                    variant={floorId === floor.id ? 'filled' : 'outlined'}
                    onClick={() => setFloorId(floor.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div className='flex flex-col gap-4 lg:border-s lg:border-divider lg:ps-8'>
            <Typography variant='caption' color='text.secondary'>
              Mostrar
            </Typography>
            <div className='flex flex-wrap items-center gap-2'>
              <Chip
                label='Solo libres'
                color={!showOccupied ? 'primary' : 'default'}
                variant={!showOccupied ? 'filled' : 'outlined'}
                onClick={() => setShowOccupied(false)}
              />
              <Chip
                label='Ver también ocupadas'
                color={showOccupied ? 'primary' : 'default'}
                variant={showOccupied ? 'filled' : 'outlined'}
                onClick={() => setShowOccupied(true)}
              />
            </div>
          </div>
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
            <Typography variant='body2' className='self-end font-medium'>
              Seleccionadas: {selectedCount}
            </Typography>
            {quote.types.map(type => {
              const selected = new Set(idsOf(type.roomTypeId))
              const quantity = selected.size
              const ordered = orderRooms(type.rooms)
              const onFloor = floorId === 'all' ? ordered : ordered.filter(room => room.floorId === floorId)
              const visible = showOccupied ? onFloor : onFloor.filter(room => (room.availability ?? 'free') === 'free')
              const freeCount = visible.filter(room => (room.availability ?? 'free') === 'free').length
              const occupiedCount = visible.filter(room => room.availability === 'occupied').length
              const maintenanceCount = visible.filter(room => room.availability === 'maintenance').length
              const noneHere = type.roomCount === 0
              const holdNote =
                freeCount > type.availableCount
                  ? type.availableCount === 0
                    ? 'Hay una reserva sin número. No se puede marcar otra libre.'
                    : `Hay una reserva sin número. Solo se pueden marcar ${type.availableCount} libres.`
                  : ''
              const mix = [
                freeCount > 0 ? `${freeCount} ${freeCount === 1 ? 'libre' : 'libres'}` : '',
                occupiedCount > 0 ? `${occupiedCount} ${occupiedCount === 1 ? 'ocupada' : 'ocupadas'}` : '',
                maintenanceCount > 0 ? `${maintenanceCount} en mantenimiento` : ''
              ]
                .filter(Boolean)
                .join(' · ')
              const statusText = noneHere
                ? 'Sin habitaciones'
                : visible.length === 0
                  ? floorId !== 'all'
                    ? showOccupied
                      ? 'No hay habitaciones en ese piso.'
                      : 'No hay libre en ese piso.'
                    : 'No hay libre en esas fechas.'
                  : showOccupied && (occupiedCount > 0 || maintenanceCount > 0)
                    ? mix
                    : ''

              return (
                <Card
                  key={type.roomTypeId}
                  className='shrink-0'
                  sx={{ border: '2px solid', borderColor: quantity > 0 ? 'primary.main' : 'transparent' }}
                >
                  <div className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'>
                    <div className='flex min-is-0 flex-wrap items-baseline gap-x-3 gap-y-1'>
                      <Typography variant='h6' fontWeight={700}>
                        {type.name}
                      </Typography>
                      {statusText ? (
                        <Typography variant='body2' color='text.secondary'>
                          {statusText}
                        </Typography>
                      ) : null}
                    </div>
                  </div>
                  {holdNote ? (
                    <Typography variant='caption' color='warning.main' className='px-4 pb-2'>
                      {holdNote}
                    </Typography>
                  ) : null}
                  {visible.length > 0 ? (
                    <div className='flex flex-col gap-1 px-3 pb-3'>
                      {visible.map(room => {
                        const marked = selected.has(room.id)
                        const taken = (room.availability ?? 'free') !== 'free'
                        const takenLabel = room.availability === 'maintenance' ? 'Mantenimiento' : 'Ocupada'

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
                              opacity: taken && !marked ? 0.72 : 1,
                              bgcolor: marked
                                ? taken
                                  ? 'warning.lightOpacity'
                                  : 'primary.lightOpacity'
                                : 'transparent',
                              '&:hover': {
                                bgcolor: marked
                                  ? taken
                                    ? 'warning.lightOpacity'
                                    : 'primary.lightOpacity'
                                  : 'action.hover'
                              }
                            }}
                          >
                            <i
                              className={
                                marked
                                  ? taken
                                    ? 'ri-checkbox-fill text-xl text-warning'
                                    : 'ri-checkbox-fill text-xl text-primary'
                                  : 'ri-checkbox-blank-line text-xl'
                              }
                            />
                            <Typography className='font-medium' color={taken ? 'text.secondary' : 'text.primary'}>
                              {floorId === 'all' ? `${room.number} · ${room.floorName}` : room.number}
                            </Typography>
                            {taken ? (
                              <Typography variant='body2' color='text.secondary'>
                                {takenLabel}
                              </Typography>
                            ) : null}
                            <Typography color='text.secondary'>—</Typography>
                            <Typography className='font-medium' color={marked && !taken ? 'primary.main' : 'text.primary'}>
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
