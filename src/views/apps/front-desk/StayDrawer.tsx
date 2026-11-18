'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import type { Reservation, Stay } from '@/types/apps/frontDeskTypes'
import { guestFullName } from '@/types/apps/frontDeskTypes'
import { BOOKING_STATUS_LABELS, formatPlanningDate, stayStatusChipSx } from '@/types/apps/reservationsTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { getLocalizedUrl } from '@/utils/i18n'
import { formatGuestPhone } from '@/utils/guestPhone'
import type { Locale } from '@configs/i18n'

type Props = {
  open: boolean
  propertyId: number
  stay: Stay | null
  onClose: () => void
}

const bookerLabel = (reservation: Reservation) => {
  const company = reservation.company
    ? `${reservation.company.businessName}${reservation.company.taxNumber ? ` · RUC ${reservation.company.taxNumber}` : ''}`
    : ''
  const guest = reservation.guest
    ? `${guestFullName(reservation.guest.firstName, reservation.guest.lastName)}${reservation.guest.documentNumber ? ` · ${reservation.guest.documentNumber}` : ''}`
    : ''

  return [company, guest].filter(Boolean).join(' · ') || '—'
}

const StayDrawer = ({ open, propertyId, stay, onClose }: Props) => {
  const { lang: locale } = useParams()
  const { canIssueInvoices } = useSubscriptionAccess()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !stay) return

    let cancelled = false

    setLoading(true)

    frontDeskApi
      .reservation(propertyId, stay.reservationUuid)
      .then(detail => {
        if (!cancelled) setReservation(detail)
      })
      .catch(error => {
        if (!cancelled) toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo cargar la estadía.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, propertyId, stay])

  const line = reservation?.rooms.find(room => room.uuid === stay?.reservationRoomUuid) ?? null

  return (
    <Drawer
      open={open}
      anchor='right'
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', md: 460 } } }}
    >
      <div className='flex items-center justify-between pli-5 plb-4'>
        <Typography variant='h5'>{reservation?.code || stay?.reservationCode || 'Reserva'}</Typography>
        <IconButton size='small' onClick={onClose} aria-label='Cerrar'>
          <i className='ri-close-line text-2xl' />
        </IconButton>
      </div>
      <Divider />
      {loading || !reservation ? (
        <div className='flex justify-center p-10'>
          <CircularProgress size={32} />
        </div>
      ) : (
        <div className='p-5 flex flex-col gap-5'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='flex flex-col gap-1'>
              <Typography variant='caption' color='text.secondary'>Quién reserva</Typography>
              <Typography fontWeight={600}>{bookerLabel(reservation)}</Typography>
            </div>
            <div className='flex flex-col gap-1'>
              <Typography variant='caption' color='text.secondary'>Celular</Typography>
              <Typography fontWeight={600}>
                {formatGuestPhone(reservation.company?.phone || reservation.guest?.phone) || 'Sin celular'}
              </Typography>
            </div>
          </div>

          {line ? (
            <div className='flex flex-col gap-2 rounded border p-4'>
              <div className='flex items-start justify-between gap-2'>
                <Typography fontWeight={600}>
                  {line.roomNumber || 'Sin número'} · {line.roomTypeName}
                </Typography>
                <Chip
                  size='small'
                  label={BOOKING_STATUS_LABELS[line.status]}
                  color={line.status === 'CONFIRMED' ? 'primary' : undefined}
                  variant={line.status === 'CONFIRMED' ? 'tonal' : 'filled'}
                  sx={line.status === 'CONFIRMED' ? undefined : stayStatusChipSx(line.status)}
                />
              </div>
              <Typography variant='body2'>
                {formatPlanningDate(line.checkInDate)} – {formatPlanningDate(line.checkOutDate)} · {line.nights} noches
              </Typography>
              <Typography variant='body2'>
                {line.pricePerNight == null
                  ? 'Sin precio hasta asignar la habitación'
                  : `${formatRoomPrice(line.pricePerNight)} / noche · ${formatRoomPrice(line.subtotal)}`}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {line.adults} adultos{line.children ? ` · ${line.children} niños` : ''}
              </Typography>
              {line.guests.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>Sin nombres</Typography>
              ) : (
                [...line.guests]
                  .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
                  .map(guest => (
                    <Typography key={guest.id} variant='body2'>
                      {guest.isPrimary ? 'Titular' : 'Acompañante'} · {guestFullName(guest.firstName, guest.lastName)}
                    </Typography>
                  ))
              )}
            </div>
          ) : (
            <Typography variant='body2' color='text.secondary'>No se encontró esta habitación en la reserva.</Typography>
          )}

          {canIssueInvoices && line?.status === 'CHECKED_IN' && reservation.balance <= 0 && stay ? (
            <Button
              variant='outlined'
              component={Link}
              href={getLocalizedUrl(`/apps/invoicing/issue?reservation=${stay.reservationUuid}`, locale as Locale)}
            >
              Facturar
            </Button>
          ) : null}
        </div>
      )}
    </Drawer>
  )
}

export default StayDrawer
