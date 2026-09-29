'use client'

import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import type { RackRoom, RackStatus } from '@/types/apps/frontDeskTypes'
import { formatFrontDeskDate as formatDate } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice as formatPrice } from '@/types/apps/roomsTypes'

type ViewMode = 'compact' | 'photos'

type Props = {
  room: RackRoom
  view: ViewMode
  onOpenMenu: (event: React.MouseEvent<HTMLElement>, room: RackRoom) => void
  onOpenPhoto: (room: RackRoom) => void
}

const STATUS_COLORS: Record<RackStatus, { light: string; dark: string; border: string }> = {
  AVAILABLE: { light: '#E8F5E9', dark: '#1B5E20', border: '#2E7D32' },
  OCCUPIED: { light: '#FFEBEE', dark: '#7F1D1D', border: '#C62828' },
  CLEANING: { light: '#FFF8E1', dark: '#7A5800', border: '#F9A825' },
  MAINTENANCE: { light: '#EEEEEE', dark: '#424242', border: '#616161' }
}

const RoomCard = ({ room, view, onOpenMenu, onOpenPhoto }: Props) => {
  const theme = useTheme()
  const palette = STATUS_COLORS[room.displayStatus] ?? STATUS_COLORS.AVAILABLE
  const isDark = theme.palette.mode === 'dark'
  const stay = room.currentStay
  const compact = view === 'compact'

  const photo = (
    <button
      type='button'
      className={`overflow-hidden bg-backgroundPaper flex items-center justify-center ${compact ? 'rounded-full is-11 bs-11' : 'rounded-md is-full'}`}
      style={compact ? undefined : { height: 200 }}
      onClick={event => {
        event.stopPropagation()
        onOpenPhoto(room)
      }}
    >
      {room.photoUrl ? (
        <img src={room.photoUrl} alt={`Habitación ${room.number}`} loading='lazy' className='is-full bs-full object-cover' />
      ) : (
        <div className='flex flex-col items-center justify-center gap-1 pli-2'>
          <i className='ri-hotel-bed-line text-2xl' />
          {!compact ? (
            <Typography variant='caption' color='text.secondary' className='text-center'>
              {room.roomTypeName}
            </Typography>
          ) : null}
        </div>
      )}
    </button>
  )

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={event => onOpenMenu(event, room)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          onOpenMenu(event as unknown as React.MouseEvent<HTMLElement>, room)
        }
      }}
      className='cursor-pointer rounded-md flex flex-col gap-1.5 overflow-hidden'
      style={{
        width: compact ? 136 : 280,
        backgroundColor: isDark ? alpha(palette.border, 0.22) : palette.light,
        border: `1px solid ${palette.border}`,
        color: isDark ? theme.palette.text.primary : palette.border,
        padding: compact ? 10 : 12
      }}
    >
      <div className={`flex ${compact ? 'items-start gap-2' : 'flex-col gap-2'}`}>
        {photo}
        <div className='flex-1 min-is-0'>
          <div className='flex items-start justify-between gap-1'>
            <Typography variant={compact ? 'h5' : 'h4'} className='font-semibold leading-none'>
              {room.number}
            </Typography>
            <Typography variant='body2' className='font-medium whitespace-nowrap'>
              {formatPrice(room.effectivePrice)}
            </Typography>
          </div>
          <Typography variant='caption' className='block truncate'>
            {room.roomTypeName}
          </Typography>
        </div>
      </div>

      {stay?.guestName ? (
        <Typography variant='body2' className='truncate'>
          <i className='ri-user-line text-base mie-1' />
          {stay.guestName}
        </Typography>
      ) : null}

      {stay ? (
        <Typography variant='caption'>Sale: {formatDate(stay.checkOutDate)}</Typography>
      ) : null}

      {room.arrival ? (
        <Typography variant='caption' className='truncate'>
          Llega hoy · {room.arrival.guestName || room.arrival.reservationCode}
        </Typography>
      ) : null}

      <div className='flex flex-wrap gap-1'>
        {room.arrival ? <Chip size='small' label='Llega hoy' sx={{ bgcolor: '#1565C0', color: 'white' }} /> : null}
        {room.departureDue ? <Chip size='small' label='Sale hoy' sx={{ bgcolor: '#EF6C00', color: 'white' }} /> : null}
        {room.arrival?.arrivalOverdue ? (
          <Chip size='small' label='Llegada atrasada' sx={{ bgcolor: '#6A1B9A', color: 'white' }} />
        ) : null}
        {stay?.departureOverdue ? (
          <Chip size='small' label='Salida vencida' sx={{ bgcolor: '#6A1B9A', color: 'white' }} />
        ) : null}
        {(stay?.reservationBalance ?? room.arrival?.reservationBalance ?? 0) > 0 ? (
          <Chip
            size='small'
            label={`Saldo ${formatPrice(stay?.reservationBalance ?? room.arrival?.reservationBalance)}`}
            sx={{ bgcolor: '#B71C1C', color: 'white' }}
          />
        ) : null}
        {(stay?.reservationBalance ?? room.arrival?.reservationBalance ?? 0) < 0 ? (
          <Chip
            size='small'
            label={`A favor ${formatPrice(Math.abs(stay?.reservationBalance ?? room.arrival?.reservationBalance ?? 0))}`}
            sx={{ bgcolor: '#01579B', color: 'white' }}
          />
        ) : null}
        {room.notes ? (
          <Tooltip title={room.notes}>
            <Chip size='small' label={<i className='ri-sticky-note-line' />} variant='outlined' />
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}

export default RoomCard
