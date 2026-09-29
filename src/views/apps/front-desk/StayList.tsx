'use client'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import type { Stay } from '@/types/apps/frontDeskTypes'
import { formatFrontDeskDate, STAY_STATUS_LABELS } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'

type ListKind = 'arrivals' | 'departures' | 'inHouse'

type Props = {
  kind: ListKind
  stays: Stay[]
  onOpenStay: (stay: Stay) => void
  onCheckIn: (stay: Stay) => void
  onCheckOut: (stay: Stay) => void
  onAssign: (stay: Stay) => void
  onNoShow: (stay: Stay) => void
  onPay: (stay: Stay) => void
}

const StayList = ({ kind, stays, onOpenStay, onCheckIn, onCheckOut, onAssign, onNoShow, onPay }: Props) => {
  if (stays.length === 0) {
    const empty =
      kind === 'arrivals' ? 'No hay llegadas hoy' : kind === 'departures' ? 'No hay salidas hoy' : 'No hay huéspedes en casa'

    return (
      <Typography variant='body2' color='text.secondary' className='p-4 text-center'>
        {empty}
      </Typography>
    )
  }

  return (
    <div className='flex flex-col'>
      {stays.map(stay => (
        <div key={stay.reservationRoomUuid} className='flex flex-col gap-2 border-be p-3'>
          <div className='flex items-start justify-between gap-2'>
            <div className='min-is-0'>
              <Typography className='font-medium truncate'>{stay.guestName || stay.reservationCode}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {stay.roomNumber ? `${stay.roomNumber} · ` : 'Sin habitación · '}
                {stay.roomTypeName}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {formatFrontDeskDate(stay.checkInDate)} – {formatFrontDeskDate(stay.checkOutDate)} · {stay.nights} noche
                {stay.nights === 1 ? '' : 's'}
              </Typography>
            </div>
            <Chip size='small' variant='tonal' label={STAY_STATUS_LABELS[stay.status] ?? stay.status} />
          </div>
          <div className='flex flex-wrap gap-1'>
            {stay.arrivalOverdue ? <Chip size='small' color='secondary' label='Llegada atrasada' /> : null}
            {stay.departureOverdue ? <Chip size='small' color='secondary' label='Salida vencida' /> : null}
            {stay.reservationBalance > 0 ? (
              <Chip size='small' color='error' label={`Saldo ${formatRoomPrice(stay.reservationBalance)}`} />
            ) : null}
          </div>
          <div className='flex flex-wrap gap-1'>
            <IconButton size='small' title='Ver estadía' onClick={() => onOpenStay(stay)}>
              <i className='ri-eye-line' />
            </IconButton>
            {kind === 'arrivals' && !stay.roomId ? (
              <Button size='small' onClick={() => onAssign(stay)}>
                Asignar
              </Button>
            ) : null}
            {kind === 'arrivals' ? (
              <Button size='small' variant='contained' onClick={() => onCheckIn(stay)}>
                Check-in
              </Button>
            ) : null}
            {kind === 'arrivals' ? (
              <Button size='small' color='secondary' onClick={() => onNoShow(stay)}>
                No llegó
              </Button>
            ) : null}
            {kind === 'departures' || kind === 'inHouse' ? (
              <Button size='small' color='warning' variant='contained' onClick={() => onCheckOut(stay)}>
                Check-out
              </Button>
            ) : null}
            {kind !== 'arrivals' || stay.reservationBalance > 0 ? (
              <Button size='small' onClick={() => onPay(stay)}>
                Pago
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export default StayList
