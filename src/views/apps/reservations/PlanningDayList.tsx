'use client'

import { useMemo } from 'react'

import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import type { Planning, PlanningBooking, PlanningRoom } from '@/types/apps/reservationsTypes'
import {
  applyFilters,
  arrivesToday,
  dayStatus,
  formatPlanningDate,
  leavesToday
} from '@/types/apps/reservationsTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'

type Props = {
  planning: Planning
  day: string
  roomTypeId?: number
  onBookingClick: (booking: PlanningBooking) => void
  onAvailableRoom: (room: PlanningRoom) => void
  onUnassigned: (bookings: PlanningBooking[]) => void
}

const PlanningDayList = ({ planning, day, roomTypeId, onBookingClick, onAvailableRoom, onUnassigned }: Props) => {
  const filtered = useMemo(() => applyFilters(planning, roomTypeId), [planning, roomTypeId])
  const unassigned = filtered.bookings.filter(booking => booking.roomId === null)
  const departing = filtered.bookings.filter(booking => leavesToday(booking, day))

  return (
    <div className='flex flex-col gap-3'>
      {unassigned.length > 0 ? (
        <Alert severity='warning' onClick={() => onUnassigned(unassigned)} sx={{ cursor: 'pointer' }}>
          {unassigned.length} reserva{unassigned.length === 1 ? '' : 's'} sin habitación
        </Alert>
      ) : null}

      {filtered.rooms.map(room => {
        const status = dayStatus(room, filtered.bookings, day, planning.today)
        const booking = status.booking
        const leaving = departing.find(item => item.roomId === room.id)

        return (
          <Card key={room.id} variant='outlined'>
            <CardActionArea
              onClick={() => {
                if (booking) {
                  onBookingClick(booking)
                } else {
                  onAvailableRoom(room)
                }
              }}
            >
              <CardContent className='flex flex-col gap-2'>
                <div className='flex items-center justify-between gap-2'>
                  <Typography fontWeight={700}>
                    {room.number} · {room.roomTypeName}
                  </Typography>
                  <Chip size='small' label={status.label} sx={{ bgcolor: status.color, color: status.label === 'Pendiente' ? '#3E2723' : '#fff' }} />
                </div>
                {booking ? (
                  <>
                    <Typography>
                      👤 {booking.guestName || booking.companyName || booking.reservationCode}
                    </Typography>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Typography variant='body2' color='text.secondary'>
                        {formatPlanningDate(booking.checkInDate)} – {formatPlanningDate(booking.checkOutDate)}
                      </Typography>
                      {booking.reservationBalance > 0 ? (
                        <Chip size='small' color='error' label={`💲 ${formatRoomPrice(booking.reservationBalance)}`} />
                      ) : null}
                      {arrivesToday(booking, day) ? <Chip size='small' color='info' label='Llega hoy' /> : null}
                    </div>
                  </>
                ) : (
                  <div className='flex flex-wrap items-center gap-2'>
                    <Typography variant='body2' color='text.secondary'>
                      Lista para reservar
                    </Typography>
                    {leaving ? <Chip size='small' color='warning' label={`Sale hoy · ${leaving.guestName || leaving.reservationCode}`} /> : null}
                  </div>
                )}
              </CardContent>
            </CardActionArea>
          </Card>
        )
      })}
    </div>
  )
}

export default PlanningDayList
