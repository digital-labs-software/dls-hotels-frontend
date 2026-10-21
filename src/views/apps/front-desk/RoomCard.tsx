'use client'

import Typography from '@mui/material/Typography'

import type { RackRoom, RackStatus } from '@/types/apps/frontDeskTypes'
import { RACK_STATUS_LABELS } from '@/types/apps/frontDeskTypes'
import { ROOM_PHOTO_THUMB, cloudinaryTransformedUrl } from '@/libs/cloudinary'

type ViewMode = 'compact' | 'photos'

type Props = {
  room: RackRoom
  view: ViewMode
  onOpenMenu: (event: React.MouseEvent<HTMLElement>, room: RackRoom) => void
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
  }
}

function HeaderButton({
  icon,
  label,
  ink,
  round,
  onClick
}: {
  icon: string
  label: string
  ink: string
  round?: boolean
  onClick: (event: React.MouseEvent<HTMLElement>) => void
}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      onClick={event => {
        event.stopPropagation()
        onClick(event)
      }}
      className={`inline-flex items-center justify-center bg-transparent ${round ? 'rounded-full' : 'rounded'}`}
      style={{ width: 22, height: 22, border: `1px solid ${ink}`, color: ink }}
    >
      <i className={`${icon} text-sm leading-none`} />
    </button>
  )
}

const RoomCard = ({ room, view, onOpenMenu, onOpenPhoto }: Props) => {
  const palette = STATUS_COLORS[room.displayStatus] ?? STATUS_COLORS.AVAILABLE
  const compact = view === 'compact'
  const holder = room.displayStatus === 'OCCUPIED' ? room.currentStay?.guestName : null
  const statusLabel = RACK_STATUS_LABELS[room.displayStatus]
  const photoUrl = room.photoUrl ? cloudinaryTransformedUrl(room.photoUrl, ROOM_PHOTO_THUMB) || room.photoUrl : null

  const openMenu = (event: React.MouseEvent<HTMLElement>) => onOpenMenu(event, room)

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={openMenu}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          openMenu(event as unknown as React.MouseEvent<HTMLElement>)
        }
      }}
      className='cursor-pointer rounded-md flex flex-col overflow-hidden'
      style={{
        width: compact ? 148 : 220,
        minHeight: photoUrl ? undefined : compact ? 118 : 168,
        backgroundColor: photoUrl ? undefined : palette.fill,
        color: photoUrl ? undefined : palette.ink,
        border: `1px solid ${palette.ink}`
      }}
    >
      {photoUrl ? (
        <button
          type='button'
          className='relative overflow-hidden bg-backgroundPaper'
          style={{ height: compact ? 96 : 150 }}
          onClick={event => {
            event.stopPropagation()
            onOpenPhoto(room)
          }}
        >
          <img src={photoUrl} alt={`Habitación ${room.number}`} loading='lazy' className='is-full bs-full object-cover' />
          <Typography
            variant={compact ? 'h6' : 'h5'}
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
          ) : null}
        </button>
      ) : (
        <div className='flex flex-1 flex-col'>
          <div
            className='flex items-center justify-between gap-1'
            style={{ padding: compact ? '8px 8px' : '10px 10px' }}
          >
            <Typography variant={compact ? 'h6' : 'h5'} className='font-semibold leading-none'>
              {room.number}
            </Typography>
            <div className='flex items-center gap-1'>
              {room.displayStatus === 'OCCUPIED' ? (
                <>
                  <HeaderButton icon='ri-add-line' label='Acciones' ink={palette.ink} onClick={openMenu} />
                  <HeaderButton icon='ri-arrow-right-s-line' label='Acciones' ink={palette.ink} onClick={openMenu} />
                </>
              ) : null}
              {room.displayStatus === 'AVAILABLE' ? (
                <HeaderButton icon='ri-add-line' label='Acciones' ink={palette.ink} round onClick={openMenu} />
              ) : null}
              {room.displayStatus === 'CLEANING' ? (
                <HeaderButton icon='ri-pencil-line' label='Cambiar estado' ink={palette.ink} onClick={openMenu} />
              ) : null}
            </div>
          </div>
          <div style={{ height: 1, backgroundColor: palette.line }} />
          <div className='flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-center'>
            {holder ? (
              <>
                <i className='ri-user-line shrink-0 text-base leading-none' />
                <Typography variant={compact ? 'body2' : 'body1'} className='font-medium uppercase'>
                  {holder}
                </Typography>
              </>
            ) : (
              <>
                <i className='ri-hotel-bed-line shrink-0 text-base leading-none' />
                <Typography variant={compact ? 'body2' : 'body1'} className='font-medium'>
                  {room.number}
                </Typography>
              </>
            )}
          </div>
          <div style={{ height: 1, backgroundColor: palette.line }} />
        </div>
      )}
      <Typography
        variant={compact ? 'caption' : 'body2'}
        className='block text-center font-semibold uppercase'
        style={
          photoUrl
            ? { backgroundColor: palette.fill, color: palette.ink, padding: compact ? '6px 8px' : '8px 10px' }
            : { color: palette.ink, padding: compact ? '6px 8px' : '8px 10px' }
        }
      >
        {statusLabel}
      </Typography>
    </div>
  )
}

export default RoomCard
