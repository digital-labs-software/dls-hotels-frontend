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
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import type { Guest } from '@/types/apps/clientsTypes'
import type { FrontDeskPayment, Reservation, Stay } from '@/types/apps/frontDeskTypes'
import { formatFrontDeskDate, guestFullName, PAYMENT_METHOD_LABELS, STAY_STATUS_LABELS } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import BalanceChip from './BalanceChip'
import GuestPicker from './GuestPicker'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { getLocalizedUrl } from '@/utils/i18n'
import type { Locale } from '@configs/i18n'

type Props = {
  open: boolean
  propertyId: number
  stay: Stay | null
  onClose: () => void
  onSuccess: () => void
  onPay: (stay: Stay) => void
  onCheckOut: (stay: Stay) => void
}

const StayDrawer = ({ open, propertyId, stay, onClose, onSuccess, onPay, onCheckOut }: Props) => {
  const { lang: locale } = useParams()
  const { canIssueInvoices } = useSubscriptionAccess()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [payments, setPayments] = useState<FrontDeskPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [checkOutDate, setCheckOutDate] = useState('')
  const [adults, setAdults] = useState('')
  const [children, setChildren] = useState('')
  const [saving, setSaving] = useState(false)

  const line = reservation?.rooms.find(room => room.uuid === stay?.reservationRoomUuid) ?? reservation?.rooms[0]

  const load = async () => {
    if (!stay) {
      return
    }

    setLoading(true)

    try {
      const [detail, paymentRows] = await Promise.all([
        frontDeskApi.reservation(propertyId, stay.reservationUuid),
        frontDeskApi.payments(propertyId, stay.reservationUuid)
      ])

      setReservation(detail)
      setPayments(paymentRows)

      const current = detail.rooms.find(room => room.uuid === stay.reservationRoomUuid) ?? detail.rooms[0]

      setCheckOutDate(current?.checkOutDate ?? stay.checkOutDate)
      setAdults(String(current?.adults ?? stay.adults))
      setChildren(String(current?.children ?? stay.children))
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo cargar la estadía.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && stay) {
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stay?.reservationUuid])

  const handleAddGuest = async (guest: Guest | null) => {
    if (!guest || !line) {
      return
    }

    try {
      await frontDeskApi.addLineGuest(propertyId, line.uuid, { guestId: guest.id })
      toast.success('Acompañante agregado.')
      await load()
      onSuccess()
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo agregar el huésped.'))
    }
  }

  const handlePrimary = async (guestRecordId: number) => {
    if (!line) {
      return
    }

    try {
      await frontDeskApi.patchLineGuest(propertyId, line.uuid, guestRecordId, { isPrimary: true })
      toast.success('Titular actualizado.')
      await load()
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo cambiar el titular.'))
    }
  }

  const handleRemove = async (guestRecordId: number) => {
    if (!line) {
      return
    }

    try {
      await frontDeskApi.removeLineGuest(propertyId, line.uuid, guestRecordId)
      toast.success('Huésped retirado.')
      await load()
      onSuccess()
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo quitar el huésped.'))
    }
  }

  const handleSaveLine = async () => {
    if (!stay || !line) {
      return
    }

    setSaving(true)

    try {
      await frontDeskApi.patchRoomLine(propertyId, stay.reservationUuid, line.uuid, {
        checkOutDate,
        adults: Number(adults),
        children: Number(children)
      })
      toast.success('Estadía actualizada.')
      await load()
      onSuccess()
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo actualizar la estadía.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      anchor='right'
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 320, sm: 460 } } }}
    >
      <div className='flex items-center justify-between pli-5 plb-4'>
        <Typography variant='h5'>Estadía {reservation?.code || stay?.reservationCode || ''}</Typography>
        <IconButton size='small' onClick={onClose}>
          <i className='ri-close-line text-2xl' />
        </IconButton>
      </div>
      <Divider />
      {loading ? (
        <div className='flex justify-center p-10'>
          <CircularProgress size={32} />
        </div>
      ) : (
        <div className='p-5 flex flex-col gap-4'>
          {reservation ? (
            <>
              <div className='flex flex-wrap gap-2'>
                <Chip size='small' label={STAY_STATUS_LABELS[reservation.status] ?? reservation.status} />
                <Chip size='small' variant='tonal' label={line?.roomNumber || 'Sin habitación'} />
              </div>
              <Typography>
                {guestFullName(reservation.guest?.firstName, reservation.guest?.lastName) || stay?.guestName || '—'}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {formatFrontDeskDate(line?.checkInDate)} – {formatFrontDeskDate(line?.checkOutDate)} · {line?.nights} noche
                {line?.nights === 1 ? '' : 's'}
              </Typography>
              <div className='flex flex-wrap items-center gap-2'>
                <Typography variant='body2'>
                  Total {formatRoomPrice(reservation.totalAmount)} · Pagado {formatRoomPrice(reservation.paidAmount)}
                </Typography>
                <BalanceChip balance={reservation.balance} />
              </div>
              <div className='flex gap-2'>
                <Button variant='contained' onClick={() => stay && onPay(stay)}>
                  Registrar pago
                </Button>
                {canIssueInvoices && stay ? (
                  <Button
                    variant='outlined'
                    component={Link}
                    href={getLocalizedUrl(`/apps/invoicing/issue?reservation=${stay.reservationUuid}`, locale as Locale)}
                  >
                    Facturar
                  </Button>
                ) : null}
                {stay?.status === 'CHECKED_IN' ? (
                  <Button color='warning' variant='outlined' onClick={() => stay && onCheckOut(stay)}>
                    Check-out (salida)
                  </Button>
                ) : null}
              </div>
              <Divider />
              <Typography className='font-medium'>Huéspedes</Typography>
              {(line?.guests ?? []).map(guest => (
                <div key={guest.id} className='flex items-center justify-between gap-2'>
                  <div>
                    <Typography>
                      {guestFullName(guest.firstName, guest.lastName)} {guest.isPrimary ? '(titular)' : ''}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {[guest.documentType, guest.documentNumber].filter(Boolean).join(' ')}
                    </Typography>
                  </div>
                  <div className='flex'>
                    {!guest.isPrimary ? (
                      <IconButton size='small' title='Hacer titular' onClick={() => handlePrimary(guest.id)}>
                        <i className='ri-star-line' />
                      </IconButton>
                    ) : null}
                    <IconButton size='small' title='Quitar' onClick={() => handleRemove(guest.id)}>
                      <i className='ri-delete-bin-7-line' />
                    </IconButton>
                  </div>
                </div>
              ))}
              <GuestPicker key={line?.guests.length ?? 0} propertyId={propertyId} label='Agregar acompañante' onSelect={handleAddGuest} />
              <Divider />
              <Typography className='font-medium'>Ajustar estadía</Typography>
              <TextField
                type='date'
                label='Check-out (salida)'
                value={checkOutDate}
                onChange={e => setCheckOutDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <div className='flex gap-3'>
                <TextField label='Adultos' value={adults} onChange={e => setAdults(e.target.value)} />
                <TextField label='Niños' value={children} onChange={e => setChildren(e.target.value)} />
              </div>
              <Button variant='outlined' disabled={saving} onClick={handleSaveLine}>
                {saving ? <CircularProgress size={18} /> : 'Guardar cambios'}
              </Button>
              <Divider />
              <Typography className='font-medium'>Pagos</Typography>
              {payments.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>
                  Sin pagos registrados
                </Typography>
              ) : (
                payments.map(payment => (
                  <div key={payment.uuid} className='flex justify-between gap-2'>
                    <Typography variant='body2'>
                      {payment.amount < 0 ? 'Devolución' : 'Cobro'} · {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                    </Typography>
                    <Typography variant='body2' color={payment.amount < 0 ? 'error' : 'inherit'}>
                      {formatRoomPrice(payment.amount)}
                    </Typography>
                  </div>
                ))
              )}
            </>
          ) : null}
        </div>
      )}
    </Drawer>
  )
}

export default StayDrawer
