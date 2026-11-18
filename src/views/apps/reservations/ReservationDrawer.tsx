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
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import type { Company, Guest } from '@/types/apps/clientsTypes'
import type { Reservation, ReservationRoom } from '@/types/apps/frontDeskTypes'
import { STAY_STATUS_LABELS, guestFullName, headlineStayStatus } from '@/types/apps/frontDeskTypes'
import type { ReservationSource } from '@/types/apps/reservationsTypes'
import { addDays, BOOKING_STATUS_LABELS, EXTERNAL_CODE_SOURCES, formatPlanningDate, SOURCE_LABELS, SOURCE_OPTIONS, stayStatusChipSx } from '@/types/apps/reservationsTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import GuestPicker from '@views/apps/front-desk/GuestPicker'
import AddReservationRoomDialog from './AddReservationRoomDialog'
import AssignReservationRoomDialog from './AssignReservationRoomDialog'
import CompanyPicker from './CompanyPicker'
import CreateGuestDialog from './CreateGuestDialog'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'
import DateField from '@/components/date-picker/DateField'
import { formatGuestPhone } from '@/utils/guestPhone'
import RoomDatesDialog from './RoomDatesDialog'

type Props = {
  open: boolean
  propertyId: number
  reservationUuid: string | null
  highlightAssign?: boolean
  onClose: () => void
  onChanged: () => void
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
  highlightAssign,
  onClose,
  onChanged
}: Props) => {
  const [reservation, setReservation] = useState<Reservation | null>(null)
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
  const [editStatus, setEditStatus] = useState<'PENDING' | 'CONFIRMED'>('CONFIRMED')
  const [assignLine, setAssignLine] = useState<ReservationRoom | null>(null)
  const [addRoomOpen, setAddRoomOpen] = useState(false)

  const load = async (silent = false) => {
    if (!reservationUuid) {
      return
    }

    if (!silent) setLoading(true)

    try {
      const detail = await reservationsApi.get(propertyId, reservationUuid)

      setReservation(detail)
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
      setEditStatus(detail.status === 'PENDING' ? 'PENDING' : 'CONFIRMED')
      setEditing(false)
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo cargar la reserva.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) {
      setAddRoomOpen(false)

      return
    }

    if (reservationUuid) {
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reservationUuid])

  const afterAction = async (message: string) => {
    toast.success(message)
    await load()
    onChanged()
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
        notes: notes.trim() || null,
        ...(statusEditable && editStatus !== reservation.status ? { status: editStatus } : {})
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
    setEditStatus(reservation.status === 'PENDING' ? 'PENDING' : 'CONFIRMED')
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

  const handleSaveLine = async (
    line: ReservationRoom,
    patch: { checkInDate?: string; checkOutDate?: string; adults?: number; children?: number; pricePerNight?: number }
  ) => {
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
  const rooms = reservation?.rooms ?? []
  const stayOpen = rooms.some(
    line => line.status === 'PENDING' || line.status === 'CONFIRMED' || line.status === 'CHECKED_IN'
  )
  const stayFinished = rooms.length > 0 && !stayOpen
  const canEdit = (status === 'PENDING' || status === 'CONFIRMED') && !stayFinished
  const readOnly = status === 'CANCELLED' || stayFinished
  const statusEditable =
    (status === 'PENDING' || status === 'CONFIRMED') &&
    rooms.every(line => line.status === 'PENDING' || line.status === 'CONFIRMED' || line.status === 'CANCELLED')

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

  const bookerPhone = formatGuestPhone(reservation?.company?.phone || reservation?.guest?.phone) || 'Sin celular'

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
                    <div className='flex flex-col gap-4'>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-start'>
                      <div className='flex flex-col gap-2'>
                      <Typography variant='caption' color='text.secondary'>Quién reserva</Typography>
                      {!companyId || guestId != null ? (
                        <div className='flex flex-col gap-2'>
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
                                if (guest) {
                                  setCompanyId(null)
                                  setPickedCompany(null)
                                }
                              }}
                            />
                          )}
                        </div>
                      ) : null}
                      {!guestId || companyId != null ? (
                        <div className='flex flex-col gap-2'>
                          {companyEditLabel ? (
                            <Chip label={companyEditLabel} onDelete={() => { setCompanyId(null); setPickedCompany(null) }} />
                          ) : (
                            <CompanyPicker
                              propertyId={propertyId}
                              label='Agencia o empresa'
                              onSelect={company => {
                                setPickedCompany(company)
                                setCompanyId(company?.id ?? null)
                                if (company) {
                                  setGuestId(null)
                                  setPickedGuest(null)
                                }
                              }}
                            />
                          )}
                        </div>
                      ) : null}
                      </div>
                      <div className='flex flex-col gap-2'>
                        <Typography variant='caption' color='text.secondary'>Estado</Typography>
                        <FormControl fullWidth disabled={!statusEditable}>
                          <Select
                            value={editStatus}
                            inputProps={{ 'aria-label': 'Estado' }}
                            onChange={event => setEditStatus(event.target.value as 'PENDING' | 'CONFIRMED')}
                          >
                            <MenuItem value='CONFIRMED'>Confirmada</MenuItem>
                            <MenuItem value='PENDING'>Pendiente</MenuItem>
                          </Select>
                        </FormControl>
                      </div>
                      </div>
                      <div className='grid grid-cols-2 gap-4'>
                        <DateField label='Ingreso' value={editCheckIn} onChange={setEditCheckIn} fullWidth />
                        <DateField
                          label='Salida'
                          value={editCheckOut}
                          minDate={editCheckIn ? addDays(editCheckIn, 1) : undefined}
                          onChange={setEditCheckOut}
                          fullWidth
                        />
                      </div>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
                      <div className='flex flex-col gap-1'>
                        <Typography variant='caption' color='text.secondary'>Quién reserva</Typography>
                        <Typography fontWeight={600}>{booker}</Typography>
                      </div>
                      <div className='flex flex-col gap-1'>
                        <Typography variant='caption' color='text.secondary'>Celular</Typography>
                        <Typography fontWeight={600}>{bookerPhone}</Typography>
                      </div>
                      <div className='flex flex-col gap-1'>
                        <Typography variant='caption' color='text.secondary'>Estadía</Typography>
                        <Typography fontWeight={600}>
                          {stayIn && stayOut ? `${formatPlanningDate(stayIn)} – ${formatPlanningDate(stayOut)}` : '—'}
                        </Typography>
                      </div>
                      <div className='flex flex-col gap-1'>
                        <Typography variant='caption' color='text.secondary'>Estado</Typography>
                        <div>
                          <Chip
                            size='small'
                            label={STAY_STATUS_LABELS[headlineStayStatus(reservation)]}
                            sx={stayStatusChipSx(headlineStayStatus(reservation))}
                          />
                        </div>
                      </div>
                      <div className='flex flex-col gap-1'>
                        <Typography variant='caption' color='text.secondary'>Total</Typography>
                        <Typography fontWeight={600}>
                          {formatRoomPrice(reservation.totalAmount)}
                          {reservation.discountAmount > 0 ? ` · descuento ${formatRoomPrice(reservation.discountAmount)}` : ''}
                        </Typography>
                      </div>
                      <div className='flex flex-col gap-1'>
                        <Typography variant='caption' color='text.secondary'>Saldo</Typography>
                        <Typography fontWeight={600} color={reservation.balance > 0 ? 'error' : 'success.main'}>
                          {reservation.balance < 0
                            ? `A favor ${formatRoomPrice(Math.abs(reservation.balance))}`
                            : `${formatRoomPrice(reservation.balance)} · pagado ${formatRoomPrice(reservation.paidAmount)}`}
                        </Typography>
                      </div>
                      <div className='flex flex-col gap-1'>
                        <Typography variant='caption' color='text.secondary'>Canal</Typography>
                        <Typography fontWeight={600}>
                          {SOURCE_LABELS[reservation.source]}
                          {reservation.externalCode?.trim() ? ` · ${reservation.externalCode.trim()}` : ''}
                        </Typography>
                      </div>
                    </div>
                    <div className='flex flex-col gap-1'>
                      <Typography variant='caption' color='text.secondary'>Notas de la reserva</Typography>
                      <Typography fontWeight={600}>{reservation.notes?.trim() || 'Sin nota'}</Typography>
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
                <div className='flex items-center justify-between gap-2'>
                  <Typography fontWeight={600}>Habitaciones</Typography>
                  {!readOnly ? (
                    <Button size='small' startIcon={<i className='ri-add-line' />} onClick={() => setAddRoomOpen(true)}>
                      Agregar habitación
                    </Button>
                  ) : null}
                </div>
                {reservation.rooms.map(line => {
                  const others = reservation.rooms.filter(
                    item =>
                      item.uuid !== line.uuid &&
                      (item.status === 'PENDING' || item.status === 'CONFIRMED' || item.status === 'CHECKED_IN')
                  )
                  const groupCheckIn = others.length
                    ? [...others].map(item => item.checkInDate).sort()[0]
                    : line.checkInDate
                  const groupCheckOut = others.length
                    ? [...others].map(item => item.checkOutDate).sort().at(-1) || line.checkOutDate
                    : line.checkOutDate

                  return (
                    <RoomRow
                      key={line.uuid}
                      line={line}
                      highlightAssign={Boolean(highlightAssign && !line.roomId)}
                      saving={saving}
                      propertyId={propertyId}
                      groupCheckIn={groupCheckIn}
                      groupCheckOut={groupCheckOut}
                      allowDateChange={others.length > 0}
                      onAssign={() => setAssignLine(line)}
                      onNoShow={() => handleNoShow(line)}
                      onRemove={() => handleRemoveRoom(line)}
                      onSave={patch => handleSaveLine(line, patch)}
                      onAssignGuest={(slotIndex, guest, previousId) => handleAssignGuest(line, slotIndex, guest, previousId)}
                      onClearGuest={reservationGuestId => handleClearGuest(line, reservationGuestId)}
                    />
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AddReservationRoomDialog
        open={addRoomOpen}
        propertyId={propertyId}
        reservationUuid={reservation?.uuid ?? null}
        checkInDate={stayIn || reservation?.checkInDate || ''}
        checkOutDate={stayOut || reservation?.checkOutDate || ''}
        onClose={() => setAddRoomOpen(false)}
        onSuccess={() => {
          setAddRoomOpen(false)
          load()
          onChanged()
        }}
      />

      <AssignReservationRoomDialog
        open={Boolean(assignLine)}
        propertyId={propertyId}
        reservationUuid={reservation?.uuid ?? null}
        lineUuid={assignLine?.uuid ?? null}
        roomTypeId={assignLine?.roomTypeId ?? null}
        pricePerNight={assignLine?.pricePerNight ?? null}
        hasRoom={Boolean(assignLine?.roomId)}
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
  const [searched, setSearched] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const filled = Boolean(value.guestId || value.label)
  const typed = inputValue.trim()
  const notFound = searched === typed && typed.length >= 2 && !loading && options.length === 0 && !disabled
  const showOptions = listOpen && options.length > 0

  const placeGuest = (guest: Guest) => {
    setInputValue('')
    setCreateOpen(false)
    onAssign(guest)
  }

  useEffect(() => {
    const query = inputValue.trim()

    if (query.length < 2 || disabled || filled) {
      setOptions([])
      setSearched('')

      return
    }

    const timeout = setTimeout(async () => {
      setLoading(true)

      try {
        const page = await reservationsApi.searchGuests(propertyId, query, 8)

        setOptions(page.data)
        setSearched(query)
      } catch {
        setOptions([])
        setSearched(query)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [disabled, filled, inputValue, propertyId])

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

  const isAssigned = (guest: Guest) => takenIds.some(id => Number(id) === Number(guest.id))

  return (
    <>
      <div className='flex flex-col gap-1'>
        <div className='flex items-stretch gap-2'>
      <Autocomplete
        className='min-is-0 flex-1'
        fullWidth
        size='small'
        open={showOptions}
        onOpen={() => setListOpen(true)}
        onClose={() => setListOpen(false)}
        options={options}
        loading={loading}
        disabled={disabled}
        filterOptions={items => items}
        getOptionLabel={guest => guestFullName(guest.person.firstName, guest.person.lastName)}
        getOptionDisabled={isAssigned}
        inputValue={inputValue}
        onInputChange={(_, next, reason) => {
          if (reason === 'input' || reason === 'clear') setInputValue(next)
        }}
        onChange={(_, guest) => {
          if (!guest || isAssigned(guest)) return

          placeGuest(guest)
          setListOpen(false)
        }}
        slotProps={{
          popper: { placement: 'bottom-start' },
          paper: { sx: { width: '100%', minWidth: 0, boxSizing: 'border-box' } }
        }}
        renderOption={(props, guest) => (
          <li {...props} key={guest.uuid}>
            <div className='flex flex-col'>
              <Typography>{guestFullName(guest.person.firstName, guest.person.lastName)}</Typography>
              <Typography variant='caption' color='text.secondary'>
                {isAssigned(guest) ? 'Ya está en esta habitación' : guest.person.documentNumber || 'Sin documento'}
              </Typography>
            </div>
          </li>
        )}
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
        {notFound ? (
          <Button
            className='shrink-0 self-stretch'
            size='small'
            variant='outlined'
            onMouseDown={event => event.preventDefault()}
            onClick={() => setCreateOpen(true)}
          >
            Agregar
          </Button>
        ) : null}
        </div>
        {notFound ? (
          <Typography variant='caption' color='text.secondary'>
            Sin coincidencias
          </Typography>
        ) : null}
      </div>
      <CreateGuestDialog
        open={createOpen}
        propertyId={propertyId}
        initialQuery={typed}
        onClose={() => setCreateOpen(false)}
        onCreated={placeGuest}
      />
    </>
  )
}

const RoomRow = ({
  line,
  highlightAssign,
  saving,
  propertyId,
  groupCheckIn,
  groupCheckOut,
  allowDateChange,
  onAssign,
  onNoShow,
  onRemove,
  onSave,
  onAssignGuest,
  onClearGuest
}: {
  line: ReservationRoom
  highlightAssign: boolean
  saving: boolean
  propertyId: number
  groupCheckIn: string
  groupCheckOut: string
  allowDateChange: boolean
  onAssign: () => void
  onNoShow: () => void
  onRemove: () => void
  onSave: (patch: { checkInDate: string; checkOutDate: string }) => void
  onAssignGuest: (slotIndex: number, guest: Guest, previousId: number | null) => void
  onClearGuest: (reservationGuestId: number) => void
}) => {
  const [slots, setSlots] = useState<SlotDraft[]>(() => slotsFromLine(line))
  const [datesOpen, setDatesOpen] = useState(false)
  const lineOpen = line.status === 'PENDING' || line.status === 'CONFIRMED'
  const canEditPeople = lineOpen || line.status === 'CHECKED_IN'
  const canMutate = lineOpen

  useEffect(() => {
    setSlots(slotsFromLine(line))
  }, [line])

  const takenIds = slots.map(slot => slot.guestId).filter((id): id is number => id !== null)

  return (
    <div className='flex flex-col gap-4 rounded border p-4'>
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]'>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center justify-between gap-2'>
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
          {highlightAssign ? <Alert severity='warning'>Esta habitación no tiene número.</Alert> : null}
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
        </div>

        <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
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
      </div>

      <div className='flex flex-col gap-3 border-bs pt-4'>
        <div className='flex flex-wrap gap-2'>
          {lineOpen && !line.roomId ? (
            <Button size='small' variant='contained' color='warning' onClick={onAssign}>
              Asignar habitación
            </Button>
          ) : null}
          {lineOpen && line.roomId ? (
            <Button size='small' variant='outlined' onClick={onAssign}>
              Cambiar habitación
            </Button>
          ) : null}
          {canMutate && allowDateChange ? (
            <Button size='small' disabled={saving} onClick={() => setDatesOpen(true)}>
              Cambiar fechas
            </Button>
          ) : null}
          {line.status === 'CONFIRMED' || line.status === 'PENDING' ? (
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
      </div>
      {datesOpen && allowDateChange ? (
        <RoomDatesDialog
          key={`${line.uuid}-${line.checkInDate}-${line.checkOutDate}`}
          open
          title={line.roomNumber ? `Habitación ${line.roomNumber}` : line.roomTypeName}
          roomCheckIn={line.checkInDate}
          roomCheckOut={line.checkOutDate}
          stayCheckIn={groupCheckIn}
          stayCheckOut={groupCheckOut}
          onClose={() => setDatesOpen(false)}
          onAccept={(checkIn, checkOut) => {
            setDatesOpen(false)

            if (checkIn === line.checkInDate && checkOut === line.checkOutDate) return

            onSave({ checkInDate: checkIn, checkOutDate: checkOut })
          }}
        />
      ) : null}
    </div>
  )
}

export default ReservationDrawer
