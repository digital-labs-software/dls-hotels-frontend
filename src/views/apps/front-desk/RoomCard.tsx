'use client'

import Typography from '@mui/material/Typography'

import type { RackRoom, RackStatus } from '@/types/apps/frontDeskTypes'
import { RACK_STATUS_LABELS } from '@/types/apps/frontDeskTypes'
import { ROOM_PHOTO_THUMB, cloudinaryTransformedUrl } from '@/libs/cloudinary'

type Props = {
  room: RackRoom
  onOpenMenu: (event: React.MouseEvent<HTMLElement>, room: RackRoom) => void
  onPrimaryAction: (room: RackRoom) => void
  onOpenPhoto: (room: RackRoom) => void
}

const STATUS_COLORS: Record<RackStatus, { fill: string; ink: string; line: string }> = {
  AVAILABLE: {
    fill: 'var(--mui-palette-success-lightOpacity)',
    ink: 'var(--mui-palette-success-main)',
    line: 'var(--mui-palette-success-mainOpacity)'
  },
  OCCUPIED: {
    fill: 'var(--mui-palette-error-lightOpacity)',
    ink: 'var(--mui-palette-error-main)',
    line: 'var(--mui-palette-error-mainOpacity)'
  },
  CLEANING: {
    fill: 'var(--mui-palette-info-lightOpacity)',
    ink: 'var(--mui-palette-info-main)',
    line: 'var(--mui-palette-info-mainOpacity)'
  },
  MAINTENANCE: {
    fill: 'var(--mui-palette-warning-lightOpacity)',
    ink: 'var(--mui-palette-warning-main)',
    line: 'var(--mui-palette-warning-mainOpacity)'
  },
  RESERVED: {
    fill: 'var(--mui-palette-primary-lightOpacity)',
    ink: 'var(--mui-palette-primary-main)',
    line: 'var(--mui-palette-primary-mainOpacity)'
  }
}

const arrivalName = (room: RackRoom) =>
  room.arrival?.guestName || room.arrival?.bookerName || room.arrival?.companyName || null

const primaryHint = (room: RackRoom) => {
  if (room.arrival) return 'Doble clic: ver reserva · Clic derecho: más acciones'
  if (room.displayStatus === 'OCCUPIED') return 'Doble clic: ver estadía · Clic derecho: más acciones'
  if (room.displayStatus === 'MAINTENANCE') return 'Doble clic: ver mantenimiento · Clic derecho: más acciones'
  if (room.displayStatus === 'AVAILABLE' || room.displayStatus === 'CLEANING') {
    return 'Doble clic: nuevo ingreso · Clic derecho: más acciones'
  }

  return 'Clic derecho: más acciones'
}

const RoomCard = ({ room, onOpenMenu, onPrimaryAction, onOpenPhoto }: Props) => {
  const palette = STATUS_COLORS[room.displayStatus] ?? STATUS_COLORS.AVAILABLE
  const holder =
    room.displayStatus === 'OCCUPIED'
      ? room.currentStay?.guestName
      : room.displayStatus === 'RESERVED'
        ? arrivalName(room)
        : null
  const needsCleaning = room.displayStatus === 'RESERVED' && room.status === 'CLEANING'
  const statusLabel = RACK_STATUS_LABELS[room.displayStatus]
  const photoUrl = room.photoUrl ? cloudinaryTransformedUrl(room.photoUrl, ROOM_PHOTO_THUMB) || room.photoUrl : null
  const hint = primaryHint(room)

  return (
    <div
      role='button'
      tabIndex={0}
      title={hint}
      aria-label={`Habitación ${room.number}. ${hint}`}
      onDoubleClick={() => onPrimaryAction(room)}
      onContextMenu={event => {
        event.preventDefault()
        onOpenMenu(event, room)
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault()
          onPrimaryAction(room)
        }
      }}
      className='cursor-pointer rounded-md flex flex-col overflow-hidden'
      style={{
        width: 220,
        minHeight: photoUrl ? undefined : 168,
        backgroundColor: photoUrl ? undefined : palette.fill,
        color: photoUrl ? undefined : palette.ink,
        border: `1px solid ${palette.ink}`
      }}
    >
      {photoUrl ? (
        <button
          type='button'
          className='relative overflow-hidden bg-backgroundPaper'
          style={{ height: 150 }}
          onClick={event => {
            event.stopPropagation()
            onOpenPhoto(room)
          }}
          onDoubleClick={event => event.stopPropagation()}
          onContextMenu={event => {
            event.preventDefault()
            event.stopPropagation()
            onOpenMenu(event, room)
          }}
        >
          <img src={photoUrl} alt={`Habitación ${room.number}`} loading='lazy' className='is-full bs-full object-cover' />
          <Typography
            variant='h5'
            className='absolute font-semibold leading-none text-white'
            style={{ top: 8, left: 8, textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
          >
            {room.number}
          </Typography>
          {holder ? (
            <Typography
              variant='body2'
              className='absolute inset-0 flex items-center justify-center px-3 text-center font-medium uppercase text-white'
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
            >
              {holder}
            </Typography>
          ) : room.displayStatus === 'MAINTENANCE' && room.maintenanceReason ? (
            <Typography
              variant='body2'
              className='absolute inset-0 flex items-center justify-center px-3 text-center font-medium text-white'
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
            >
              {room.maintenanceReason}
            </Typography>
          ) : null}
        </button>
      ) : (
        <div className='flex flex-1 flex-col'>
          <div className='flex items-center' style={{ padding: '10px 10px' }}>
            <Typography variant='h5' className='font-semibold leading-none'>
              {room.number}
            </Typography>
          </div>
          <div style={{ height: 1, backgroundColor: palette.line }} />
          <div className='flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-center'>
            {holder ? (
              <>
                <i className='ri-user-line shrink-0 text-base leading-none' />
                <Typography variant='body1' className='font-medium uppercase'>
                  {holder}
                </Typography>
              </>
            ) : room.displayStatus === 'MAINTENANCE' && room.maintenanceReason ? (
              <Typography variant='body1' className='font-medium'>
                {room.maintenanceReason}
              </Typography>
            ) : (
              <>
                <i className='ri-hotel-bed-line shrink-0 text-base leading-none' />
                <Typography variant='body1' className='font-medium'>
                  {room.number}
                </Typography>
              </>
            )}
          </div>
          <div style={{ height: 1, backgroundColor: palette.line }} />
        </div>
      )}
      <div
        className='flex flex-col items-center text-center'
        style={
          photoUrl
            ? { backgroundColor: palette.fill, color: palette.ink, padding: '8px 10px' }
            : { color: palette.ink, padding: '8px 10px' }
        }
      >
        <Typography variant='body2' className='font-semibold uppercase' color='inherit'>
          {statusLabel}
        </Typography>
        {needsCleaning ? (
          <Typography variant='caption' className='font-semibold uppercase' color='info.main'>
            Limpieza
          </Typography>
        ) : null}
      </div>
    </div>
  )
}

export default RoomCard
