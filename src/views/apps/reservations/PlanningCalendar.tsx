'use client'

import { useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import type { Planning, PlanningBooking, PlanningMaintenance, PlanningRoom, ReservationNote } from '@/types/apps/reservationsTypes'
import {
  applyFilters,
  BAR_COLORS,
  ROOM_STATE_COLORS,
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
  notes?: ReservationNote[]
  onAnnotateDay?: (day: string) => void
  onOpenNotes?: () => void
}

/** Alto de la fila de fechas: el encabezado de cada tipo se fija justo debajo. */
const HEADER_HEIGHT = 48

const HOVER_BG = 'rgba(21, 101, 192, 0.08)'

/** Variables del tema: se ven bien en modo claro y oscuro (las etiquetas fijas necesitan fondo opaco). */
const LABEL_HOVER_BG = 'rgb(var(--mui-palette-info-mainChannel) / 0.24)'
const LABEL_HOVER_BG_DARK = 'rgb(var(--mui-palette-info-mainChannel) / 0.32)'
const TODAY_BG = 'var(--mui-palette-info-lightOpacity)'

const longDay = new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const shortWeekday = new Intl.DateTimeFormat('es-PE', { weekday: 'short', timeZone: 'UTC' })
const shortMonth = new Intl.DateTimeFormat('es-PE', { month: 'short', timeZone: 'UTC' })

const toUtcDate = (day: string) => new Date(`${day}T00:00:00Z`)

const cellHint = (roomNumber: string, day: string) => `Hab. ${roomNumber} · ${longDay.format(toUtcDate(day))} · Clic para reservar`

type LegendItem = { label: string; color: string; text?: string; dashed?: boolean }

const reservationLegend: LegendItem[] = [
  { label: 'Pendiente', color: BAR_COLORS.PENDING.bg, text: BAR_COLORS.PENDING.text, dashed: true },
  { label: 'Reservado', color: BAR_COLORS.CONFIRMED.bg, text: BAR_COLORS.CONFIRMED.text },
  { label: 'Ocupado', color: BAR_COLORS.CHECKED_IN.bg, text: BAR_COLORS.CHECKED_IN.text },
  { label: 'Finalizada', color: BAR_COLORS.CHECKED_OUT.bg, text: BAR_COLORS.CHECKED_OUT.text },
  { label: 'No se presentó', color: BAR_COLORS.NO_SHOW.bg, text: BAR_COLORS.NO_SHOW.text }
]

const roomLegend: LegendItem[] = [
  { label: 'Mantenimiento', color: ROOM_STATE_COLORS.MAINTENANCE.bg, text: ROOM_STATE_COLORS.MAINTENANCE.text }
]

const LegendSwatch = ({ item }: { item: LegendItem }) => (
  <div className='flex items-center gap-2'>
    <Box
      sx={{
        width: 14,
        height: 14,
        borderRadius: 0.5,
        bgcolor: item.color,
        border: item.dashed ? `1px dashed ${item.text ?? '#E65100'}` : 'none'
      }}
    />
            <Typography variant='caption' color='text.primary'>{item.label}</Typography>
  </div>
)

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
          {booking.reservationBalance > 0 ? ' Debe' : ''}
          {booking.arrivalOverdue || booking.departureOverdue ? ' ⚠️' : ''}
        </Box>
      </Tooltip>
    </Box>
  )
}

const MaintenanceBar = ({ block, from, to }: { block: PlanningMaintenance; from: string; to: string }) => {
  const layout = barLayout({ checkInDate: block.startsOn, checkOutDate: block.endsOn } as PlanningBooking, from, to)

  return (
    <Box sx={{ gridColumn: `${layout.column + 3} / span ${layout.span}`, gridRow: 1, minWidth: 0, zIndex: 2, alignSelf: 'center' }}>
      <Tooltip
        title={
          <div>
            <div>{block.reason}</div>
            <div>Se puede volver a reservar el {formatPlanningDate(block.endsOn)}</div>
          </div>
        }
      >
        <Box
          onClick={event => event.stopPropagation()}
          sx={{
            minHeight: 28,
            mx: '2px',
            px: 1,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 1,
            bgcolor: ROOM_STATE_COLORS.MAINTENANCE.bg,
            color: ROOM_STATE_COLORS.MAINTENANCE.text,
            cursor: 'default',
            overflow: 'hidden',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
        >
          {layout.cutLeft ? '◀ ' : ''}
          {block.reason}
          {layout.cutRight ? ' ▶' : ''}
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
  onBookingClick,
  maintenances = []
}: {
  label: string
  typeLabel?: string
  room?: PlanningRoom
  planning: Planning
  bookings: PlanningBooking[]
  maintenances?: PlanningMaintenance[]
  search: string
  highlightedUuid?: string | null
  onEmptyCell: (room: PlanningRoom, day: string) => void
  onBookingClick: (booking: PlanningBooking) => void
}) => {
  const colWidth = columnWidth(planning.view)
  const coversToday = room ? maintenances.some(block => block.startsOn <= planning.today && planning.today < block.endsOn) : false
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
        className='cal-label cal-number flex items-center gap-1 px-2'
        data-row={room?.number}
        sx={{ gridRow: 1, position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant='body2' fontWeight={600}>
          {label}
        </Typography>
        {physical === 'CLEANING' && !coversToday ? (
          <Chip size='small' label='🧹' sx={{ bgcolor: ROOM_STATE_COLORS.CLEANING.bg, color: ROOM_STATE_COLORS.CLEANING.text, height: 20 }} />
        ) : null}
        {coversToday ? (
          <Chip size='small' label='🔧' sx={{ bgcolor: ROOM_STATE_COLORS.MAINTENANCE.bg, color: ROOM_STATE_COLORS.MAINTENANCE.text, height: 20 }} />
        ) : null}
      </Box>
      <Box
        className='cal-label flex items-center px-2'
        data-row={room?.number}
        sx={{ gridRow: 1, position: 'sticky', left: 72, zIndex: 3, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant='caption' color='text.secondary'>
          {typeLabel}
        </Typography>
      </Box>
      {planning.days.map(day => {
        const today = day === planning.today
        const block = maintenances.find(item => item.startsOn <= day && day < item.endsOn)
        const cleaningToday = today && room?.status === 'CLEANING' && !block

        return (
          <Box
            key={`${label}-${day}`}
            data-day={day}
            data-row={room?.number}
            title={
              block
                ? `${block.reason}. Se puede volver a reservar el ${formatPlanningDate(block.endsOn)}`
                : room
                  ? cellHint(room.number, day)
                  : undefined
            }
            onClick={() => {
              if (!room || block) return
              onEmptyCell(room, day)
            }}
            sx={{
              gridRow: 1,
              borderRight: '1px solid',
              borderColor: 'divider',
              cursor: room && !block ? 'pointer' : 'default',
              bgcolor: block
                ? ROOM_STATE_COLORS.MAINTENANCE.bg
                : cleaningToday
                  ? ROOM_STATE_COLORS.CLEANING.bg
                  : isWeekend(day)
                    ? 'action.hover'
                    : 'transparent',
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
      {maintenances.map(block => (
        <MaintenanceBar key={block.uuid} block={block} from={planning.from} to={planning.to} />
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
  onBookingClick,
  notes = [],
  onAnnotateDay,
  onOpenNotes
}: Props) => {
  const [collapsed, setCollapsed] = useState<number[]>([])
  const filtered = useMemo(() => applyFilters(planning, roomTypeId, floorId), [floorId, planning, roomTypeId])
  const groups = useMemo(() => groupByType(filtered.rooms), [filtered.rooms])
  const colWidth = columnWidth(planning.view)
  const totalWidth = 200 + planning.days.length * colWidth
  const allCollapsed = groups.length > 0 && groups.every(group => collapsed.includes(group.roomTypeId))

  // El resaltado de día y habitación se escribe en una hoja de estilo propia para no volver a pintar las celdas.
  const hoverStyleRef = useRef<HTMLStyleElement>(null)
  const hoverKeyRef = useRef('')

  const setHover = (day?: string, row?: string) => {
    const key = `${day ?? ''}|${row ?? ''}`

    if (key === hoverKeyRef.current || !hoverStyleRef.current) return
    hoverKeyRef.current = key

    const rules: string[] = []

    if (day) rules.push(`[data-cal] [data-day="${day}"] { background-color: ${HOVER_BG} !important; }`)

    if (row) {
      rules.push(
        `[data-cal] .cal-label[data-row="${row}"] { background-color: var(--mui-palette-background-paper) !important; background-image: linear-gradient(${LABEL_HOVER_BG}, ${LABEL_HOVER_BG}); }`,
        `html[data-dark] [data-cal] .cal-label[data-row="${row}"] { background-image: linear-gradient(${LABEL_HOVER_BG_DARK}, ${LABEL_HOVER_BG_DARK}); }`,
        `[data-cal] .cal-number[data-row="${row}"] { box-shadow: inset 3px 0 0 var(--mui-palette-info-main); }`
      )
    }

    if (day && row) {
      rules.push(
        `[data-cal] [data-day="${day}"][data-row="${row}"] { background-color: rgba(21, 101, 192, 0.18) !important; outline: 2px solid #1565C0; outline-offset: -2px; }`,
        `[data-cal] .cal-head[data-day="${day}"] { background-color: #1565C0 !important; }`,
        `[data-cal] .cal-head[data-day="${day}"] * { color: #fff !important; }`
      )
    }

    hoverStyleRef.current.textContent = rules.join('\n')
  }

  const handleMouseOver = (event: MouseEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-day]')

    setHover(cell?.dataset.day, cell?.dataset.row)
  }

  const toggleGroup = (roomTypeId: number) =>
    setCollapsed(current =>
      current.includes(roomTypeId) ? current.filter(id => id !== roomTypeId) : [...current, roomTypeId]
    )

  return (
    <div>
      <style ref={hoverStyleRef} />
      {groups.length > 1 ? (
        <div className='flex justify-end mb-2'>
          <Button
            size='small'
            variant='text'
            startIcon={<i className={allCollapsed ? 'ri-expand-up-down-line' : 'ri-contract-up-down-line'} />}
            onClick={() => setCollapsed(allCollapsed ? [] : groups.map(group => group.roomTypeId))}
          >
            {allCollapsed ? 'Mostrar todos los tipos' : 'Ocultar todos los tipos'}
          </Button>
        </div>
      ) : null}
      <Box
        data-cal
        onMouseOver={handleMouseOver}
        onMouseLeave={() => setHover()}
        sx={{
          overflow: 'auto',
          maxHeight: 'max(420px, calc(100vh - 300px))',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `72px 128px repeat(${planning.days.length}, ${colWidth}px)`,
            height: HEADER_HEIGHT,
            position: 'sticky',
            top: 0,
            zIndex: 6,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',
            minWidth: totalWidth
          }}
        >
          <Box
            className='flex items-center px-2'
            sx={{ position: 'sticky', left: 0, zIndex: 7, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}
          >
            <Typography variant='caption' fontWeight={700}>
              N.º
            </Typography>
          </Box>
          <Box
            className='flex items-center px-2'
            sx={{ position: 'sticky', left: 72, zIndex: 7, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}
          >
            <Typography variant='caption' fontWeight={700}>
              Tipo
            </Typography>
          </Box>
          {planning.days.map((day, index) => {
            const today = day === planning.today
            const date = toUtcDate(day)
            const showMonth = index === 0 || dayNumber(day) === '1'

            return (
              <Box
                key={day}
                className='cal-head flex flex-col items-center justify-center'
                data-day={day}
                title={`${longDay.format(date)}. Clic para anotar este día`}
                onClick={() => onAnnotateDay?.(day)}
                sx={{
                  cursor: onAnnotateDay ? 'pointer' : undefined,
                  bgcolor: today ? TODAY_BG : isWeekend(day) ? 'action.hover' : 'background.paper',
                  boxShadow: today ? 'inset 2px 0 0 #1565C0' : undefined,
                  lineHeight: 1.1
                }}
              >
                <Typography variant='caption' sx={{ fontSize: 10, lineHeight: 1.2, color: 'inherit', opacity: 0.8 }}>
                  {showMonth ? shortMonth.format(date) : planning.view === 'MONTH' ? weekdayLetter(day) : shortWeekday.format(date)}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: today ? 800 : 600, lineHeight: 1.2, color: today ? 'info.main' : 'inherit' }}
                >
                  {dayNumber(day)}
                </Typography>
              </Box>
            )
          })}
        </Box>

        {notes.some(note => planning.days.includes(note.stayDate)) ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `72px 128px repeat(${planning.days.length}, ${colWidth}px)`,
              minWidth: totalWidth,
              alignItems: 'center',
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box
              className='flex items-center px-2'
              sx={{
                gridColumn: '1 / 3',
                height: 22,
                position: 'sticky',
                left: 0,
                zIndex: 3,
                bgcolor: 'background.paper',
                borderRight: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography variant='caption' fontWeight={700} color='warning.main'>
                Por completar
              </Typography>
            </Box>
            {planning.days.map(day => {
              const dayNotes = notes.filter(note => note.stayDate === day)

              return (
                <Tooltip
                  key={day}
                  placement='top'
                  disableHoverListener={dayNotes.length === 0}
                  title={
                    <div>
                      {dayNotes.map(note => (
                        <div key={note.uuid}>{note.text}</div>
                      ))}
                    </div>
                  }
                >
                  <Box
                    onClick={() => dayNotes.length > 0 && onOpenNotes?.()}
                    sx={{
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5,
                      cursor: dayNotes.length > 0 ? 'pointer' : 'default',
                      bgcolor: dayNotes.length > 0 ? 'var(--mui-palette-warning-lightOpacity)' : undefined,
                      borderRight: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    {dayNotes.length > 0 ? (
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main', flexShrink: 0 }} />
                    ) : null}
                    {dayNotes.length > 1 ? (
                      <Typography variant='caption' fontWeight={700} lineHeight={1}>
                        {dayNotes.length}
                      </Typography>
                    ) : null}
                  </Box>
                </Tooltip>
              )
            })}
          </Box>
        ) : null}

        {groups.map(group => {
          const unassigned = packLanes(
            filtered.bookings.filter(booking => booking.roomId === null && booking.roomTypeId === group.roomTypeId)
          )

          const hidden = collapsed.includes(group.roomTypeId)

          return (
            <div key={group.roomTypeId}>
              <Box
                className='cursor-pointer'
                onClick={() => toggleGroup(group.roomTypeId)}
                sx={{
                  position: 'sticky',
                  top: HEADER_HEIGHT,
                  zIndex: 5,
                  minWidth: totalWidth,
                  bgcolor: 'customColors.tableHeaderBg',
                  backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.04))',
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box className='inline-flex items-center gap-2 px-3 py-1.5' sx={{ position: 'sticky', left: 0 }}>
                  <IconButton size='small' aria-label={hidden ? `Mostrar ${group.name}` : `Ocultar ${group.name}`}>
                    <i className={hidden ? 'ri-arrow-right-s-line' : 'ri-arrow-down-s-line'} />
                  </IconButton>
                  <Typography fontWeight={600}>
                    {group.name} · {group.rooms.length} hab.
                  </Typography>
                </Box>
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
                      maintenances={filtered.maintenances.filter(block => block.roomId === room.id)}
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

      <div className='flex flex-wrap items-center gap-x-3 gap-y-2 mt-4'>
        {reservationLegend.map(item => (
          <LegendSwatch key={item.label} item={item} />
        ))}
        <Box aria-hidden sx={{ width: '1px', height: 14, flexShrink: 0, bgcolor: 'divider', mx: 1.5 }} />
        {roomLegend.map(item => (
          <LegendSwatch key={item.label} item={item} />
        ))}
      </div>
    </div>
  )
}

export default PlanningCalendar
