'use client'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import type { Stay } from '@/types/apps/frontDeskTypes'
import { formatFrontDeskDate } from '@/types/apps/frontDeskTypes'

type ListKind = 'arrivals' | 'departures' | 'inHouse'

type Props = {
  kind: ListKind
  stays: Stay[]
  emptyMessage?: string
  onOpenStay: (stay: Stay) => void
  onCheckIn: (stay: Stay) => void
  onCheckOut: (stay: Stay) => void
  onEarlyDeparture: (stay: Stay) => void
  onUndoCheckIn: (stay: Stay) => void
  onAssign: (stay: Stay) => void
  onNoShow: (stay: Stay) => void
  today: string
  busy?: { id: string; action: 'checkIn' | 'noShow' } | null
}

const quietButtonSx = {
  color: 'var(--mui-palette-text-primary)',
  borderColor: 'var(--mui-palette-text-secondary)',
  '&:hover': {
    borderColor: 'var(--mui-palette-text-primary)',
    backgroundColor: 'var(--mui-palette-action-hover)'
  }
}

const companionsOf = (stay: Stay) => {
  const titular = stay.guestName?.trim()

  return (stay.occupantNames ?? []).filter(name => name.trim() && name.trim() !== titular)
}

const StayList = ({
  kind,
  stays,
  emptyMessage,
  onOpenStay,
  onCheckIn,
  onCheckOut,
  onEarlyDeparture,
  onUndoCheckIn,
  onAssign,
  onNoShow,
  today,
  busy = null
}: Props) => {
  if (stays.length === 0) {
    const empty =
      emptyMessage ??
      (kind === 'arrivals' ? 'No hay llegadas hoy' : kind === 'departures' ? 'No hay salidas hoy' : 'No hay huéspedes en casa')

    return (
      <Typography variant='body2' color='text.secondary' className='p-4 text-center'>
        {empty}
      </Typography>
    )
  }

  return (
    <div className='flex flex-col'>
      {stays.map(stay => {
        const companions = companionsOf(stay)
        const nightsLabel = `${stay.nights} noche${stay.nights === 1 ? '' : 's'}`

        return (
          <div key={stay.reservationRoomUuid} className='flex flex-col gap-3 border-be p-4'>
            <div className='min-is-0'>
              <div className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
                <Typography variant='h5' className='font-medium' color={stay.roomNumber ? undefined : 'warning'}>
                  {stay.roomNumber || 'Sin habitación'}
                </Typography>
                <Typography variant='body1'>{stay.roomTypeName}</Typography>
              </div>
              <Typography className='font-medium'>{stay.guestName || 'Sin titular'}</Typography>
              {companions.length > 0 ? (
                <Typography variant='body2' color='text.secondary'>
                  {companions.length === 1 ? 'Acompañante' : 'Acompañantes'} {companions.join(', ')}
                </Typography>
              ) : null}
              {stay.bookerName && stay.bookerName !== stay.guestName ? (
                <Typography variant='body2' color='text.secondary'>
                  Reservó {stay.bookerName}
                </Typography>
              ) : null}
              {stay.companyName || stay.reservationCode ? (
                <Typography variant='body2' color='text.secondary'>
                  {[stay.companyName, stay.reservationCode].filter(Boolean).join(' · ')}
                </Typography>
              ) : null}
              {kind === 'departures' ? (
                stay.departureOverdue ? (
                  <Typography variant='body2'>Debió salir el {formatFrontDeskDate(stay.checkOutDate)}</Typography>
                ) : null
              ) : (
                <Typography variant='body2' color='text.secondary'>
                  Sale el {formatFrontDeskDate(stay.checkOutDate)} · {nightsLabel}
                </Typography>
              )}
            </div>
            {stay.arrivalOverdue || stay.departureOverdue ? (
              <div className='flex flex-wrap gap-1'>
                {stay.arrivalOverdue ? <Chip size='small' color='warning' label='Llegada atrasada' /> : null}
                {stay.departureOverdue ? <Chip size='small' color='warning' label='Salida vencida' /> : null}
              </div>
            ) : null}
            <div className='flex flex-wrap items-center gap-2'>
              {kind === 'arrivals' && !stay.roomId ? (
                <Button size='small' variant='outlined' sx={quietButtonSx} onClick={() => onAssign(stay)}>
                  Asignar
                </Button>
              ) : null}
              {kind === 'arrivals' ? (
                <Button size='small' variant='contained' disabled={Boolean(busy)} onClick={() => onCheckIn(stay)}>
                  {busy?.id === stay.reservationRoomUuid && busy.action === 'checkIn' ? (
                    <CircularProgress size={16} color='inherit' />
                  ) : (
                    'Check-in (ingreso)'
                  )}
                </Button>
              ) : null}
              {kind === 'departures' ? (
                <Button size='small' color='warning' variant='contained' onClick={() => onCheckOut(stay)}>
                  Check-out (ya se fue)
                </Button>
              ) : null}
              {kind === 'inHouse' && stay.checkInDate < today ? (
                <Button size='small' color='warning' variant='contained' onClick={() => onEarlyDeparture(stay)}>
                  Check-out (ya se fue)
                </Button>
              ) : null}
              {kind === 'inHouse' && stay.checkInDate >= today ? (
                <Button size='small' variant='outlined' sx={quietButtonSx} onClick={() => onUndoCheckIn(stay)}>
                  No se presentó
                </Button>
              ) : null}
              <Button size='small' variant='outlined' sx={quietButtonSx} onClick={() => onOpenStay(stay)}>
                Ver estadía
              </Button>
              {kind === 'arrivals' ? (
                <Button size='small' variant='outlined' sx={quietButtonSx} disabled={Boolean(busy)} onClick={() => onNoShow(stay)}>
                  {busy?.id === stay.reservationRoomUuid && busy.action === 'noShow' ? (
                    <CircularProgress size={16} color='inherit' />
                  ) : (
                    'No se presentó'
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StayList
