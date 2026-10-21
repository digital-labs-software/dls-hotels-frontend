'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import type { Company, Guest } from '@/types/apps/clientsTypes'
import type { FrontDeskPayment, Reservation, ReservationRoom } from '@/types/apps/frontDeskTypes'
import { STAY_STATUS_LABELS, guestFullName } from '@/types/apps/frontDeskTypes'
import type { ReservationSource } from '@/types/apps/reservationsTypes'
import { addDays, EXTERNAL_CODE_SOURCES, formatPlanningDate, PAYMENT_LABELS, SOURCE_LABELS, SOURCE_OPTIONS, stayStatusChipSx } from '@/types/apps/reservationsTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import GuestPicker from '@views/apps/front-desk/GuestPicker'
import AssignReservationRoomDialog from './AssignReservationRoomDialog'
import CompanyPicker from './CompanyPicker'
import CreateGuestDialog from './CreateGuestDialog'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'
import DateField from '@/components/date-picker/DateField'

type Props = {
  open: boolean
  propertyId: number
  reservationUuid: string | null
  today: string
  highlightAssign?: boolean
  onClose: () => void
  onChanged: () => void
  onPay: (uuid: string, balance: number, paidAmount: number, cancelled: boolean) => void
  paymentsVersion?: number
}

const personLabel = (guest: { firstName: string; lastName: string }) =>
  !guest.lastName || guest.lastName === '—' ? guest.firstName : `${guest.firstName} ${guest.lastName}`

type SlotDraft = {
  guestId: number | null
  reservationGuestId: number | null
  label: string
}

const slotsFromLine = (line: ReservationRoom): SlotDraft[] => {
  const count = Math.max(line.adults + line.children, 1)
  const ordered = [...line.guests].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.id - b.id)

  return Array.from({ length: count }, (_, index) => {
    const guest = ordered[index]

    return {
      guestId: guest?.guestId ?? null,
      reservationGuestId: guest?.id ?? null,
      label: guest ? personLabel(guest) : ''
    }
  })
}

const ReservationDrawer = ({
  open,
  propertyId,
  reservationUuid,
  today,
  highlightAssign,
  onClose,
  onChanged,
  onPay,
  paymentsVersion = 0
}: Props) => {
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
  const [pickedGuest, setPickedGuest] = useState<Guest | null>(null)
  const [pickedCompany, setPickedCompany] = useState<Company | null>(null)
  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [assignLine, setAssignLine] = useState<ReservationRoom | null>(null)

  const load = async (silent = false) => {
    if (!reservationUuid) {
      return
    }

    if (!silent) setLoading(true)

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
      setPickedGuest(null)
      setPickedCompany(null)

      const checkIns = detail.rooms.map(line => line.checkInDate).sort()
      const checkOuts = detail.rooms.map(line => line.checkOutDate).sort()

      setEditCheckIn(checkIns[0] || detail.checkInDate)
      setEditCheckOut(checkOuts.at(-1) || detail.checkOutDate)
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
  }, [open, reservationUuid, paymentsVersion])

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

    if (guestId == null && companyId == null) {
      toast.error('Indica quién reserva: una persona o una agencia.')

      return
    }

    if (!editCheckIn || !editCheckOut || editCheckOut <= editCheckIn) {
      toast.error('La salida tiene que ser después del ingreso.')

      return
    }

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

      let keptCheckIn = false

      for (const line of reservation.rooms) {
        if (line.status !== 'PENDING' && line.status !== 'CONFIRMED' && line.status !== 'CHECKED_IN') continue

        const patch: { checkInDate?: string; checkOutDate?: string } = {}

        if (line.status === 'CHECKED_IN') {
          if (line.checkInDate !== editCheckIn) keptCheckIn = true
        } else if (line.checkInDate !== editCheckIn) {
          patch.checkInDate = editCheckIn
        }

        if (line.checkOutDate !== editCheckOut) patch.checkOutDate = editCheckOut

        if (patch.checkInDate || patch.checkOutDate) {
          await reservationsApi.updateRoom(propertyId, reservation.uuid, line.uuid, patch)
        }
      }

      if (keptCheckIn) {
        toast.info('El ingreso no se cambió en las habitaciones que ya tienen check-in.')
      }

      await afterAction('Reserva actualizada.')
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo guardar.'))
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    if (!reservation) return

    setSource(reservation.source)
    setExternalCode(reservation.externalCode ?? '')
    setDiscountAmount(String(reservation.discountAmount ?? 0))
    setNotes(reservation.notes ?? '')
    setGuestId(reservation.guestId)
    setCompanyId(reservation.companyId)
    setPickedGuest(null)
    setPickedCompany(null)

    const checkIns = reservation.rooms.map(line => line.checkInDate).sort()
    const checkOuts = reservation.rooms.map(line => line.checkOutDate).sort()

    setEditCheckIn(checkIns[0] || reservation.checkInDate)
    setEditCheckOut(checkOuts.at(-1) || reservation.checkOutDate)
    setEditing(false)
  }

  const handleNoShow = async (line: ReservationRoom) => {
    if (!reservation) return

    setSaving(true)

    try {
      await reservationsApi.updateRoom(propertyId, reservation.uuid, line.uuid, { status: 'NO_SHOW' })
      await afterAction('Marcada como no se presentó.')
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo marcar que no se presentó.'))
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

  const handleAssignGuest = async (line: ReservationRoom, slotIndex: number, guest: Guest, previousId: number | null) => {
    if (!reservation) return

    setSaving(true)

    try {
      if (previousId) {
        await reservationsApi.removeRoomGuest(propertyId, line.uuid, previousId)
      }

      const already = line.guests.find(item => item.guestId === guest.id && item.id !== previousId)

      if (!already) {
        await reservationsApi.addRoomGuest(propertyId, line.uuid, guest.id, slotIndex === 0)
      } else if (slotIndex === 0 && !already.isPrimary) {
        await reservationsApi.setPrimaryGuest(propertyId, line.uuid, already.id)
      }

      await load(true)
      onChanged()
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo asignar a la habitación.'))
      await load(true)
    } finally {
      setSaving(false)
    }
  }

  const handleClearGuest = async (line: ReservationRoom, reservationGuestId: number) => {
    setSaving(true)

    try {
      await reservationsApi.removeRoomGuest(propertyId, line.uuid, reservationGuestId)
      await load(true)
      onChanged()
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo quitar de la habitación.'))
      await load(true)
    } finally {
      setSaving(false)
    }
  }

  const status = reservation?.status
  const canEdit = status === 'PENDING' || status === 'CONFIRMED'
  const canCancel = status === 'PENDING' || status === 'CONFIRMED'
  const readOnly = status === 'CHECKED_OUT' || status === 'CANCELLED' || status === 'NO_SHOW'

  const activeRooms = (reservation?.rooms ?? []).filter(
    line => line.status !== 'CANCELLED' && line.status !== 'NO_SHOW' && line.status !== 'CHECKED_OUT'
  )

  const missingNames = activeRooms.filter(line => line.guests.length === 0)
  const missingRoom = activeRooms.filter(line => !line.roomId)
  const stayIn = reservation?.rooms.length ? [...reservation.rooms].map(line => line.checkInDate).sort()[0] : ''
  const stayOut = reservation?.rooms.length ? [...reservation.rooms].map(line => line.checkOutDate).sort().at(-1) : ''

  if (!open) return null

  const booker =
    [
      reservation?.company
        ? `${reservation.company.businessName}${reservation.company.taxNumber ? ` · RUC ${reservation.company.taxNumber}` : ''}`
        : null,
      reservation?.guest
        ? `${personLabel(reservation.guest)}${reservation.guest.documentNumber ? ` · ${reservation.guest.documentNumber}` : ''}`
        : null
    ]
      .filter(Boolean)
      .join(' · ') || 'Sin quien reserva'

  const guestEditLabel =
    guestId == null
      ? ''
      : pickedGuest && pickedGuest.id === guestId
        ? personLabel(pickedGuest.person)
        : reservation?.guest && reservation.guest.id === guestId
          ? personLabel(reservation.guest)
          : ''

  const companyEditLabel =
    companyId == null
      ? ''
      : pickedCompany && pickedCompany.id === companyId
        ? pickedCompany.businessName
        : reservation?.company && reservation.company.id === companyId
          ? reservation.company.businessName
          : ''

  return (
    <>
      <Card>
        <CardContent className='flex flex-col gap-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-2'>
              <Button variant='text' color='secondary' startIcon={<i className='ri-arrow-left-line' />} onClick={onClose}>
                Volver
              </Button>
              <Typography variant='h5'>{reservation?.code ?? 'Reserva'}</Typography>
            </div>
            {reservation ? (
              <div className='flex flex-wrap gap-2'>
                <Chip size='small' label={STAY_STATUS_LABELS[reservation.status]} sx={stayStatusChipSx(reservation.status)} />
                <Chip size='small' variant='outlined' label={SOURCE_LABELS[reservation.source]} />
                {reservation.externalCode ? <Chip size='small' label={reservation.externalCode} /> : null}
              </div>
            ) : null}
          </div>

          {loading || !reservation ? (
            <div className='flex justify-center p-8'>
              <CircularProgress />
            </div>
          ) : (
            <>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 3 }} className='flex flex-col gap-4'>
                {editing ? (
                  <>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div className='flex flex-col gap-2'>
                        <Typography variant='caption' color='text.secondary'>Persona</Typography>
                        {guestEditLabel ? (
                          <Chip label={guestEditLabel} onDelete={() => { setGuestId(null); setPickedGuest(null) }} />
                        ) : (
                          <GuestPicker
                            propertyId={propertyId}
                            minChars={2}
                            limit={10}
                            label='Persona'
                            onSelect={guest => {
                              setPickedGuest(guest)
                              setGuestId(guest?.id ?? null)
                            }}
                          />
                        )}
                      </div>
                      <div className='flex flex-col gap-2'>
                        <Typography variant='caption' color='text.secondary'>Agencia o empresa</Typography>
                        {companyEditLabel ? (
                          <Chip label={companyEditLabel} onDelete={() => { setCompanyId(null); setPickedCompany(null) }} />
                        ) : (
                          <CompanyPicker
                            propertyId={propertyId}
                            label='Agencia o empresa'
                            onSelect={company => {
                              setPickedCompany(company)
                              setCompanyId(company?.id ?? null)
                            }}
                          />
                        )}
                      </div>
                      <DateField label='Ingreso' value={editCheckIn} onChange={setEditCheckIn} fullWidth />
                      <DateField
                        label='Salida'
                        value={editCheckOut}
                        minDate={editCheckIn ? addDays(editCheckIn, 1) : undefined}
                        onChange={setEditCheckOut}
                        fullWidth
                      />
                      <FormControl fullWidth>
                        <InputLabel id='edit-source'>Canal</InputLabel>
                        <Select
                          labelId='edit-source'
                          label='Canal'
                          value={source}
                          onChange={event => setSource(event.target.value as ReservationSource)}
                        >
                          {SOURCE_OPTIONS.map(([value, label]) => (
                            <MenuItem key={value} value={value}>
                              {label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {EXTERNAL_CODE_SOURCES.includes(source) ? (
                        <TextField label='Código externo' value={externalCode} onChange={event => setExternalCode(event.target.value)} />
                      ) : (
                        <TextField
                          label='Descuento'
                          value={discountAmount}
                          onChange={event => setDiscountAmount(event.target.value)}
                          slotProps={{ input: { startAdornment: <Typography variant='body2' className='mie-1'>S/</Typography> } }}
                        />
                      )}
                      {EXTERNAL_CODE_SOURCES.includes(source) ? (
                        <TextField
                          label='Descuento'
                          value={discountAmount}
                          onChange={event => setDiscountAmount(event.target.value)}
                          slotProps={{ input: { startAdornment: <Typography variant='body2' className='mie-1'>S/</Typography> } }}
                        />
                      ) : null}
                    </div>
                    <TextField
                      label='Notas de la reserva'
                      multiline
                      minRows={2}
                      fullWidth
                      value={notes}
                      onChange={event => setNotes(event.target.value)}
                    />
                    <Typography variant='body2' color='text.secondary'>
                      Total {formatRoomPrice(reservation.totalAmount)}
                      {' · '}
                      {reservation.balance < 0
                        ? `saldo a favor ${formatRoomPrice(Math.abs(reservation.balance))}`
                        : `saldo ${formatRoomPrice(reservation.balance)} · pagado ${formatRoomPrice(reservation.paidAmount)}`}
                      . Lo pagado se corrige con Pago o devolución.
                    </Typography>
                    <div className='flex justify-end gap-2'>
                      <Button variant='outlined' color='secondary' disabled={saving} onClick={cancelEdit}>
                        Cancelar
                      </Button>
                      <Button variant='contained' disabled={saving} onClick={handleSaveEdit}>
                        Guardar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
                      <div>
                        <Typography variant='caption' color='text.secondary'>Quién reserva</Typography>
                        <Typography>{booker}</Typography>
                      </div>
                      <div>
                        <Typography variant='caption' color='text.secondary'>Estadía</Typography>
                        <Typography>
                          {stayIn && stayOut ? `${formatPlanningDate(stayIn)} – ${formatPlanningDate(stayOut)}` : '—'}
                        </Typography>
                      </div>
                      <div>
                        <Typography variant='caption' color='text.secondary'>Total</Typography>
                        <Typography>
                          {formatRoomPrice(reservation.totalAmount)}
                          {reservation.discountAmount > 0 ? ` · descuento ${formatRoomPrice(reservation.discountAmount)}` : ''}
                        </Typography>
                      </div>
                      <div>
                        <Typography variant='caption' color='text.secondary'>Saldo</Typography>
                        <Typography color={reservation.balance > 0 ? 'error' : 'success.main'}>
                          {reservation.balance < 0
                            ? `A favor ${formatRoomPrice(Math.abs(reservation.balance))}`
                            : `${formatRoomPrice(reservation.balance)} · pagado ${formatRoomPrice(reservation.paidAmount)}`}
                        </Typography>
                      </div>
                    </div>
                    <div>
                      <Typography variant='caption' color='text.secondary'>Notas de la reserva</Typography>
                      <Typography>{reservation.notes?.trim() || 'Sin nota'}</Typography>
                    </div>
                    {canEdit ? (
                      <div className='flex justify-end'>
                        <Button variant='outlined' startIcon={<i className='ri-pencil-line' />} onClick={() => setEditing(true)}>
                          Editar
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
              </Box>

              {missingRoom.length > 0 ? (
                <Alert severity='warning'>
                  {missingRoom.length === 1 ? 'Falta asignar el número de una habitación.' : `Faltan números en ${missingRoom.length} habitaciones.`}
                </Alert>
              ) : null}
              {missingNames.length > 0 ? (
                <Alert severity='info'>
                  {missingNames.length === 1
                    ? 'Faltan los nombres de una habitación. Se completan aquí, cuando los tengas.'
                    : `Faltan nombres en ${missingNames.length} habitaciones. Se completan aquí, cuando los tengas.`}
                </Alert>
              ) : null}

              <div className='flex flex-col gap-3'>
                <Typography fontWeight={600}>Habitaciones</Typography>
                {reservation.rooms.map(line => (
                  <RoomRow
                    key={line.uuid}
                    line={line}
                    today={today}
                    status={reservation.status}
                    highlightAssign={Boolean(highlightAssign && !line.roomId)}
                    saving={saving}
                    propertyId={propertyId}
                    onAssign={() => setAssignLine(line)}
                    onCheckIn={() => handleCheckIn(line)}
                    onCheckOut={() => handleCheckOut(line)}
                    onNoShow={() => handleNoShow(line)}
                    onRemove={() => handleRemoveRoom(line)}
                    onSave={patch => handleSaveLine(line, patch)}
                    onAssignGuest={(slotIndex, guest, previousId) => handleAssignGuest(line, slotIndex, guest, previousId)}
                    onClearGuest={reservationGuestId => handleClearGuest(line, reservationGuestId)}
                  />
                ))}
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
                      {payment.amount < 0 ? 'Devolución · ' : ''}
                      {formatRoomPrice(Math.abs(payment.amount))} · {PAYMENT_LABELS[payment.method]}
                      {payment.reference ? ` · ${payment.reference}` : ''}
                    </Typography>
                  ))
                )}
              </div>

              <div className='flex flex-wrap gap-2'>
                {status === 'PENDING' ? (
                  <Button variant='contained' disabled={saving} onClick={handleConfirm}>
                    Confirmar
                  </Button>
                ) : null}
                <Button
                  variant='outlined'
                  onClick={() =>
                    onPay(reservation.uuid, reservation.balance, reservation.paidAmount, reservation.status === 'CANCELLED')
                  }
                >
                  Pago o devolución
                </Button>
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
        </CardContent>
      </Card>

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

const PersonSlot = ({
  propertyId,
  role,
  value,
  disabled,
  takenIds,
  onAssign,
  onClear
}: {
  propertyId: number
  role: string
  value: SlotDraft
  disabled?: boolean
  takenIds: number[]
  onAssign: (guest: Guest) => void
  onClear: () => void
}) => {
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<Guest[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const filled = Boolean(value.guestId || value.label)

  const placeGuest = (guest: Guest) => {
    setInputValue('')
    setCreateOpen(false)
    onAssign(guest)
  }

  useEffect(() => {
    const query = inputValue.trim()

    if (query.length < 2 || disabled || filled) {
      setOptions([])

      return
    }

    const timeout = setTimeout(async () => {
      setLoading(true)

      try {
        const page = await reservationsApi.searchGuests(propertyId, query, 8)

        setOptions(page.data.filter(guest => !takenIds.includes(guest.id)))
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeout)

    // takenIds se lee en cada búsqueda; la clave evita repetir la consulta en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, filled, inputValue, propertyId, takenIds.join(',')])

  if (filled) {
    return (
      <div className='flex flex-col gap-1'>
        <Typography variant='caption' color='text.secondary'>
          {role}
        </Typography>
        <Chip
          label={value.label}
          disabled={disabled}
          onDelete={disabled ? undefined : onClear}
        />
      </div>
    )
  }

  const typed = inputValue.trim()
  const notFound = typed.length >= 2 && !loading && options.length === 0

  return (
    <div className='flex flex-col gap-1'>
      <div className='flex items-start gap-2'>
        <Autocomplete
          className='min-is-0 flex-1'
          size='small'
          options={options}
          loading={loading}
          disabled={disabled}
          filterOptions={items => items}
          getOptionLabel={guest => guestFullName(guest.person.firstName, guest.person.lastName)}
          inputValue={inputValue}
          onInputChange={(_, next, reason) => {
            if (reason === 'input' || reason === 'clear') setInputValue(next)
          }}
          onChange={(_, guest) => {
            if (!guest) return

            placeGuest(guest)
          }}
          noOptionsText={typed.length < 2 ? 'Escribe el nombre o el DNI' : 'No está registrado'}
          renderInput={params => (
            <TextField
              {...params}
              label={role}
              placeholder='Nombre o DNI'
              slotProps={{
                input: {
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress color='inherit' size={16} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  )
                }
              }}
            />
          )}
        />
        <Button size='small' variant='outlined' className='shrink-0 mbs-1' disabled={disabled} onClick={() => setCreateOpen(true)}>
          Registrar
        </Button>
      </div>
      {notFound ? (
        <Typography variant='caption' color='text.secondary'>
          No está registrado.
        </Typography>
      ) : null}
      <CreateGuestDialog
        open={createOpen}
        propertyId={propertyId}
        initialQuery={typed}
        onClose={() => setCreateOpen(false)}
        onCreated={placeGuest}
      />
    </div>
  )
}

const RoomRow = ({
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
  onAssignGuest,
  onClearGuest
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
  onSave: (patch: { checkOutDate: string }) => void
  onAssignGuest: (slotIndex: number, guest: Guest, previousId: number | null) => void
  onClearGuest: (reservationGuestId: number) => void
}) => {
  const [checkOutDate, setCheckOutDate] = useState(line.checkOutDate)
  const [slots, setSlots] = useState<SlotDraft[]>(() => slotsFromLine(line))
  const [more, setMore] = useState(false)
  const canEditPeople = status === 'PENDING' || status === 'CONFIRMED' || status === 'CHECKED_IN'
  const hasPrimary = line.guests.some(guest => guest.isPrimary)
  const canCheckIn = (status === 'CONFIRMED' || status === 'PENDING') && line.checkInDate <= today && Boolean(line.roomId)
  const canCheckOut = line.status === 'CHECKED_IN'
  const canMutate = line.status !== 'CHECKED_IN' && line.status !== 'CHECKED_OUT'

  useEffect(() => {
    setCheckOutDate(line.checkOutDate)
    setSlots(slotsFromLine(line))
  }, [line])

  const takenIds = slots.map(slot => slot.guestId).filter((id): id is number => id !== null)

  return (
    <div className='rounded border p-4 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4'>
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between gap-2'>
          <Typography fontWeight={600}>
            {line.roomNumber || 'Sin número'} · {line.roomTypeName}
          </Typography>
          <Chip size='small' label={STAY_STATUS_LABELS[line.status]} sx={stayStatusChipSx(line.status)} />
        </div>
        {highlightAssign ? <Alert severity='warning'>Esta habitación no tiene número.</Alert> : null}
        <Typography variant='body2'>
          {formatPlanningDate(line.checkInDate)} – {formatPlanningDate(line.checkOutDate)} · {line.nights} noches
        </Typography>
        <Typography variant='body2'>
          {formatRoomPrice(line.pricePerNight)} / noche · {formatRoomPrice(line.subtotal)}
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          {line.adults} adultos{line.children ? ` · ${line.children} niños` : ''}
        </Typography>
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
          {canCheckIn && hasPrimary ? (
            <Button size='small' variant='contained' disabled={saving} onClick={onCheckIn}>
              Check-in (ingreso)
            </Button>
          ) : null}
          {canCheckOut ? (
            <Button size='small' variant='contained' disabled={saving} onClick={onCheckOut}>
              Check-out (salida)
            </Button>
          ) : null}
        </div>
        {canCheckIn && !hasPrimary ? (
          <Typography variant='caption' color='text.secondary'>
            Asigna al titular para poder registrar el ingreso.
          </Typography>
        ) : null}
      </div>

      <div className='flex flex-col gap-3'>
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'>
          {slots.map((slot, index) => (
            <PersonSlot
              key={`${line.uuid}-${index}`}
              propertyId={propertyId}
              role={index === 0 ? 'Titular' : `Acompañante ${index}`}
              value={slot}
              disabled={!canEditPeople || saving}
              takenIds={takenIds.filter(id => id !== slot.guestId)}
              onAssign={guest => {
                setSlots(current =>
                  current.map((item, slotIndex) =>
                    slotIndex === index
                      ? {
                          guestId: guest.id,
                          reservationGuestId: item.reservationGuestId,
                          label: personLabel(guest.person)
                        }
                      : item
                  )
                )
                onAssignGuest(index, guest, slot.reservationGuestId)
              }}
              onClear={() => {
                if (slot.reservationGuestId) onClearGuest(slot.reservationGuestId)
              }}
            />
          ))}
        </div>
        <div className='flex flex-wrap gap-2'>
          {canMutate ? (
            <Button size='small' onClick={() => setMore(current => !current)}>
              {more ? 'Ocultar' : 'Cambiar salida'}
            </Button>
          ) : null}
          {status === 'CONFIRMED' ? (
            <Button size='small' color='secondary' disabled={saving} onClick={onNoShow}>
              No se presentó
            </Button>
          ) : null}
          {canMutate ? (
            <Button size='small' color='error' disabled={saving} onClick={onRemove}>
              Quitar habitación
            </Button>
          ) : null}
        </div>
        {more && canMutate ? (
          <div className='flex flex-wrap items-start gap-2'>
            <DateField size='small' label='Salida' value={checkOutDate} onChange={setCheckOutDate} />
            <Button size='small' className='mbs-1' disabled={saving || !checkOutDate} onClick={() => onSave({ checkOutDate })}>
              Guardar salida
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ReservationDrawer
