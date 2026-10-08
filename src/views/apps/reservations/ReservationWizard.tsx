'use client'

import { useEffect, useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

import { toast } from 'react-toastify'

import type { Company, Guest } from '@/types/apps/clientsTypes'
import type { Rate } from '@/types/apps/rateTypes'
import type {
  AvailabilityRoomType,
  CreateReservationRoomBody,
  NewReservationPrefill,
  PaymentMethod,
  ReservationSource
} from '@/types/apps/reservationsTypes'
import {
  addDays,
  EXTERNAL_CODE_SOURCES,
  isRateValidOn,
  nightsBetween,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  SOURCE_LABELS,
  SOURCE_OPTIONS
} from '@/types/apps/reservationsTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import GuestPicker from '@views/apps/front-desk/GuestPicker'
import CompanyPicker from './CompanyPicker'
import CreateCompanyDialog from './CreateCompanyDialog'
import CreateGuestDialog from './CreateGuestDialog'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'

type RoomDraft = {
  key: string
  roomTypeId: number | ''
  roomId: number | '' | 'later'
  rateId: number | ''
  pricePerNight: string
  checkInDate: string
  checkOutDate: string
  adults: string
  children: string
}

type Props = {
  open: boolean
  propertyId: number
  today: string
  prefill?: NewReservationPrefill | null
  onClose: () => void
  onCreated: (reservationUuid: string, code: string) => void
}

const emptyRoom = (today: string, prefill?: NewReservationPrefill | null): RoomDraft => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  roomTypeId: prefill?.roomTypeId ?? '',
  roomId: prefill?.roomId ?? 'later',
  rateId: '',
  pricePerNight: '',
  checkInDate: prefill?.checkInDate || today,
  checkOutDate: prefill?.checkOutDate || addDays(prefill?.checkInDate || today, 1),
  adults: '2',
  children: '0'
})

const ReservationWizard = ({ open, propertyId, today, prefill, onClose, onCreated }: Props) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [step, setStep] = useState(0)
  const [rooms, setRooms] = useState<RoomDraft[]>([emptyRoom(today, prefill)])
  const [availability, setAvailability] = useState<AvailabilityRoomType[]>([])
  const [ratesByType, setRatesByType] = useState<Record<number, Rate[]>>({})
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [guest, setGuest] = useState<Guest | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [createGuestOpen, setCreateGuestOpen] = useState(false)
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false)
  const [source, setSource] = useState<ReservationSource>('PHONE')
  const [externalCode, setExternalCode] = useState('')
  const [confirmed, setConfirmed] = useState(true)
  const [discountAmount, setDiscountAmount] = useState('0')
  const [notes, setNotes] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH')
  const [payReference, setPayReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [roomWarning, setRoomWarning] = useState('')

  const primary = rooms[0]
  const nights = primary ? nightsBetween(primary.checkInDate, primary.checkOutDate) : 1

  useEffect(() => {
    if (!open) {
      return
    }

    setStep(0)
    setRooms([emptyRoom(today, prefill)])
    setAvailability([])
    setRatesByType({})
    setGuest(null)
    setCompany(null)
    setSource('PHONE')
    setExternalCode('')
    setConfirmed(true)
    setDiscountAmount('0')
    setNotes('')
    setPayAmount('')
    setPayMethod('CASH')
    setPayReference('')
    setRoomWarning('')
  }, [open, prefill, today])

  const loadAvailability = async (drafts = rooms) => {
    const first = drafts[0]

    if (!first || first.checkOutDate <= first.checkInDate) {
      toast.error('La salida debe ser posterior al ingreso.')

      return
    }

    setLoadingAvailability(true)

    try {
      const result = await reservationsApi.availability(propertyId, {
        checkInDate: first.checkInDate,
        checkOutDate: first.checkOutDate,
        adults: Number(first.adults) || 1,
        children: Number(first.children) || 0
      })

      setAvailability(result.roomTypes)

      if (prefill?.roomId) {
        const type = result.roomTypes.find(item => item.roomTypeId === prefill.roomTypeId)
        const stillFree = type?.freeRooms.some(room => room.id === prefill.roomId)

        setRoomWarning(stillFree ? '' : 'La habitación elegida ya no está libre en esas fechas.')
      }
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo consultar la disponibilidad.'))
    } finally {
      setLoadingAvailability(false)
    }
  }

  useEffect(() => {
    if (open && primary?.checkInDate && primary?.checkOutDate) {
      loadAvailability()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, primary?.checkInDate, primary?.checkOutDate, primary?.adults, primary?.children])

  const loadRates = async (roomTypeId: number, checkInDate: string) => {
    if (ratesByType[roomTypeId]) {
      return
    }

    try {
      const page = await reservationsApi.rates(propertyId, roomTypeId)

      setRatesByType(current => ({
        ...current,
        [roomTypeId]: page.data.filter(rate => isRateValidOn(rate.validFrom, rate.validTo, checkInDate))
      }))
    } catch {
      setRatesByType(current => ({ ...current, [roomTypeId]: [] }))
    }
  }

  const updateRoom = (key: string, patch: Partial<RoomDraft>) => {
    setRooms(current => current.map(room => (room.key === key ? { ...room, ...patch } : room)))
  }

  const selectedSubtotal = useMemo(() => {
    return rooms.reduce((sum, room) => {
      const price = Number(room.pricePerNight) || 0
      const roomNights = nightsBetween(room.checkInDate, room.checkOutDate)

      return sum + price * roomNights
    }, 0)
  }, [rooms])

  const handleSelectType = (room: RoomDraft, type: AvailabilityRoomType) => {
    const firstFree = type.freeRooms[0]
    const nextPrice = firstFree?.effectivePrice ?? type.basePrice

    updateRoom(room.key, {
      roomTypeId: type.roomTypeId,
      roomId: prefill?.roomId && prefill.roomTypeId === type.roomTypeId ? prefill.roomId : firstFree?.id ?? 'later',
      pricePerNight: String(nextPrice),
      rateId: ''
    })
    loadRates(type.roomTypeId, room.checkInDate)
  }

  const handleSelectRoom = (room: RoomDraft, roomId: number | 'later', type?: AvailabilityRoomType) => {
    const free = type?.freeRooms.find(item => item.id === roomId)

    updateRoom(room.key, {
      roomId,
      pricePerNight: room.pricePerNight || String(free?.effectivePrice ?? type?.basePrice ?? '')
    })
  }

  const handleSelectRate = (room: RoomDraft, rateId: number | '') => {
    const rate = ratesByType[Number(room.roomTypeId)]?.find(item => item.id === rateId)

    updateRoom(room.key, {
      rateId,
      pricePerNight: rate ? String(rate.price) : room.pricePerNight
    })
  }

  const validateStep1 = () => {
    if (rooms.some(room => !room.roomTypeId)) {
      toast.error('Elige un tipo de habitación.')

      return false
    }

    if (rooms.some(room => room.checkOutDate <= room.checkInDate)) {
      toast.error('La salida debe ser posterior al ingreso.')

      return false
    }

    return true
  }

  const validateStep2 = () => {
    if (!guest && !company) {
      toast.error('Selecciona un huésped, una empresa o ambos.')

      return false
    }

    return true
  }

  const handleCreate = async () => {
    if (!validateStep2()) {
      return
    }

    setSaving(true)

    try {
      const payloadRooms: CreateReservationRoomBody[] = rooms.map(room => ({
        roomTypeId: Number(room.roomTypeId),
        roomId: room.roomId === 'later' || room.roomId === '' ? null : Number(room.roomId),
        rateId: room.rateId === '' ? null : Number(room.rateId),
        checkInDate: room.checkInDate,
        checkOutDate: room.checkOutDate,
        adults: Number(room.adults) || 1,
        children: Number(room.children) || 0,
        pricePerNight: room.pricePerNight ? Number(room.pricePerNight) : null,
        guests: guest ? [{ guestId: guest.id, isPrimary: true }] : undefined
      }))

      const reservation = await reservationsApi.create(propertyId, {
        guestId: guest?.id ?? null,
        companyId: company?.id ?? null,
        source,
        externalCode: EXTERNAL_CODE_SOURCES.includes(source) ? externalCode.trim() || null : null,
        status: confirmed ? 'CONFIRMED' : 'PENDING',
        discountAmount: Number(discountAmount) || 0,
        notes: notes.trim() || null,
        rooms: payloadRooms
      })

      const advance = Number(payAmount)

      if (Number.isFinite(advance) && advance > 0) {
        await reservationsApi.addPayment(propertyId, reservation.uuid, {
          amount: advance,
          method: payMethod,
          reference: payReference.trim() || null
        })
      }

      onCreated(reservation.uuid, reservation.code)
    } catch (error) {
      const message = getReservationsApiErrorMessage(error, 'No se pudo crear la reserva.')

      toast.error(message)

      if (String((error as { statusCode?: number })?.statusCode) === '409' || message.toLowerCase().includes('reservad')) {
        setStep(0)
        loadAvailability()
      }
    } finally {
      setSaving(false)
    }
  }

  const renderRoomStep = (room: RoomDraft, index: number) => {
    const selectedType = availability.find(type => type.roomTypeId === room.roomTypeId)
    const rates = room.roomTypeId ? ratesByType[Number(room.roomTypeId)] ?? [] : []

    return (
      <div key={room.key} className='flex flex-col gap-4'>
        {index > 0 ? <Divider /> : null}
        <div className='flex items-center justify-between'>
          <Typography fontWeight={600}>Habitación {index + 1}</Typography>
          {rooms.length > 1 ? (
            <IconButton size='small' onClick={() => setRooms(current => current.filter(item => item.key !== room.key))}>
              <i className='ri-delete-bin-line' />
            </IconButton>
          ) : null}
        </div>
        {index === 0 ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <TextField
              type='date'
              label='Check-in (ingreso)'
              value={room.checkInDate}
              onChange={e => updateRoom(room.key, { checkInDate: e.target.value, checkOutDate: addDays(e.target.value, 1) })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type='date'
              label='Check-out (salida)'
              value={room.checkOutDate}
              onChange={e => updateRoom(room.key, { checkOutDate: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='Adultos'
              type='number'
              value={room.adults}
              onChange={e => updateRoom(room.key, { adults: e.target.value })}
            />
            <TextField
              label='Niños'
              type='number'
              value={room.children}
              onChange={e => updateRoom(room.key, { children: e.target.value })}
            />
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <TextField
              type='date'
              label='Check-in (ingreso)'
              value={room.checkInDate}
              onChange={e => updateRoom(room.key, { checkInDate: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type='date'
              label='Check-out (salida)'
              value={room.checkOutDate}
              onChange={e => updateRoom(room.key, { checkOutDate: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </div>
        )}
        {index === 0 && loadingAvailability ? (
          <div className='flex justify-center p-4'>
            <CircularProgress size={24} />
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {availability.map(type => {
              const disabled = type.availableCount === 0 || type.fitsRequestedGuests === false

              return (
                <Card
                  key={`${room.key}-${type.roomTypeId}`}
                  variant='outlined'
                  sx={{
                    borderColor: room.roomTypeId === type.roomTypeId ? 'primary.main' : 'divider',
                    opacity: disabled ? 0.5 : 1
                  }}
                >
                  <CardActionArea disabled={disabled} onClick={() => handleSelectType(room, type)}>
                    <CardContent>
                      <Typography fontWeight={600}>{type.roomTypeName}</Typography>
                      <Typography variant='body2'>{formatRoomPrice(type.basePrice)} / noche</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {type.availableCount} disponibles · {type.maxAdults} adultos + {type.maxChildren} niños
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              )
            })}
          </div>
        )}
        {roomWarning && index === 0 ? (
          <Typography color='warning.main' variant='body2'>
            {roomWarning}
          </Typography>
        ) : null}
        {selectedType ? (
          <>
            <FormControl fullWidth>
              <InputLabel id={`room-${room.key}`}>Habitación</InputLabel>
              <Select
                labelId={`room-${room.key}`}
                label='Habitación'
                value={room.roomId}
                onChange={e => handleSelectRoom(room, e.target.value as number | 'later', selectedType)}
              >
                <MenuItem value='later'>Asignar después</MenuItem>
                {selectedType.freeRooms.map(free => (
                  <MenuItem key={free.id} value={free.id}>
                    {free.number} · {free.floorName} · {formatRoomPrice(free.effectivePrice)}
                    {free.status === 'CLEANING' || free.status === 'MAINTENANCE'
                      ? ` · ${free.status === 'CLEANING' ? 'Limpieza' : 'Mantenimiento'}`
                      : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id={`rate-${room.key}`}>Tarifa</InputLabel>
              <Select
                labelId={`rate-${room.key}`}
                label='Tarifa'
                value={room.rateId}
                onChange={e => {
                  const next = Number(e.target.value)

                  handleSelectRate(room, Number.isFinite(next) ? next : '')
                }}
              >
                <MenuItem value=''>Sin tarifa</MenuItem>
                {rates.map(rate => (
                  <MenuItem key={rate.id} value={rate.id}>
                    {rate.name} · {formatRoomPrice(rate.price)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label='Precio por noche'
              value={room.pricePerNight}
              onChange={e => updateRoom(room.key, { pricePerNight: e.target.value })}
            />
            <Typography variant='body2'>
              {nightsBetween(room.checkInDate, room.checkOutDate)} noches · Subtotal{' '}
              {formatRoomPrice((Number(room.pricePerNight) || 0) * nightsBetween(room.checkInDate, room.checkOutDate))}
            </Typography>
          </>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={() => !saving && onClose()}
        fullWidth
        maxWidth='md'
        fullScreen={isMobile}
      >
        <DialogTitle>Nueva reserva</DialogTitle>
        <DialogContent className='flex flex-col gap-5 pt-4'>
          <Stepper activeStep={step} alternativeLabel={!isMobile} orientation={isMobile ? 'horizontal' : 'horizontal'}>
            <Step>
              <StepLabel>Habitación</StepLabel>
            </Step>
            <Step>
              <StepLabel>Titular</StepLabel>
            </Step>
            <Step>
              <StepLabel>Confirmación</StepLabel>
            </Step>
          </Stepper>

          {step === 0 ? (
            <div className='flex flex-col gap-4'>
              <Typography variant='body2' color='text.secondary'>
                {nights} noche{nights === 1 ? '' : 's'}
                {prefill?.roomNumber ? ` · ${prefill.roomNumber} ${prefill.roomTypeName ?? ''}` : ''}
              </Typography>
              {rooms.map(renderRoomStep)}
              <Button
                variant='outlined'
                onClick={() => setRooms(current => [...current, emptyRoom(today, { checkInDate: primary.checkInDate, checkOutDate: primary.checkOutDate })])}
              >
                + Agregar otra habitación
              </Button>
            </div>
          ) : null}

          {step === 1 ? (
            <div className='flex flex-col gap-4'>
              <GuestPicker
                propertyId={propertyId}
                minChars={2}
                limit={10}
                label='Huésped'
                onSelect={setGuest}
              />
              {guest ? (
                <Chip
                  label={`${guest.person.firstName} ${guest.person.lastName}`}
                  onDelete={() => setGuest(null)}
                />
              ) : (
                <Button onClick={() => setCreateGuestOpen(true)}>+ Nuevo huésped</Button>
              )}
              <CompanyPicker propertyId={propertyId} onSelect={setCompany} />
              {company ? (
                <Chip label={company.businessName} onDelete={() => setCompany(null)} />
              ) : (
                <Button onClick={() => setCreateCompanyOpen(true)}>+ Nueva empresa</Button>
              )}
            </div>
          ) : null}

          {step === 2 ? (
            <div className='flex flex-col gap-4'>
              <FormControl fullWidth>
                <InputLabel id='reservation-source'>Canal</InputLabel>
                <Select
                  labelId='reservation-source'
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
              <FormControlLabel
                control={<Switch checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />}
                label={confirmed ? 'Confirmada' : 'Pendiente'}
              />
              <TextField label='Descuento' value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} />
              <TextField label='Notas' multiline minRows={2} value={notes} onChange={e => setNotes(e.target.value)} />
              <Divider />
              <Typography fontWeight={600}>Adelanto (opcional)</Typography>
              <TextField label='Monto' value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              <FormControl fullWidth>
                <InputLabel id='advance-method'>Método</InputLabel>
                <Select
                  labelId='advance-method'
                  label='Método'
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                >
                  {PAYMENT_METHODS.map(item => (
                    <MenuItem key={item} value={item}>
                      {PAYMENT_LABELS[item]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField label='N.º operación' value={payReference} onChange={e => setPayReference(e.target.value)} />
              <Typography>
                Subtotal {formatRoomPrice(selectedSubtotal)} · Canal {SOURCE_LABELS[source]}
              </Typography>
            </div>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' color='secondary' disabled={saving} onClick={onClose}>
            Cancelar
          </Button>
          {step > 0 ? (
            <Button disabled={saving} onClick={() => setStep(current => current - 1)}>
              Atrás
            </Button>
          ) : null}
          {step < 2 ? (
            <Button
              variant='contained'
              onClick={() => {
                if (step === 0 && !validateStep1()) {
                  return
                }

                if (step === 1 && !validateStep2()) {
                  return
                }

                setStep(current => current + 1)
              }}
            >
              Siguiente
            </Button>
          ) : (
            <Button variant='contained' disabled={saving} onClick={handleCreate}>
              {saving ? <CircularProgress size={20} color='inherit' /> : 'Guardar reserva'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <CreateGuestDialog
        open={createGuestOpen}
        propertyId={propertyId}
        onClose={() => setCreateGuestOpen(false)}
        onCreated={setGuest}
      />
      <CreateCompanyDialog
        open={createCompanyOpen}
        propertyId={propertyId}
        onClose={() => setCreateCompanyOpen(false)}
        onCreated={setCompany}
      />
    </>
  )
}

export default ReservationWizard
