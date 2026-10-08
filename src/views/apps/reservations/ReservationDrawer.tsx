'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

import { toast } from 'react-toastify'

import type { Company, Guest } from '@/types/apps/clientsTypes'
import type { FrontDeskPayment, Reservation, ReservationRoom } from '@/types/apps/frontDeskTypes'
import { STAY_STATUS_LABELS } from '@/types/apps/frontDeskTypes'
import type { ReservationSource } from '@/types/apps/reservationsTypes'
import { EXTERNAL_CODE_SOURCES, formatPlanningDate, PAYMENT_LABELS, SOURCE_LABELS, SOURCE_OPTIONS } from '@/types/apps/reservationsTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import GuestPicker from '@views/apps/front-desk/GuestPicker'
import AssignReservationRoomDialog from './AssignReservationRoomDialog'
import CompanyPicker from './CompanyPicker'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { getLocalizedUrl } from '@/utils/i18n'
import type { Locale } from '@configs/i18n'

type Props = {
  open: boolean
  propertyId: number
  reservationUuid: string | null
  today: string
  highlightAssign?: boolean
  onClose: () => void
  onChanged: () => void
  onPay: (uuid: string, balance: number) => void
}

const ReservationDrawer = ({
  open,
  propertyId,
  reservationUuid,
  today,
  highlightAssign,
  onClose,
  onChanged,
  onPay
}: Props) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { lang: locale } = useParams()
  const { canIssueInvoices } = useSubscriptionAccess()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [payments, setPayments] = useState<FrontDeskPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [source, setSource] = useState<ReservationSource>('PHONE')
  const [externalCode, setExternalCode] = useState('')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [notes, setNotes] = useState('')
  const [guestId, setGuestId] = useState<number | null>(null)
  const [companyId, setCompanyId] = useState<number | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [assignLine, setAssignLine] = useState<ReservationRoom | null>(null)

  const load = async () => {
    if (!reservationUuid) {
      return
    }

    setLoading(true)

    try {
      const [detail, paymentRows] = await Promise.all([
        reservationsApi.get(propertyId, reservationUuid),
        reservationsApi.payments(propertyId, reservationUuid)
      ])

      setReservation(detail)
      setPayments(paymentRows)
      setSource(detail.source)
      setExternalCode(detail.externalCode ?? '')
      setDiscountAmount(String(detail.discountAmount ?? 0))
      setNotes(detail.notes ?? '')
      setGuestId(detail.guestId)
      setCompanyId(detail.companyId)
      setEditing(false)
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo cargar la reserva.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && reservationUuid) {
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reservationUuid])

  const afterAction = async (message: string) => {
    toast.success(message)
    await load()
    onChanged()
  }

  const handleConfirm = async () => {
    if (!reservation) return

    setSaving(true)

    try {
      await reservationsApi.update(propertyId, reservation.uuid, { status: 'CONFIRMED' })
      await afterAction('Reserva confirmada.')
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo confirmar.'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!reservation) return

    setSaving(true)

    try {
      await reservationsApi.update(propertyId, reservation.uuid, {
        guestId,
        companyId,
        source,
        externalCode: EXTERNAL_CODE_SOURCES.includes(source) ? externalCode.trim() || null : null,
        discountAmount: Number(discountAmount) || 0,
        notes: notes.trim() || null
      })
      await afterAction('Reserva actualizada.')
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo guardar.'))
    } finally {
      setSaving(false)
    }
  }

  const handleNoShow = async (line: ReservationRoom) => {
    if (!reservation) return

    setSaving(true)

    try {
      await reservationsApi.updateRoom(propertyId, reservation.uuid, line.uuid, { status: 'NO_SHOW' })
      await afterAction('Marcada como no-show.')
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo marcar no-show.'))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!reservation || !cancelReason.trim()) {
      toast.error('Indica el motivo de cancelación.')

      return
    }

    setSaving(true)

    try {
      await reservationsApi.cancel(propertyId, reservation.uuid, cancelReason.trim())
      setCancelOpen(false)
      await afterAction('Reserva cancelada.')
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo cancelar.'))
    } finally {
      setSaving(false)
    }
  }

  const handleCheckIn = async (line: ReservationRoom) => {
    if (!reservation) return

    setSaving(true)

    try {
      await reservationsApi.checkIn(propertyId, reservation.uuid, line.uuid)
      await afterAction('Check-in (ingreso) registrado.')
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo registrar el ingreso (check-in).'))
    } finally {
      setSaving(false)
    }
  }

  const handleCheckOut = async (line: ReservationRoom) => {
    if (!reservation) return

    setSaving(true)

    try {
      await reservationsApi.checkOut(propertyId, reservation.uuid, line.uuid)
      await afterAction('Check-out (salida) registrado.')
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo registrar la salida (check-out).'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveRoom = async (line: ReservationRoom) => {
    if (!reservation) return

    setSaving(true)

    try {
      await reservationsApi.removeRoom(propertyId, reservation.uuid, line.uuid)
      await afterAction('Habitación quitada.')
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo quitar la habitación.'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveLine = async (line: ReservationRoom, patch: { checkOutDate?: string; adults?: number; children?: number; pricePerNight?: number }) => {
    if (!reservation) return

    setSaving(true)

    try {
      await reservationsApi.updateRoom(propertyId, reservation.uuid, line.uuid, patch)
      await afterAction('Habitación actualizada.')
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo actualizar la habitación.'))
    } finally {
      setSaving(false)
    }
  }

  const handleAddGuest = async (line: ReservationRoom, guest: Guest | null) => {
    if (!guest) return

    setSaving(true)

    try {
      await reservationsApi.addRoomGuest(propertyId, line.uuid, guest.id)
      await afterAction('Huésped agregado.')
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo agregar el huésped.'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveGuest = async (line: ReservationRoom, id: number) => {
    setSaving(true)

    try {
      await reservationsApi.removeRoomGuest(propertyId, line.uuid, id)
      await afterAction('Huésped quitado.')
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo quitar el huésped.'))
    } finally {
      setSaving(false)
    }
  }

  const status = reservation?.status
  const canEdit = status === 'PENDING' || status === 'CONFIRMED'
  const canCancel = status === 'PENDING' || status === 'CONFIRMED'
  const readOnly = status === 'CHECKED_OUT' || status === 'CANCELLED' || status === 'NO_SHOW'

  return (
    <>
      <Drawer
        open={open}
        anchor='right'
        onClose={onClose}
        PaperProps={{ sx: { width: isMobile ? '100%' : 480, maxWidth: '100%' } }}
      >
        <div className='flex items-center justify-between p-5'>
          <div>
            <Typography variant='h5'>{reservation?.code ?? 'Reserva'}</Typography>
            {reservation ? (
              <div className='flex flex-wrap gap-2 mt-2'>
                <Chip size='small' label={STAY_STATUS_LABELS[reservation.status]} />
                <Chip size='small' variant='outlined' label={SOURCE_LABELS[reservation.source]} />
                {reservation.externalCode ? <Chip size='small' label={reservation.externalCode} /> : null}
              </div>
            ) : null}
          </div>
          <IconButton onClick={onClose}>
            <i className='ri-close-line' />
          </IconButton>
        </div>
        <Divider />
        <div className='p-5 flex flex-col gap-5'>
          {loading || !reservation ? (
            <div className='flex justify-center p-8'>
              <CircularProgress />
            </div>
          ) : (
            <>
              <div>
                <Typography variant='subtitle2'>Titular</Typography>
                <Typography>
                  {reservation.guest
                    ? `${reservation.guest.firstName} ${reservation.guest.lastName}${reservation.guest.documentNumber ? ` · ${reservation.guest.documentNumber}` : ''}`
                    : 'Sin huésped'}
                </Typography>
                <Typography color='text.secondary'>
                  {reservation.company
                    ? `${reservation.company.businessName}${reservation.company.taxNumber ? ` · RUC ${reservation.company.taxNumber}` : ''}`
                    : 'Sin empresa'}
                </Typography>
              </div>

              {reservation.rooms.map(line => (
                <CardLine
                  key={line.uuid}
                  line={line}
                  today={today}
                  status={reservation.status}
                  highlightAssign={Boolean(highlightAssign && !line.roomId)}
                  saving={saving}
                  onAssign={() => setAssignLine(line)}
                  onCheckIn={() => handleCheckIn(line)}
                  onCheckOut={() => handleCheckOut(line)}
                  onNoShow={() => handleNoShow(line)}
                  onRemove={() => handleRemoveRoom(line)}
                  onSave={patch => handleSaveLine(line, patch)}
                  onAddGuest={guest => handleAddGuest(line, guest)}
                  onRemoveGuest={id => handleRemoveGuest(line, id)}
                  propertyId={propertyId}
                />
              ))}

              <div className='grid grid-cols-2 gap-3'>
                <Typography>Total {formatRoomPrice(reservation.totalAmount)}</Typography>
                <Typography>Descuento {formatRoomPrice(reservation.discountAmount)}</Typography>
                <Typography>Pagado {formatRoomPrice(reservation.paidAmount)}</Typography>
                <Typography color={reservation.balance > 0 ? 'error' : 'success'}>
                  {reservation.balance < 0
                    ? `Saldo a favor ${formatRoomPrice(Math.abs(reservation.balance))}`
                    : `Saldo ${formatRoomPrice(reservation.balance)}`}
                </Typography>
              </div>

              <div>
                <Typography variant='subtitle2' className='mb-2'>
                  Pagos
                </Typography>
                {payments.length === 0 ? (
                  <Typography variant='body2' color='text.secondary'>
                    Sin pagos registrados.
                  </Typography>
                ) : (
                  payments.map(payment => (
                    <Typography key={payment.uuid} variant='body2'>
                      {formatRoomPrice(payment.amount)} · {PAYMENT_LABELS[payment.method]}
                      {payment.reference ? ` · ${payment.reference}` : ''}
                    </Typography>
                  ))
                )}
              </div>

              {reservation.notes ? (
                <Typography variant='body2' color='text.secondary'>
                  {reservation.notes}
                </Typography>
              ) : null}

              {editing ? (
                <div className='flex flex-col gap-3'>
                  <GuestPicker
                    propertyId={propertyId}
                    minChars={2}
                    limit={10}
                    onSelect={(guest: Guest | null) => setGuestId(guest?.id ?? null)}
                  />
                  <CompanyPicker
                    propertyId={propertyId}
                    onSelect={(company: Company | null) => setCompanyId(company?.id ?? null)}
                  />
                  <FormControl fullWidth>
                    <InputLabel id='edit-source'>Canal</InputLabel>
                    <Select
                      labelId='edit-source'
                      label='Canal'
                      value={source}
                      onChange={e => setSource(e.target.value as ReservationSource)}
                    >
                      {SOURCE_OPTIONS.map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {EXTERNAL_CODE_SOURCES.includes(source) ? (
                    <TextField label='Código externo' value={externalCode} onChange={e => setExternalCode(e.target.value)} />
                  ) : null}
                  <TextField label='Descuento' value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} />
                  <TextField label='Notas' multiline minRows={2} value={notes} onChange={e => setNotes(e.target.value)} />
                  <Button variant='contained' disabled={saving} onClick={handleSaveEdit}>
                    Guardar cambios
                  </Button>
                </div>
              ) : null}

              <div className='flex flex-col gap-2'>
                {status === 'PENDING' ? (
                  <Button variant='contained' disabled={saving} onClick={handleConfirm}>
                    Confirmar
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button variant='outlined' onClick={() => setEditing(current => !current)}>
                    {editing ? 'Cerrar edición' : 'Editar'}
                  </Button>
                ) : null}
                <Button variant='outlined' onClick={() => onPay(reservation.uuid, reservation.balance)}>
                  Registrar pago
                </Button>
                {canIssueInvoices ? (
                  <Button
                    variant='outlined'
                    component={Link}
                    href={getLocalizedUrl(`/apps/invoicing/issue?reservation=${reservation.uuid}`, locale as Locale)}
                  >
                    Facturar
                  </Button>
                ) : null}
                {canCancel ? (
                  <Button color='error' variant='outlined' onClick={() => setCancelOpen(true)}>
                    Cancelar reserva
                  </Button>
                ) : null}
                {readOnly ? (
                  <Typography variant='caption' color='text.secondary'>
                    Esta reserva está en solo lectura. Aún puedes registrar pagos o devoluciones.
                  </Typography>
                ) : null}
              </div>
            </>
          )}
        </div>
      </Drawer>

      <AssignReservationRoomDialog
        open={Boolean(assignLine)}
        propertyId={propertyId}
        reservationUuid={reservation?.uuid ?? null}
        lineUuid={assignLine?.uuid ?? null}
        roomTypeId={assignLine?.roomTypeId ?? null}
        checkInDate={assignLine?.checkInDate ?? ''}
        checkOutDate={assignLine?.checkOutDate ?? ''}
        adults={assignLine?.adults}
        children={assignLine?.children}
        onClose={() => setAssignLine(null)}
        onSuccess={() => {
          setAssignLine(null)
          load()
          onChanged()
        }}
      />

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} fullWidth maxWidth='xs'>
        <DialogTitle>Cancelar reserva</DialogTitle>
        <DialogContent className='pt-4'>
          <TextField
            fullWidth
            label='Motivo'
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>Volver</Button>
          <Button color='error' variant='contained' disabled={saving} onClick={handleCancel}>
            Cancelar reserva
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

const CardLine = ({
  line,
  today,
  status,
  highlightAssign,
  saving,
  propertyId,
  onAssign,
  onCheckIn,
  onCheckOut,
  onNoShow,
  onRemove,
  onSave,
  onAddGuest,
  onRemoveGuest
}: {
  line: ReservationRoom
  today: string
  status: Reservation['status']
  highlightAssign: boolean
  saving: boolean
  propertyId: number
  onAssign: () => void
  onCheckIn: () => void
  onCheckOut: () => void
  onNoShow: () => void
  onRemove: () => void
  onSave: (patch: { checkOutDate?: string; adults?: number; children?: number; pricePerNight?: number }) => void
  onAddGuest: (guest: Guest | null) => void
  onRemoveGuest: (id: number) => void
}) => {
  const [checkOutDate, setCheckOutDate] = useState(line.checkOutDate)
  const [adults, setAdults] = useState(String(line.adults))
  const [children, setChildren] = useState(String(line.children))
  const canCheckIn = (status === 'CONFIRMED' || status === 'PENDING') && line.checkInDate <= today && Boolean(line.roomId)
  const canCheckOut = line.status === 'CHECKED_IN'
  const canMutate = line.status !== 'CHECKED_IN' && line.status !== 'CHECKED_OUT'

  useEffect(() => {
    setCheckOutDate(line.checkOutDate)
    setAdults(String(line.adults))
    setChildren(String(line.children))
  }, [line])

  return (
    <div className='rounded border p-3 flex flex-col gap-3'>
      <div className='flex items-center justify-between gap-2'>
        <Typography fontWeight={600}>
          {line.roomNumber || 'Sin asignar'} · {line.roomTypeName}
        </Typography>
        <Chip size='small' label={STAY_STATUS_LABELS[line.status]} />
      </div>
      {highlightAssign ? <Alert severity='warning'>Esta reserva no tiene habitación asignada.</Alert> : null}
      <Typography variant='body2'>
        {formatPlanningDate(line.checkInDate)} – {formatPlanningDate(line.checkOutDate)} · {line.nights} noches
      </Typography>
      <Typography variant='body2'>
        {line.adults} adultos{line.children ? ` · ${line.children} niños` : ''} · {formatRoomPrice(line.pricePerNight)} · Subtotal{' '}
        {formatRoomPrice(line.subtotal)}
      </Typography>
      <div>
        {line.guests.length === 0 ? (
          <Typography variant='caption' color='text.secondary'>
            Sin huéspedes en esta habitación.
          </Typography>
        ) : (
          line.guests.map(guest => (
            <div key={guest.id} className='flex items-center justify-between'>
              <Typography variant='body2'>
                {guest.firstName} {guest.lastName}
                {guest.isPrimary ? ' · Titular' : ''}
              </Typography>
              {status === 'CHECKED_IN' || status === 'CONFIRMED' ? (
                <IconButton size='small' onClick={() => onRemoveGuest(guest.id)}>
                  <i className='ri-close-line' />
                </IconButton>
              ) : null}
            </div>
          ))
        )}
      </div>
      {status === 'CHECKED_IN' || status === 'CONFIRMED' ? (
        <GuestPicker
          key={line.guests.length}
          propertyId={propertyId}
          minChars={2}
          limit={10}
          label='Agregar huésped'
          onSelect={onAddGuest}
        />
      ) : null}
      {canMutate ? (
        <div className='grid grid-cols-2 gap-2'>
          <TextField
            type='date'
            size='small'
            label='Check-out (salida)'
            value={checkOutDate}
            onChange={e => setCheckOutDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField size='small' label='Adultos' value={adults} onChange={e => setAdults(e.target.value)} />
          <TextField size='small' label='Niños' value={children} onChange={e => setChildren(e.target.value)} />
          <Button
            size='small'
            onClick={() =>
              onSave({
                checkOutDate,
                adults: Number(adults) || line.adults,
                children: Number(children) || 0
              })
            }
          >
            Guardar línea
          </Button>
        </div>
      ) : null}
      <div className='flex flex-wrap gap-2'>
        {(status === 'CONFIRMED' || status === 'PENDING') && !line.roomId ? (
          <Button size='small' variant='contained' color='warning' onClick={onAssign}>
            Asignar habitación
          </Button>
        ) : null}
        {status === 'CONFIRMED' && line.roomId ? (
          <Button size='small' variant='outlined' onClick={onAssign}>
            Cambiar habitación
          </Button>
        ) : null}
        {canCheckIn ? (
          <Button size='small' variant='contained' disabled={saving} onClick={onCheckIn}>
            Check-in (ingreso)
          </Button>
        ) : null}
        {canCheckOut ? (
          <Button size='small' variant='contained' disabled={saving} onClick={onCheckOut}>
            Check-out (salida)
          </Button>
        ) : null}
        {status === 'CONFIRMED' ? (
          <Button size='small' color='secondary' disabled={saving} onClick={onNoShow}>
            No-show
          </Button>
        ) : null}
        {canMutate ? (
          <Button size='small' color='error' disabled={saving} onClick={onRemove}>
            Quitar
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export default ReservationDrawer
