'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import type { ReactNode } from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Link from '@mui/material/Link'
import OutlinedInput from '@mui/material/OutlinedInput'
import Select from '@mui/material/Select'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

import { toast } from 'react-toastify'

import type { Company, Guest } from '@/types/apps/clientsTypes'
import type { Rate } from '@/types/apps/rateTypes'
import {
  formatRateDate,
  isRateValidOn,
  pickRateForDate,
  priceSourceLabel,
  sortRatesForDate,
  rateEndsDuringStay
} from '@/types/apps/rateTypes'
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
  nightsBetween,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  SOURCE_OPTIONS
} from '@/types/apps/reservationsTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { formatPeople, roomCapacity } from '@/types/apps/roomTypeTypes'
import DateField from '@/components/date-picker/DateField'
import GuestPicker from '@views/apps/front-desk/GuestPicker'
import CompanyPicker from './CompanyPicker'
import CreateCompanyDialog from './CreateCompanyDialog'
import CreateGuestDialog from './CreateGuestDialog'

/** Un cero inicial no se queda pegado: escribir 5 sobre 0 da 5, no 05. */
const cleanSolesInput = (raw: string) => {
  const normalized = raw.replace(',', '.').replace(/[^\d.]/g, '')
  const dot = normalized.indexOf('.')
  const whole = (dot === -1 ? normalized : normalized.slice(0, dot)).replace(/^0+(?=\d)/, '')
  const decimals = dot === -1 ? '' : normalized.slice(dot + 1).replace(/\./g, '').slice(0, 2)

  if (dot === -1) return whole

  return `${whole || '0'}.${decimals}`
}

const selectIfZero = (event: { target: { value: string; select: () => void } }) => {
  if (Number(event.target.value) === 0) event.target.select()
}
import { useCashSessionOpen } from '@/hooks/useCashSessionOpen'
import { cashApi, getCashApiErrorMessage } from '@/libs/cashApi'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'

const CASH_ADVANCE_MESSAGE =
  'No hay una caja abierta. No se puede guardar la reserva con este adelanto: abre la caja y vuelve a crearla.'

type RoomDraft = {
  key: string
  roomTypeId: number | ''
  roomId: number | '' | 'later'
  rateId: number | ''
  /** true cuando el recepcionista eligió la tarifa o «Precio normal». */
  rateManual: boolean
  rateNotice: string
  pricePerNight: string
  checkInDate: string
  checkOutDate: string
  adults: string
  children: string

  /** false: usa las fechas de la estadía; true: el recepcionista le puso fechas propias. */
  customDates: boolean
}

type Props = {
  open: boolean
  propertyId: number
  today: string
  prefill?: NewReservationPrefill | null
  onClose: () => void
  onCreated: (reservationUuid: string, code: string) => void
}

const stayDay = new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

const formatStayDay = (day: string) => (day ? stayDay.format(new Date(`${day}T00:00:00Z`)) : '—')

const emptyRoom = (today: string, prefill?: NewReservationPrefill | null): RoomDraft => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  roomTypeId: prefill?.roomTypeId ?? '',
  roomId: prefill?.roomId ?? 'later',
  rateId: '',
  rateManual: false,
  rateNotice: '',
  pricePerNight: '',
  checkInDate: prefill?.checkInDate || today,
  checkOutDate: prefill?.checkOutDate || addDays(prefill?.checkInDate || today, 1),
  adults: '2',
  children: '0',
  customDates: false
})

const fitsGuests = (type: AvailabilityRoomType, adults: number, children: number) =>
  adults + children <= roomCapacity(type) &&
  adults <= Number(type.maxAdults) &&
  children <= Number(type.maxChildren || 0)

/** Recuadro con título: separa la estadía de las habitaciones a simple vista (también en modo oscuro). */
const Section = ({ title, action, footer, children }: { title: string; action?: ReactNode; footer?: ReactNode; children: ReactNode }) => (
  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
    <Box
      className='flex items-center justify-between gap-2 px-4 py-2'
      sx={{ bgcolor: 'customColors.tableHeaderBg', borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <Typography fontWeight={600}>{title}</Typography>
      {action}
    </Box>
    <Box className='flex flex-col gap-4 p-4'>{children}</Box>
    {footer ? (
      <Box className='px-4 py-3' sx={{ bgcolor: 'customColors.tableHeaderBg', borderTop: '1px solid', borderColor: 'divider' }}>
        {footer}
      </Box>
    ) : null}
  </Box>
)

const ReservationWizard = ({ open, propertyId, today, prefill, onClose, onCreated }: Props) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const cashOpen = useCashSessionOpen(propertyId, open)
  const createdReservation = useRef<{ uuid: string; code: string } | null>(null)
  const [step, setStep] = useState(0)
  const [rooms, setRooms] = useState<RoomDraft[]>([emptyRoom(today, prefill)])
  const [availability, setAvailability] = useState<AvailabilityRoomType[]>([])
  const [ratesByType, setRatesByType] = useState<Record<number, Rate[]>>({})
  const requestedRateTypes = useRef(new Set<number>())
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
  const [payMethod, setPayMethod] = useState<PaymentMethod>('YAPE')
  const [payReference, setPayReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [roomWarning, setRoomWarning] = useState('')
  const [roomAttempted, setRoomAttempted] = useState(false)
  const [bookerAttempted, setBookerAttempted] = useState(false)
  const [cashBlocked, setCashBlocked] = useState(false)

  const primary = rooms[0]
  const stayNights = primary ? nightsBetween(primary.checkInDate, primary.checkOutDate) : 1

  /** Abierta desde una celda del calendario: la habitación ya viene elegida (reserva rápida). */
  const quickBooking = Boolean(prefill?.roomId)

  /** Abierta desde una nota por completar: el texto ya es la nota de la reserva. */
  const fromNote = Boolean(prefill?.notes) && !quickBooking

  useEffect(() => {
    if (!open) {
      return
    }

    setStep(0)
    setRooms([emptyRoom(today, prefill)])
    setAvailability([])
    setRatesByType({})
    requestedRateTypes.current.clear()
    setGuest(null)
    setCompany(null)
    setSource('PHONE')
    setExternalCode('')
    setConfirmed(true)
    setDiscountAmount('0')
    setNotes(prefill?.notes ?? '')
    setPayAmount('')
    setPayMethod('YAPE')
    setPayReference('')
    createdReservation.current = null
    setCashBlocked(false)
    setRoomWarning('')
    setRoomAttempted(false)
    setBookerAttempted(false)
  }, [open, prefill, today])

  const loadAvailability = async (drafts = rooms) => {
    const first = drafts[0]

    if (!first || first.checkOutDate <= first.checkInDate) {
      return
    }

    setLoadingAvailability(true)

    try {
      const result = await reservationsApi.availability(propertyId, {
        checkInDate: first.checkInDate,
        checkOutDate: first.checkOutDate
      })

      setAvailability(result.roomTypes)

      if (prefill?.roomTypeId) {
        const type = result.roomTypes.find(item => item.roomTypeId === prefill.roomTypeId)

        const people = type
          ? Math.max(1, Math.min(roomCapacity(type), Number(type.maxAdults) || roomCapacity(type)))
          : 0

        if (people > 0) {
          setRooms(current =>
            current.map((item, index) =>
              index === 0 && item.adults === '2' && item.children === '0' ? { ...item, adults: String(people) } : item
            )
          )
        }
      }

      if (prefill?.roomId) {
        const type = result.roomTypes.find(item => item.roomTypeId === prefill.roomTypeId)
        const stillFree = type?.freeRooms.some(room => room.id === prefill.roomId)

        setRoomWarning(stillFree ? '' : 'La habitación elegida ya no está libre en esas fechas. Elige otra.')

        if (!stillFree) {
          setRooms(current =>
            current.map((item, index) => (index === 0 && item.roomId === prefill.roomId ? { ...item, roomId: 'later' } : item))
          )
        }
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
  }, [open, primary?.checkInDate, primary?.checkOutDate])

  const loadRates = async (roomTypeId: number) => {
    if (requestedRateTypes.current.has(roomTypeId)) {
      return
    }

    requestedRateTypes.current.add(roomTypeId)

    try {
      const page = await reservationsApi.rates(propertyId, roomTypeId)

      setRatesByType(current => ({ ...current, [roomTypeId]: page.data }))
      setRooms(current =>
        current.map(room => {
          if (room.rateManual || Number(room.roomTypeId) !== roomTypeId) {
            return room
          }

          const best = pickRateForDate(page.data, room.checkInDate)

          if (!best || room.rateId === best.id) {
            return room
          }

          return { ...room, rateId: best.id, pricePerNight: String(best.price), rateNotice: '' }
        })
      )
    } catch {
      setRatesByType(current => ({ ...current, [roomTypeId]: [] }))
    }
  }

  useEffect(() => {
    if (!open) {
      return
    }

    rooms.forEach(room => {
      if (room.roomTypeId) {
        loadRates(Number(room.roomTypeId))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rooms])

  const ratesForRoom = (room: RoomDraft) =>
    room.roomTypeId ? sortRatesForDate(ratesByType[Number(room.roomTypeId)] ?? [], room.checkInDate) : []

  const roomPriceFor = (room: RoomDraft) => {
    const type = availability.find(item => item.roomTypeId === Number(room.roomTypeId))
    const free = type?.freeRooms.find(item => item.id === room.roomId)

    return free?.effectivePrice ?? type?.basePrice
  }

  useEffect(() => {
    setRooms(current => {
      const missing = current.some(room => room.roomTypeId && !room.pricePerNight && roomPriceFor(room) !== undefined)

      if (!missing) {
        return current
      }

      return current.map(room => {
        const price = room.roomTypeId && !room.pricePerNight ? roomPriceFor(room) : undefined

        return price === undefined ? room : { ...room, pricePerNight: String(price) }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability])

  useEffect(() => {
    const expired = new Map<string, Rate>()

    rooms.forEach(room => {
      const rate =
        room.rateId === '' ? undefined : ratesByType[Number(room.roomTypeId)]?.find(item => item.id === room.rateId)

      if (rate && !isRateValidOn(rate, room.checkInDate)) {
        expired.set(room.key, rate)
      }
    })

    if (expired.size === 0) {
      return
    }

    setRooms(current =>
      current.map(room => {
        const rate = expired.get(room.key)

        if (!rate) {
          return room
        }

        const price = roomPriceFor(room)

        return {
          ...room,
          rateId: '',
          rateManual: false,
          rateNotice: `Se quitó la tarifa «${rate.name}» porque no aplica para estas fechas. Se usa el precio de la habitación.`,
          pricePerNight: price === undefined ? room.pricePerNight : String(price)
        }
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, ratesByType])

  useEffect(() => {
    setRooms(current => {
      let changed = false

      const next = current.map(room => {
        if (room.rateManual || !room.roomTypeId) {
          return room
        }

        const rates = ratesByType[Number(room.roomTypeId)]

        if (!rates) {
          return room
        }

        const best = pickRateForDate(rates, room.checkInDate)

        if (!best || room.rateId === best.id) {
          return room
        }

        changed = true

        return {
          ...room,
          rateId: best.id,
          pricePerNight: String(best.price),
          rateNotice: ''
        }
      })

      return changed ? next : current
    })
  }, [ratesByType, rooms])

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

  /** Habitaciones ya elegidas en las otras líneas de esta reserva. */
  const takenRoomIds = (exceptKey: string) =>
    new Set(
      rooms
        .filter(item => item.key !== exceptKey && typeof item.roomId === 'number')
        .map(item => item.roomId as number)
    )

  const freeRoomsFor = (room: RoomDraft, type: AvailabilityRoomType) => {
    const taken = takenRoomIds(room.key)

    return type.freeRooms.filter(free => !taken.has(free.id))
  }

  /** Cambia las fechas de la estadía en todas las habitaciones que no tienen fechas propias. */
  const setStayDates = (checkInDate: string, checkOutDate: string) =>
    setRooms(current =>
      current.map((item, index) => (index === 0 || !item.customDates ? { ...item, checkInDate, checkOutDate } : item))
    )

  const roomGuests = (room: RoomDraft) => ({
    adults: Number(room.adults) || 0,
    children: Number(room.children) || 0
  })

  const handleSelectType = (room: RoomDraft, type: AvailabilityRoomType) => {
    const free = freeRoomsFor(room, type)
    const isPrefilledLine = room.key === rooms[0]?.key && prefill?.roomTypeId === type.roomTypeId

    const prefilled = isPrefilledLine && prefill?.roomId ? free.find(item => item.id === prefill.roomId) : undefined

    const chosen = prefilled ?? free[0]

    const people = Math.max(1, Math.min(roomCapacity(type), Number(type.maxAdults) || roomCapacity(type)))
    const best = pickRateForDate(ratesByType[type.roomTypeId] ?? [], room.checkInDate)

    updateRoom(room.key, {
      roomTypeId: type.roomTypeId,
      roomId: chosen?.id ?? 'later',
      pricePerNight: best ? String(best.price) : String(chosen?.effectivePrice ?? type.basePrice),
      rateId: best?.id ?? '',
      rateManual: false,
      rateNotice: '',
      adults: String(people),
      children: '0'
    })
    loadRates(type.roomTypeId)
  }

  const handleSelectRoom = (room: RoomDraft, roomId: number | 'later', type?: AvailabilityRoomType) => {
    const free = type?.freeRooms.find(item => item.id === roomId)

    updateRoom(room.key, {
      roomId,
      pricePerNight:
        room.rateId === '' || !room.pricePerNight
          ? String(free?.effectivePrice ?? type?.basePrice ?? room.pricePerNight)
          : room.pricePerNight
    })
  }

  const handleSelectRate = (room: RoomDraft, rateId: number | '') => {
    const rate = ratesByType[Number(room.roomTypeId)]?.find(item => item.id === rateId)
    const roomPrice = roomPriceFor(room)

    updateRoom(room.key, {
      rateId,
      rateManual: true,
      rateNotice: '',
      pricePerNight: rate ? String(rate.price) : roomPrice !== undefined ? String(roomPrice) : room.pricePerNight
    })
  }

  const validateStep1 = () => {
    const missingType = rooms.some(room => !room.roomTypeId)
    const badDates = rooms.some(room => room.checkOutDate <= room.checkInDate) || stayNights < 1
    const missingAdult = rooms.some(room => roomGuests(room).adults < 1)

    const crowded = rooms.some(room => {
      const type = availability.find(item => item.roomTypeId === room.roomTypeId)
      const { adults, children } = roomGuests(room)

      return type ? !fitsGuests(type, adults, children) : false
    })

    if (missingType || badDates || missingAdult || crowded) {
      setRoomAttempted(true)

      return false
    }

    return true
  }

  const validateStep2 = () => {
    if (!guest && !company) {
      setBookerAttempted(true)

      return false
    }

    return true
  }

  const advanceAmount = Number(payAmount)
  const wantsAdvance = Number.isFinite(advanceAmount) && advanceAmount > 0
  const cashAdvanceBlocked = wantsAdvance && (cashOpen === false || cashBlocked)

  const handleCreate = async () => {
    if (!validateStep2()) {
      setStep(1)

      return
    }

    if (wantsAdvance && cashOpen !== true) {
      return
    }

    setSaving(true)

    try {
      if (wantsAdvance) {
        let sessionOpen = false

        try {
          sessionOpen = (await cashApi.current(propertyId)) != null
        } catch (error) {
          toast.error(getCashApiErrorMessage(error, 'No se pudo consultar la caja.'))

          return
        }

        if (!sessionOpen) {
          setCashBlocked(true)

          return
        }
      }

      const payloadRooms: CreateReservationRoomBody[] = rooms.map(room => ({
        roomTypeId: Number(room.roomTypeId),
        roomId: room.roomId === 'later' || room.roomId === '' ? null : Number(room.roomId),
        rateId: room.rateId === '' ? null : Number(room.rateId),
        checkInDate: room.checkInDate,
        checkOutDate: room.checkOutDate,
        adults: Number(room.adults) || 1,
        children: Number(room.children) || 0,
        pricePerNight: room.pricePerNight ? Number(room.pricePerNight) : null
      }))

      const reservation =
        createdReservation.current ??
        (await reservationsApi.create(propertyId, {
          guestId: guest?.id ?? null,
          companyId: company?.id ?? null,
          source,
          externalCode: EXTERNAL_CODE_SOURCES.includes(source) ? externalCode.trim() || null : null,
          status: confirmed ? 'CONFIRMED' : 'PENDING',
          discountAmount: Number(discountAmount) || 0,
          notes: notes.trim() || null,
          rooms: payloadRooms
        }))

      createdReservation.current = { uuid: reservation.uuid, code: reservation.code }

      if (wantsAdvance) {
        await reservationsApi.addPayment(propertyId, reservation.uuid, {
          amount: advanceAmount,
          method: payMethod,
          reference: payReference.trim() || null
        })
      }

      createdReservation.current = null
      onCreated(reservation.uuid, reservation.code)
    } catch (error) {
      const message = getReservationsApiErrorMessage(error, 'No se pudo crear la reserva.')

      if (message.toLowerCase().includes('caja')) {
        setCashBlocked(true)

        return
      }

      toast.error(message)

      if (
        String((error as { statusCode?: number })?.statusCode) === '409' ||
        message.toLowerCase().includes('reservad')
      ) {
        setStep(0)
        loadAvailability()
      }
    } finally {
      setSaving(false)
    }
  }

  const renderRoomRow = (room: RoomDraft, index: number) => {
    const selectedType = availability.find(type => type.roomTypeId === room.roomTypeId)
    const rates = ratesForRoom(room)
    const selectedRate = rates.find(rate => rate.id === room.rateId)
    const selectedFree = selectedType?.freeRooms.find(free => free.id === room.roomId)
    const roomNights = nightsBetween(room.checkInDate, room.checkOutDate)
    const { adults, children } = roomGuests(room)
    const freeRooms = selectedType ? freeRoomsFor(room, selectedType) : []
    const roomValue = typeof room.roomId === 'number' && freeRooms.some(free => free.id === room.roomId) ? room.roomId : 'later'
    const crowded = selectedType ? !fitsGuests(selectedType, adults, children) : false
    const missingType = roomAttempted && !room.roomTypeId
    const missingAdult = adults < 1
    const roomDatesInvalid = room.checkOutDate <= room.checkInDate
    const subtotal = (Number(room.pricePerNight) || 0) * roomNights

    const priceSource = priceSourceLabel({
      price: room.pricePerNight,
      rate: selectedRate,
      roomNumber: selectedFree?.number,
      roomPrice: selectedFree?.effectivePrice,
      typeName: selectedType?.roomTypeName,
      typePrice: selectedType?.basePrice
    })

    return (
      <div key={room.key} className='flex flex-col gap-2'>
        {index > 0 ? <Divider className='mbe-2' /> : null}
        <div className='grid grid-cols-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_72px_72px_minmax(108px,140px)_36px] gap-3 items-start'>
          <Autocomplete
            className='col-span-2 md:col-span-1'
            size='small'
            options={availability}
            loading={loadingAvailability}
            value={selectedType ?? null}
            onChange={(_, type) => type && handleSelectType(room, type)}
            disableClearable={Boolean(selectedType)}
            getOptionLabel={type => type.roomTypeName}
            isOptionEqualToValue={(option, value) => option.roomTypeId === value.roomTypeId}
            getOptionDisabled={type => freeRoomsFor(room, type).length === 0 || !fitsGuests(type, adults, children)}
            noOptionsText='No hay tipos con ese nombre'
            loadingText='Consultando disponibilidad…'
            sx={{ '& input': { textOverflow: 'ellipsis' } }}
            slotProps={{
              popper: { placement: 'bottom-start', style: { width: 'auto' } },
              paper: { sx: { minWidth: 420 } }
            }}
            renderOption={(props, type) => {
              const { key, ...optionProps } = props as typeof props & { key: string }
              const remaining = freeRoomsFor(room, type).length
              const fits = fitsGuests(type, adults, children)

              const detail =
                remaining === 0
                  ? 'Sin disponibilidad'
                  : !fits
                    ? `No caben (hasta ${formatPeople(roomCapacity(type))})`
                    : `${formatRoomPrice(type.basePrice)} · ${remaining} libres`

              return (
                <li key={key} {...optionProps}>
                  <div className='flex justify-between items-center gap-6 is-full'>
                    <Typography variant='body2' fontWeight={600} noWrap>
                      {type.roomTypeName}
                    </Typography>
                    <Typography variant='caption' color='text.secondary' className='whitespace-nowrap'>
                      {detail}
                    </Typography>
                  </div>
                </li>
              )
            }}
            renderInput={params => (
              <TextField
                {...params}
                label='Tipo de habitación'
                placeholder='Elige el tipo'
                error={missingType}
                helperText={missingType ? 'Elige un tipo de habitación.' : undefined}
              />
            )}
          />
          <FormControl size='small' fullWidth className='col-span-2 md:col-span-1' disabled={!selectedType}>
            <InputLabel id={`room-${room.key}`}>Habitación</InputLabel>
            <Select
              labelId={`room-${room.key}`}
              label='Habitación'
              value={selectedType ? roomValue : 'later'}
              onChange={e => handleSelectRoom(room, e.target.value as number | 'later', selectedType)}
            >
              <MenuItem value='later'>Asignar después</MenuItem>
              {freeRooms.map(free => (
                <MenuItem key={free.id} value={free.id}>
                  {free.number} · {free.floorName}
                  {free.effectivePrice !== selectedType?.basePrice ? ` · ${formatRoomPrice(free.effectivePrice)}` : ''}
                  {free.status === 'CLEANING' || free.status === 'MAINTENANCE'
                    ? ` · ${free.status === 'CLEANING' ? 'Limpieza' : 'Mantenimiento'}`
                    : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size='small'
            label='Adultos'
            type='number'
            value={room.adults}
            error={crowded || missingAdult}
            helperText={missingAdult ? 'Al menos un adulto.' : undefined}
            slotProps={{ htmlInput: { min: 1 } }}
            onChange={e => updateRoom(room.key, { adults: e.target.value })}
          />
          <TextField
            size='small'
            label='Niños'
            type='number'
            value={room.children}
            error={crowded}
            slotProps={{ htmlInput: { min: 0 } }}
            onChange={e => updateRoom(room.key, { children: e.target.value })}
          />
          <TextField
            size='small'
            label='Precio/noche'
            value={room.pricePerNight}
            disabled={!selectedType}
            onChange={e => updateRoom(room.key, { pricePerNight: e.target.value, rateNotice: '' })}
            slotProps={{ input: { startAdornment: <Typography variant='body2' className='mie-1'>S/</Typography> } }}
          />
          <div className='flex items-center justify-end min-bs-[40px]'>
            {rooms.length > 1 ? (
              <IconButton
                size='small'
                aria-label='Quitar esta habitación'
                onClick={() => setRooms(current => current.filter(item => item.key !== room.key))}
              >
                <i className='ri-delete-bin-line' />
              </IconButton>
            ) : null}
          </div>
        </div>
        <div className='flex justify-end items-baseline gap-4'>
          <Typography variant='body2' color='text.secondary'>
            {roomNights} noche{roomNights === 1 ? '' : 's'} × {formatRoomPrice(Number(room.pricePerNight) || 0)}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Subtotal
          </Typography>
          <Typography fontWeight={700} sx={{ minWidth: 88, textAlign: 'right' }}>
            {formatRoomPrice(subtotal)}
          </Typography>
        </div>

        {crowded && selectedType ? (
          <Typography variant='caption' color='error.main'>
            En {selectedType.roomTypeName} entran hasta {formatPeople(roomCapacity(selectedType))}. Cambia el tipo o agrega
            otra habitación.
          </Typography>
        ) : null}
        {roomWarning && index === 0 ? (
          <Typography variant='caption' color='warning.main'>
            {roomWarning}
          </Typography>
        ) : null}
        {room.rateNotice ? (
          <Typography variant='caption' color='warning.main'>
            {room.rateNotice}
          </Typography>
        ) : null}

        <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
          {selectedType ? (
            <Typography variant='caption' color='text.secondary'>
              {priceSource}
            </Typography>
          ) : null}
          {index > 0 ? (
            <Link
              component='button'
              type='button'
              variant='caption'
              onClick={() =>
                updateRoom(
                  room.key,
                  room.customDates
                    ? { customDates: false, checkInDate: primary.checkInDate, checkOutDate: primary.checkOutDate }
                    : { customDates: true }
                )
              }
            >
              {room.customDates ? 'Usar las fechas de la estadía' : 'Fechas distintas'}
            </Link>
          ) : null}
        </div>

        {rates.length > 0 ? (
          <FormControl size='small' fullWidth className='md:max-is-[420px]'>
            <InputLabel id={`rate-${room.key}`} shrink>
              Tarifa
            </InputLabel>
            <Select
              labelId={`rate-${room.key}`}
              displayEmpty
              input={<OutlinedInput notched label='Tarifa' />}
              value={selectedRate ? room.rateId : ''}
              onChange={e => {
                const value = e.target.value as number | ''

                handleSelectRate(room, value === '' ? '' : Number(value))
              }}
            >
              {rates.map(rate => (
                <MenuItem key={rate.id} value={rate.id}>
                  {rate.name} · {formatRoomPrice(rate.price)}
                </MenuItem>
              ))}
              <MenuItem value=''>Precio normal</MenuItem>
            </Select>
            {selectedRate && rateEndsDuringStay(selectedRate, room.checkOutDate) ? (
              <FormHelperText sx={{ color: 'warning.main' }}>
                «{selectedRate.name}» vale hasta el {formatRateDate(selectedRate.validTo)}. La estadía sigue después, pero
                todas las noches se cobran a {formatRoomPrice(selectedRate.price)}. Si no corresponde, cambie el precio por
                noche.
              </FormHelperText>
            ) : null}
          </FormControl>
        ) : null}

        {index > 0 && room.customDates ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 md:max-is-[520px]'>
            <DateField
              fullWidth
              size='small'
              label='Ingreso de esta habitación'
              value={room.checkInDate}
              onChange={value => updateRoom(room.key, { checkInDate: value })}
            />
            <DateField
              fullWidth
              size='small'
              label='Salida de esta habitación'
              value={room.checkOutDate}
              minDate={room.checkInDate ? addDays(room.checkInDate, 1) : undefined}
              error={roomAttempted && roomDatesInvalid}
              helperText={roomAttempted && roomDatesInvalid ? 'La salida tiene que ser después del ingreso.' : undefined}
              onChange={value => updateRoom(room.key, { checkOutDate: value })}
            />
            <Typography variant='caption' color='text.secondary' className='sm:col-span-2'>
              La disponibilidad de estas fechas se confirma al guardar.
            </Typography>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='md' fullScreen={isMobile}>
        <DialogTitle>{fromNote ? 'Completar reserva' : quickBooking ? 'Reserva rápida' : 'Nueva reserva'}</DialogTitle>
        <DialogContent className='flex flex-col gap-5 pt-4'>
          <Stepper activeStep={step} alternativeLabel={!isMobile} orientation={isMobile ? 'horizontal' : 'horizontal'}>
            <Step>
              <StepLabel>Habitación</StepLabel>
            </Step>
            <Step>
              <StepLabel>Quién reserva</StepLabel>
            </Step>
            <Step>
              <StepLabel>Confirmación</StepLabel>
            </Step>
          </Stepper>

          {fromNote && step < 2 ? (
            <Alert severity='info' icon={<i className='ri-sticky-note-line' />}>
              Nota anotada: {prefill?.notes}. Se guarda con la reserva. Puedes corregirla al final, en Notas de la reserva.
            </Alert>
          ) : null}

          {step === 0 ? (
            <div className='flex flex-col gap-4'>
              {quickBooking ? (
                <Typography variant='body2' color='text.secondary'>
                  La habitación ya viene elegida desde el calendario. Revisa las personas y pulsa Siguiente.
                </Typography>
              ) : null}

              <Section
                title='1. Estadía'
                action={
                  <Chip
                    size='small'
                    label={`${formatStayDay(primary.checkInDate)} → ${formatStayDay(primary.checkOutDate)} · ${stayNights} noche${stayNights === 1 ? '' : 's'}`}
                  />
                }
              >
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <DateField
                    fullWidth
                    label='Ingreso (check-in)'
                    value={primary.checkInDate}
                    onChange={value =>
                      value &&
                      setStayDates(
                        value,
                        primary.checkOutDate > value ? primary.checkOutDate : addDays(value, Math.max(stayNights, 1))
                      )
                    }
                  />
                  <DateField
                    fullWidth
                    label='Salida (check-out)'
                    value={primary.checkOutDate}
                    minDate={primary.checkInDate ? addDays(primary.checkInDate, 1) : undefined}
                    error={roomAttempted && primary.checkOutDate <= primary.checkInDate}
                    helperText={
                      roomAttempted && primary.checkOutDate <= primary.checkInDate
                        ? 'La salida tiene que ser después del ingreso.'
                        : undefined
                    }
                    onChange={value => value && setStayDates(primary.checkInDate, value)}
                  />
                </div>
              </Section>

              <Section
                title={`2. Habitaciones (${rooms.length})`}
                footer={
                  <div className='flex items-center justify-end gap-4'>
                    <Typography variant='body2' color='text.secondary' className='mie-auto'>
                      {rooms.length} habitación{rooms.length === 1 ? '' : 'es'} ·{' '}
                      {formatPeople(rooms.reduce((sum, room) => sum + roomGuests(room).adults + roomGuests(room).children, 0))}
                    </Typography>
                    <Typography fontWeight={700}>Total</Typography>
                    <Typography fontWeight={700} sx={{ minWidth: 88, textAlign: 'right' }}>
                      {formatRoomPrice(selectedSubtotal)}
                    </Typography>
                  </div>
                }
              >
                {rooms.map(renderRoomRow)}
                <div>
                  <Button
                    size='small'
                    variant='text'
                    startIcon={<i className='ri-add-line' />}
                    onClick={() =>
                      setRooms(current => [
                        ...current,
                        emptyRoom(today, { checkInDate: primary.checkInDate, checkOutDate: primary.checkOutDate })
                      ])
                    }
                  >
                    Agregar otra habitación
                  </Button>
                </div>
              </Section>
            </div>
          ) : null}

          {step === 1 ? (
            <div className='flex flex-col gap-4'>
              <GuestPicker
                propertyId={propertyId}
                minChars={2}
                limit={10}
                label='Persona'
                error={bookerAttempted && !guest && !company}
                onSelect={setGuest}
              />
              {guest ? (
                <Chip label={`${guest.person.firstName} ${guest.person.lastName}`} onDelete={() => setGuest(null)} />
              ) : (
                <Button onClick={() => setCreateGuestOpen(true)}>+ Nuevo huésped</Button>
              )}
              <CompanyPicker
                propertyId={propertyId}
                label='Agencia o empresa'
                error={bookerAttempted && !guest && !company}
                onSelect={setCompany}
              />
              {bookerAttempted && !guest && !company ? (
                <Typography variant='caption' color='error.main'>
                  Elige una persona, una agencia, o las dos.
                </Typography>
              ) : null}
              {company ? (
                <Chip label={company.businessName} onDelete={() => setCompany(null)} />
              ) : (
                <Button onClick={() => setCreateCompanyOpen(true)}>+ Nueva empresa</Button>
              )}
            </div>
          ) : null}

          {step === 2 ? (
            <div className='flex flex-col gap-4'>
              <div
                className={`grid grid-cols-1 gap-4 ${EXTERNAL_CODE_SOURCES.includes(source) ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
              >
                <FormControl fullWidth>
                  <InputLabel id='reservation-status'>Estado</InputLabel>
                  <Select
                    labelId='reservation-status'
                    label='Estado'
                    value={confirmed ? 'CONFIRMED' : 'PENDING'}
                    onChange={e => setConfirmed(e.target.value === 'CONFIRMED')}
                  >
                    <MenuItem value='CONFIRMED'>Confirmada</MenuItem>
                    <MenuItem value='PENDING'>Pendiente</MenuItem>
                  </Select>
                </FormControl>
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
                  <TextField
                    label='Código externo'
                    value={externalCode}
                    onChange={e => setExternalCode(e.target.value)}
                  />
                ) : null}
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                <TextField
                  label='Alojamiento'
                  value={formatRoomPrice(selectedSubtotal)}
                  slotProps={{ input: { readOnly: true } }}
                />
                <TextField
                  label='Descuento'
                  value={discountAmount}
                  onFocus={selectIfZero}
                  onMouseUp={event => {
                    if (Number(discountAmount) === 0) event.preventDefault()
                  }}
                  onChange={e => setDiscountAmount(cleanSolesInput(e.target.value))}
                  slotProps={{ input: { startAdornment: <Typography variant='body2' className='mie-1'>S/</Typography> } }}
                />
                <TextField
                  label='Total'
                  value={formatRoomPrice(Math.max(selectedSubtotal - (Number(discountAmount) || 0), 0))}
                  slotProps={{
                    input: { readOnly: true, sx: { fontWeight: 700, fontSize: '1.05rem' } }
                  }}
                />
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                <TextField
                  label='Adelanto (opcional)'
                  value={payAmount}
                  onFocus={selectIfZero}
                  onMouseUp={event => {
                    if (Number(payAmount) === 0) event.preventDefault()
                  }}
                  onChange={e => setPayAmount(cleanSolesInput(e.target.value))}
                  slotProps={{ input: { startAdornment: <Typography variant='body2' className='mie-1'>S/</Typography> } }}
                />
                <FormControl fullWidth>
                  <InputLabel id='advance-method'>Método de pago</InputLabel>
                  <Select
                    labelId='advance-method'
                    label='Método de pago'
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
                <TextField
                  label='N.º operación'
                  value={payReference}
                  onChange={e => setPayReference(e.target.value)}
                />
              </div>
              <TextField
                label='Notas de la reserva'
                multiline
                minRows={2}
                fullWidth
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
              {cashAdvanceBlocked ? <Alert severity='error'>{CASH_ADVANCE_MESSAGE}</Alert> : null}
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
            <Button
              variant='contained'
              disabled={saving || cashAdvanceBlocked || (wantsAdvance && cashOpen === null)}
              onClick={handleCreate}
            >
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
