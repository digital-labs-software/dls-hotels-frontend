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
  if (room.arrival) return 'Clic: ver reserva · Clic derecho: más acciones'
  if (room.displayStatus === 'OCCUPIED') return 'Clic: ver estadía · Clic derecho: más acciones'
  if (room.displayStatus === 'MAINTENANCE') return 'Clic: ver mantenimiento · Clic derecho: más acciones'
  if (room.displayStatus === 'AVAILABLE' || room.displayStatus === 'CLEANING') {
    return 'Clic: nuevo ingreso · Clic derecho: más acciones'
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
  const showPhoto = room.displayStatus === 'AVAILABLE' && Boolean(photoUrl)
  const hint = primaryHint(room)

  return (
    <div
      role='button'
      tabIndex={0}
      title={hint}
      aria-label={`Habitación ${room.number}. ${hint}`}
      onClick={() => onPrimaryAction(room)}
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
        minHeight: 168,
        height: showPhoto ? 168 : undefined,
        backgroundColor: palette.fill,
        color: palette.ink,
        border: `1px solid ${palette.ink}`
      }}
    >
      <div className='flex items-center justify-between gap-2' style={{ minHeight: 40, padding: '10px 10px' }}>
        <Typography variant='h5' className='font-semibold leading-none'>
          {room.number}
        </Typography>
        {room.roomTypeCode ? (
          <Typography variant='body2' className='font-semibold uppercase'>
            {room.roomTypeCode}
          </Typography>
        ) : null}
      </div>
      <div style={{ height: 1, backgroundColor: palette.line }} />
      {showPhoto && photoUrl ? (
        <div className='relative overflow-hidden bg-backgroundPaper' style={{ flex: 1, minHeight: 0 }}>
          <img src={photoUrl} alt={`Habitación ${room.number}`} loading='lazy' className='is-full bs-full object-cover' />
          <button
            type='button'
            aria-label='Ver foto'
            title='Ver foto'
            className='absolute flex cursor-pointer items-center justify-center border-0 text-white'
            style={{ right: 6, bottom: 6, width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.55)' }}
            onClick={event => {
              event.stopPropagation()
              onOpenPhoto(room)
            }}
            onDoubleClick={event => event.stopPropagation()}
          >
            <i className='ri-zoom-in-line text-base leading-none' />
          </button>
        </div>
      ) : (
        <div className='flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-center' style={{ minHeight: 72 }}>
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
          ) : room.displayStatus === 'AVAILABLE' ? (
            <i className='ri-hotel-bed-line' style={{ fontSize: 40, lineHeight: 1, opacity: 0.45 }} aria-hidden />
          ) : null}
        </div>
      )}
      <div style={{ height: 1, backgroundColor: palette.line }} />
      <div className='flex flex-col items-center text-center' style={{ color: palette.ink, padding: '8px 10px' }}>
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
