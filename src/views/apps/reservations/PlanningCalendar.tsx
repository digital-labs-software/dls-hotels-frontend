'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import type { Planning, PlanningBooking, PlanningRoom } from '@/types/apps/reservationsTypes'
import {
  applyFilters,
  BAR_COLORS,
  barLayout,
  bookingInitials,
  bookingShortTitle,
  bookingTitle,
  columnWidth,
  dayNumber,
  formatPlanningDate,
  groupByType,
  isWeekend,
  matchesSearch,
  packLanes,
  weekdayLetter
} from '@/types/apps/reservationsTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'

type Props = {
  planning: Planning
  roomTypeId?: number
  floorId?: number
  search: string
  highlightedUuid?: string | null
  onEmptyCell: (room: PlanningRoom, day: string) => void
  onBookingClick: (booking: PlanningBooking) => void
}

const legend = [
  { label: 'Ocupado', color: '#EF5350' },
  { label: 'Reservado', color: '#FFB300' },
  { label: 'Pendiente', color: '#FFE082', dashed: true },
  { label: 'Finalizada', color: '#B0BEC5' },
  { label: 'Disponible', color: '#43A047' },
  { label: 'Limpieza', color: '#9E9E9E' },
  { label: 'Mant.', color: '#9E9E9E' }
]

const BookingBar = ({
  booking,
  from,
  to,
  view,
  search,
  highlighted,
  onClick
}: {
  booking: PlanningBooking
  from: string
  to: string
  view: Planning['view']
  search: string
  highlighted: boolean
  onClick: () => void
}) => {
  const layout = barLayout(booking, from, to)
  const colors = BAR_COLORS[booking.status] ?? BAR_COLORS.CONFIRMED
  const title = bookingTitle(booking)
  const compact = view === 'MONTH' || layout.span < 2
  const label = compact ? (layout.span < 1.2 ? bookingInitials(booking) : bookingShortTitle(booking)) : `${title} · ${booking.reservationCode}`
  const hit = matchesSearch(booking, search)

  return (
    <Box sx={{ gridColumn: `${layout.column + 3} / span ${layout.span}`, gridRow: 1, minWidth: 0, zIndex: 2, alignSelf: 'center' }}>
      <Tooltip
        title={
          <div>
            <div>{booking.reservationCode}</div>
            <div>{title}</div>
            <div>
              {formatPlanningDate(booking.checkInDate)} – {formatPlanningDate(booking.checkOutDate)} · {booking.nights} noches
            </div>
            <div>
              {booking.adults} adultos{booking.children ? ` · ${booking.children} niños` : ''} · {formatRoomPrice(booking.pricePerNight)}
            </div>
            <div>Saldo {formatRoomPrice(booking.reservationBalance)}</div>
          </div>
        }
      >
        <Box
          onClick={event => {
            event.stopPropagation()
            onClick()
          }}
          sx={{
            minHeight: 28,
            mx: '2px',
            px: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            borderRadius: 1,
            bgcolor: colors.bg,
            color: colors.text,
            border: colors.dashed ? `1px dashed ${colors.text}` : highlighted || hit ? '2px solid #1565C0' : '1px solid transparent',
            boxShadow: highlighted || hit ? '0 0 0 2px rgba(21,101,192,0.25)' : undefined,
            cursor: 'pointer',
            overflow: 'hidden',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
        >
          {layout.cutLeft ? '◀ ' : ''}
          {label}
          {layout.cutRight ? ' ▶' : ''}
          {booking.reservationBalance > 0 ? ' 💲' : ''}
          {booking.arrivalOverdue || booking.departureOverdue ? ' ⚠️' : ''}
        </Box>
      </Tooltip>
    </Box>
  )
}

const RoomRow = ({
  label,
  typeLabel,
  room,
  planning,
  bookings,
  search,
  highlightedUuid,
  onEmptyCell,
  onBookingClick
}: {
  label: string
  typeLabel?: string
  room?: PlanningRoom
  planning: Planning
  bookings: PlanningBooking[]
  search: string
  highlightedUuid?: string | null
  onEmptyCell: (room: PlanningRoom, day: string) => void
  onBookingClick: (booking: PlanningBooking) => void
}) => {
  const colWidth = columnWidth(planning.view)
  const physical = room && planning.days.includes(planning.today) ? room.status : null

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `72px 128px repeat(${planning.days.length}, ${colWidth}px)`,
        minHeight: 44,
        alignItems: 'stretch',
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'relative'
      }}
    >
      <Box
        className='flex items-center gap-1 px-2'
        sx={{ gridRow: 1, position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant='body2' fontWeight={600}>
          {label}
        </Typography>
        {physical === 'CLEANING' ? <Chip size='small' label='🧹' sx={{ bgcolor: '#9E9E9E', color: '#fff', height: 20 }} /> : null}
        {physical === 'MAINTENANCE' ? <Chip size='small' label='🔧' sx={{ bgcolor: '#9E9E9E', color: '#fff', height: 20 }} /> : null}
      </Box>
      <Box
        className='flex items-center px-2'
        sx={{ gridRow: 1, position: 'sticky', left: 72, zIndex: 3, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant='caption' color='text.secondary'>
          {typeLabel}
        </Typography>
      </Box>
      {planning.days.map(day => {
        const today = day === planning.today
        const blockedToday = today && room && (room.status === 'CLEANING' || room.status === 'MAINTENANCE')

        return (
          <Box
            key={`${label}-${day}`}
            onClick={() => room && onEmptyCell(room, day)}
            sx={{
              gridRow: 1,
              borderRight: '1px solid',
              borderColor: 'divider',
              cursor: room ? 'pointer' : 'default',
              bgcolor: blockedToday ? '#EEEEEE' : isWeekend(day) ? 'action.hover' : 'transparent',
              boxShadow: today ? 'inset 2px 0 0 #1565C0' : undefined
            }}
          />
        )
      })}
      {bookings.map(booking => (
        <BookingBar
          key={booking.reservationRoomUuid}
          booking={booking}
          from={planning.from}
          to={planning.to}
          view={planning.view}
          search={search}
          highlighted={highlightedUuid === booking.reservationUuid}
          onClick={() => onBookingClick(booking)}
        />
      ))}
    </Box>
  )
}

const PlanningCalendar = ({
  planning,
  roomTypeId,
  floorId,
  search,
  highlightedUuid,
  onEmptyCell,
  onBookingClick
}: Props) => {
  const [collapsed, setCollapsed] = useState<number[]>([])
  const filtered = useMemo(() => applyFilters(planning, roomTypeId, floorId), [floorId, planning, roomTypeId])
  const groups = useMemo(() => groupByType(filtered.rooms), [filtered.rooms])
  const colWidth = columnWidth(planning.view)

  return (
    <div>
      <Box sx={{ overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `72px 128px repeat(${planning.days.length}, ${colWidth}px)`,
            position: 'sticky',
            top: 0,
            zIndex: 4,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            minWidth: 200 + planning.days.length * colWidth
          }}
        >
          <Box className='px-2 py-2' sx={{ position: 'sticky', left: 0, zIndex: 5, bgcolor: 'background.paper' }}>
            <Typography variant='caption' fontWeight={700}>
              N.º
            </Typography>
          </Box>
          <Box className='px-2 py-2' sx={{ position: 'sticky', left: 72, zIndex: 5, bgcolor: 'background.paper' }}>
            <Typography variant='caption' fontWeight={700}>
              Tipo
            </Typography>
          </Box>
          {planning.days.map(day => (
            <Box
              key={day}
              className='px-1 py-2 text-center'
              sx={{
                bgcolor: isWeekend(day) ? 'action.hover' : 'background.paper',
                boxShadow: day === planning.today ? 'inset 2px 0 0 #1565C0' : undefined
              }}
            >
              <Typography variant='caption' fontWeight={day === planning.today ? 700 : 500}>
                {weekdayLetter(day)} {dayNumber(day)}
              </Typography>
            </Box>
          ))}
        </Box>

        {groups.map(group => {
          const unassigned = packLanes(
            filtered.bookings.filter(booking => booking.roomId === null && booking.roomTypeId === group.roomTypeId)
          )
          const hidden = collapsed.includes(group.roomTypeId)

          return (
            <div key={group.roomTypeId}>
              <Box
                className='flex items-center gap-2 px-3 py-2 cursor-pointer'
                sx={{ bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}
                onClick={() =>
                  setCollapsed(current =>
                    current.includes(group.roomTypeId)
                      ? current.filter(id => id !== group.roomTypeId)
                      : [...current, group.roomTypeId]
                  )
                }
              >
                <IconButton size='small'>
                  <i className={hidden ? 'ri-arrow-right-s-line' : 'ri-arrow-down-s-line'} />
                </IconButton>
                <Typography fontWeight={600}>
                  {group.name} · {group.rooms.length} hab.
                </Typography>
              </Box>
              {hidden ? null : (
                <>
                  {unassigned.map((lane, index) => (
                    <RoomRow
                      key={`unassigned-${group.roomTypeId}-${index}`}
                      label={index === 0 ? 'Sin asignar' : ''}
                      typeLabel={group.name}
                      planning={planning}
                      bookings={lane}
                      search={search}
                      highlightedUuid={highlightedUuid}
                      onEmptyCell={onEmptyCell}
                      onBookingClick={onBookingClick}
                    />
                  ))}
                  {group.rooms.map(room => (
                    <RoomRow
                      key={room.id}
                      label={room.number}
                      typeLabel={room.roomTypeName}
                      room={room}
                      planning={planning}
                      bookings={filtered.bookings.filter(booking => booking.roomId === room.id)}
                      search={search}
                      highlightedUuid={highlightedUuid}
                      onEmptyCell={onEmptyCell}
                      onBookingClick={onBookingClick}
                    />
                  ))}
                </>
              )}
            </div>
          )
        })}
      </Box>

      <div className='flex flex-wrap gap-3 mt-4'>
        {legend.map(item => (
          <div key={item.label} className='flex items-center gap-2'>
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: 0.5,
                bgcolor: item.color,
                border: item.dashed ? '1px dashed #3E2723' : 'none'
              }}
            />
            <Typography variant='caption'>{item.label}</Typography>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PlanningCalendar
