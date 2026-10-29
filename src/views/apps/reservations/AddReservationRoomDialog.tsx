'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
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

import DateField from '@/components/date-picker/DateField'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'
import { pickRateForDate } from '@/types/apps/rateTypes'
import type { AvailabilityRoomType } from '@/types/apps/reservationsTypes'
import { addDays, formatPlanningDate, nightsBetween } from '@/types/apps/reservationsTypes'
import { formatPeople, roomCapacity } from '@/types/apps/roomTypeTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'

type Props = {
  open: boolean
  propertyId: number
  reservationUuid: string | null
  checkInDate: string
  checkOutDate: string
  onClose: () => void
  onSuccess: () => void
}

const fitsGuests = (type: AvailabilityRoomType, adults: number, children: number) =>
  adults + children <= roomCapacity(type) && adults <= Number(type.maxAdults) && children <= Number(type.maxChildren || 0)

const holdStatusLabel = (status: string) => {
  if (status === 'CONFIRMED') return 'confirmada'
  if (status === 'CHECKED_IN') return 'en casa'

  return 'pendiente'
}

const AddReservationRoomDialog = ({
  open,
  propertyId,
  reservationUuid,
  checkInDate,
  checkOutDate,
  onClose,
  onSuccess
}: Props) => {
  const [checkIn, setCheckIn] = useState(checkInDate)
  const [checkOut, setCheckOut] = useState(checkOutDate)
  const [availability, setAvailability] = useState<AvailabilityRoomType[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [roomTypeId, setRoomTypeId] = useState<number | ''>('')
  const [roomId, setRoomId] = useState<number | 'later'>('later')
  const [adults, setAdults] = useState('2')
  const [children, setChildren] = useState('0')
  const [rateId, setRateId] = useState<number | null>(null)
  const [ratePrice, setRatePrice] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return

    setCheckIn(checkInDate)
    setCheckOut(checkOutDate)
    setRoomTypeId('')
    setRoomId('later')
    setAdults('2')
    setChildren('0')
    setRateId(null)
    setRatePrice(null)
    setAvailability([])
  }, [open, checkInDate, checkOutDate])

  useEffect(() => {
    if (!open || !checkIn || !checkOut || checkOut <= checkIn) return

    let cancelled = false

    setLoading(true)

    reservationsApi
      .availability(propertyId, { checkInDate: checkIn, checkOutDate: checkOut })
      .then(result => {
        if (cancelled) return

        setAvailability(result.roomTypes)
        setRoomTypeId('')
        setRoomId('later')
      })
      .catch(error => {
        if (cancelled) return

        setAvailability([])
        toast.error(getReservationsApiErrorMessage(error, 'No se pudo consultar la disponibilidad.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, propertyId, checkIn, checkOut])

  const adultCount = Number(adults) || 0
  const childCount = Number(children) || 0
  const selectedType = availability.find(type => type.roomTypeId === roomTypeId)
  const freeRooms = selectedType && selectedType.availableCount > 0 ? selectedType.freeRooms : []
  const selectedRoom = freeRooms.find(room => room.id === roomId)
  const datesOk = Boolean(checkIn && checkOut && checkOut > checkIn)
  const guestsOk = selectedType ? fitsGuests(selectedType, adultCount, childCount) : false
  const canSave = Boolean(reservationUuid && selectedType && guestsOk && datesOk && !loading && !saving)

  const blocks = availability.flatMap(type =>
    type.availableCount < 1
      ? (type.unassignedHolds ?? []).map(hold => ({ ...hold, roomTypeName: type.roomTypeName }))
      : []
  )

  useEffect(() => {
    if (!open || !selectedType) {
      setRateId(null)
      setRatePrice(null)

      return
    }

    let cancelled = false

    reservationsApi
      .rates(propertyId, selectedType.roomTypeId)
      .then(page => {
        if (cancelled) return

        const best = pickRateForDate(page.data, checkIn)

        setRateId(best?.id ?? null)
        setRatePrice(best ? best.price : null)
      })
      .catch(() => {
        if (!cancelled) {
          setRateId(null)
          setRatePrice(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, propertyId, selectedType, checkIn])

  const handleSelectType = (type: AvailabilityRoomType) => {
    const people = Math.max(1, Math.min(2, Number(type.maxAdults) || 1))
    const free = type.availableCount > 0 ? type.freeRooms : []

    setRoomTypeId(type.roomTypeId)
    setRoomId(free[0]?.id ?? 'later')
    setAdults(String(people))
    setChildren('0')
  }

  const handleAdd = async () => {
    if (!reservationUuid || !selectedType || !canSave) return

    setSaving(true)

    try {
      await reservationsApi.addRoom(propertyId, reservationUuid, {
        roomTypeId: selectedType.roomTypeId,
        roomId: roomId === 'later' ? null : roomId,
        rateId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: adultCount,
        children: childCount
      })
      toast.success('Habitación agregada.')
      onSuccess()
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo agregar la habitación.'))
    } finally {
      setSaving(false)
    }
  }

  const nights = datesOk ? nightsBetween(checkIn, checkOut) : 0
  const price = ratePrice ?? selectedRoom?.effectivePrice ?? selectedType?.basePrice

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='sm'>
      <DialogTitle>Agregar habitación</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-4'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <DateField
            fullWidth
            label='Ingreso'
            value={checkIn}
            onChange={value => {
              if (!value) return

              setCheckIn(value)

              if (checkOut <= value) setCheckOut(addDays(value, 1))
            }}
          />
          <DateField
            fullWidth
            label='Salida'
            value={checkOut}
            minDate={checkIn ? addDays(checkIn, 1) : undefined}
            onChange={value => value && setCheckOut(value)}
          />
        </div>
        {datesOk ? (
          <Typography variant='caption' color='text.secondary'>
            {formatPlanningDate(checkIn)} – {formatPlanningDate(checkOut)} · {nights} noche{nights === 1 ? '' : 's'}
          </Typography>
        ) : (
          <Typography variant='caption' color='error.main'>
            La salida tiene que ser después del ingreso.
          </Typography>
        )}

        {blocks.map(hold => (
          <Alert key={`${hold.roomTypeName}-${hold.code}-${hold.checkInDate}`} severity='warning'>
            Hay una reserva {holdStatusLabel(hold.status)} de {hold.roomTypeName} del {formatPlanningDate(hold.checkInDate)}{' '}
            al {formatPlanningDate(hold.checkOutDate)} ({hold.code}) y todavía no tiene número de habitación. Por eso no se
            puede vender otra en esas fechas.
          </Alert>
        ))}

        <Autocomplete
          size='small'
          options={availability}
          loading={loading}
          value={selectedType ?? null}
          onChange={(_, type) => type && handleSelectType(type)}
          getOptionLabel={type => type.roomTypeName}
          isOptionEqualToValue={(option, value) => option.roomTypeId === value.roomTypeId}
          getOptionDisabled={type => type.availableCount < 1 || !fitsGuests(type, adultCount, childCount)}
          noOptionsText='No hay tipos con ese nombre'
          loadingText='Consultando disponibilidad…'
          renderOption={(props, type) => {
            const { key, ...optionProps } = props as typeof props & { key: string }
            const remaining = type.availableCount > 0 ? type.freeRooms.length : 0
            const fits = fitsGuests(type, adultCount, childCount)
            const heldWithoutNumber = type.availableCount < 1 && type.freeRooms.length > 0

            const detail =
              remaining === 0
                ? heldWithoutNumber
                  ? 'Reservada sin número'
                  : 'Sin disponibilidad'
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
          renderInput={params => <TextField {...params} label='Tipo de habitación' placeholder='Elige el tipo' />}
        />

        <FormControl size='small' fullWidth disabled={!selectedType || freeRooms.length === 0}>
          <InputLabel id='add-reservation-room'>Habitación</InputLabel>
          <Select
            labelId='add-reservation-room'
            label='Habitación'
            value={selectedType && (roomId === 'later' || freeRooms.some(room => room.id === roomId)) ? roomId : 'later'}
            onChange={event => {
              const next = event.target.value

              setRoomId(next === 'later' ? 'later' : Number(next))
            }}
          >
            <MenuItem value='later'>Asignar después</MenuItem>
            {freeRooms.map(room => (
              <MenuItem key={room.id} value={room.id}>
                {room.number} · {room.floorName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <div className='grid grid-cols-2 gap-4'>
          <TextField
            size='small'
            label='Adultos'
            type='number'
            value={adults}
            onChange={event => setAdults(event.target.value)}
            slotProps={{ htmlInput: { min: 1, max: 50 } }}
          />
          <TextField
            size='small'
            label='Niños'
            type='number'
            value={children}
            onChange={event => setChildren(event.target.value)}
            slotProps={{ htmlInput: { min: 0, max: 50 } }}
          />
        </div>

        {selectedType && !guestsOk ? (
          <Typography variant='caption' color='error.main'>
            En {selectedType.roomTypeName} entran hasta {formatPeople(roomCapacity(selectedType))}.
          </Typography>
        ) : null}
        {selectedType && price != null ? (
          <Typography variant='body2' color='text.secondary'>
            {formatRoomPrice(price)} por noche
            {nights > 0 ? ` · ${formatRoomPrice(price * nights)}` : ''}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant='contained' disabled={!canSave} onClick={handleAdd}>
          {saving ? <CircularProgress size={20} color='inherit' /> : 'Agregar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddReservationRoomDialog
