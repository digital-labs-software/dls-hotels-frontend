'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
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
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import type { AvailabilityRoom, AvailabilityRoomType } from '@/types/apps/reservationsTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'

type Props = {
  open: boolean
  propertyId: number
  reservationUuid: string | null
  lineUuid: string | null
  roomTypeId: number | null
  pricePerNight: number
  hasRoom: boolean
  checkInDate: string
  checkOutDate: string
  adults?: number
  children?: number
  onClose: () => void
  onSuccess: () => void
}

const AssignReservationRoomDialog = ({
  open,
  propertyId,
  reservationUuid,
  lineUuid,
  roomTypeId,
  pricePerNight,
  hasRoom,
  checkInDate,
  checkOutDate,
  adults,
  children,
  onClose,
  onSuccess
}: Props) => {
  const [types, setTypes] = useState<AvailabilityRoomType[]>([])
  const [selectedTypeId, setSelectedTypeId] = useState<number | ''>('')
  const [roomId, setRoomId] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !checkInDate || !checkOutDate) {
      return
    }

    setRoomId('')
    setSelectedTypeId(roomTypeId ?? '')
    setLoading(true)

    const load = async () => {
      try {
        const availability = await reservationsApi.availability(propertyId, {
          checkInDate,
          checkOutDate,
          adults,
          children
        })

        setTypes(availability.roomTypes)

        const preferred = roomTypeId
        const next = availability.roomTypes.some(type => type.roomTypeId === preferred)
          ? preferred
          : (availability.roomTypes[0]?.roomTypeId ?? '')

        setSelectedTypeId(next ?? '')
      } catch (error) {
        toast.error(getReservationsApiErrorMessage(error, 'No se pudo cargar la disponibilidad.'))
        setTypes([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [adults, checkInDate, checkOutDate, children, open, propertyId, roomTypeId])

  const selectedType = types.find(type => type.roomTypeId === selectedTypeId)
  const rooms: AvailabilityRoom[] = selectedType?.freeRooms ?? []
  const selectedRoom = rooms.find(room => room.id === roomId)
  const typeChanged = selectedTypeId !== '' && selectedTypeId !== roomTypeId
  const tooSmall = selectedType?.fitsRequestedGuests === false

  const handleAssign = async () => {
    if (!reservationUuid || !lineUuid || roomId === '' || selectedTypeId === '') {
      toast.error('Selecciona una habitación.')

      return
    }

    setSaving(true)

    try {
      await reservationsApi.updateRoom(
        propertyId,
        reservationUuid,
        lineUuid,
        typeChanged ? { roomTypeId: selectedTypeId, roomId, rateId: null } : { roomId }
      )
      toast.success(typeChanged ? 'Habitación cambiada. El precio de la reserva se actualizó.' : 'Habitación asignada.')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo asignar la habitación.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='sm'>
      <DialogTitle>{hasRoom ? 'Cambiar habitación' : 'Asignar habitación'}</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-4'>
        {loading ? (
          <div className='flex justify-center p-4'>
            <CircularProgress size={28} />
          </div>
        ) : (
          <>
            <FormControl fullWidth>
              <InputLabel id='assign-reservation-type'>Tipo</InputLabel>
              <Select
                labelId='assign-reservation-type'
                label='Tipo'
                value={selectedTypeId}
                onChange={event => {
                  const next = Number(event.target.value)

                  setSelectedTypeId(Number.isFinite(next) ? next : '')
                  setRoomId('')
                }}
              >
                {types.map(type => (
                  <MenuItem key={type.roomTypeId} value={type.roomTypeId}>
                    {type.roomTypeName}
                    {type.roomTypeId === roomTypeId ? ' · actual' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id='assign-reservation-room'>Habitación libre</InputLabel>
              <Select
                labelId='assign-reservation-room'
                label='Habitación libre'
                value={roomId}
                onChange={event => {
                  const next = Number(event.target.value)

                  setRoomId(Number.isFinite(next) ? next : '')
                }}
              >
                {rooms.length === 0 ? <MenuItem value=''>No hay habitaciones libres</MenuItem> : null}
                {rooms.map(room => (
                  <MenuItem key={room.id} value={room.id}>
                    <span className='flex items-center gap-2'>
                      {room.number} · {room.floorName} · {formatRoomPrice(room.effectivePrice)}
                      {room.status === 'CLEANING' ? <Chip size='small' label='Limpieza' /> : null}
                    </span>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {rooms.length === 0 ? (
              <Typography color='text.secondary'>No hay habitaciones libres de este tipo en esas fechas.</Typography>
            ) : null}
            {tooSmall ? (
              <Typography color='text.secondary'>Este tipo no alcanza para las personas de la reserva.</Typography>
            ) : null}
            {typeChanged && selectedRoom && !tooSmall ? (
              <Typography>
                Pasa de {formatRoomPrice(pricePerNight)} a {formatRoomPrice(selectedRoom.effectivePrice)} por noche.
              </Typography>
            ) : null}
            {!typeChanged && selectedRoom ? (
              <Typography color='text.secondary'>El precio por noche no cambia.</Typography>
            ) : null}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant='contained' disabled={saving || loading || roomId === '' || tooSmall} onClick={handleAssign}>
          {saving ? <CircularProgress size={20} color='inherit' /> : hasRoom ? 'Cambiar' : 'Asignar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AssignReservationRoomDialog
