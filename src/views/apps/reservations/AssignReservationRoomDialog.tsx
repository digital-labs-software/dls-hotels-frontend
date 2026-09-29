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

import type { AvailabilityRoom } from '@/types/apps/reservationsTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'

type Props = {
  open: boolean
  propertyId: number
  reservationUuid: string | null
  lineUuid: string | null
  roomTypeId: number | null
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
  checkInDate,
  checkOutDate,
  adults,
  children,
  onClose,
  onSuccess
}: Props) => {
  const [rooms, setRooms] = useState<AvailabilityRoom[]>([])
  const [roomId, setRoomId] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !checkInDate || !checkOutDate) {
      return
    }

    setRoomId('')
    setLoading(true)

    const load = async () => {
      try {
        const availability = await reservationsApi.availability(propertyId, {
          checkInDate,
          checkOutDate,
          adults,
          children
        })
        const match = availability.roomTypes.find(type => type.roomTypeId === roomTypeId) ?? availability.roomTypes[0]

        setRooms(match?.freeRooms ?? [])
      } catch (error) {
        toast.error(getReservationsApiErrorMessage(error, 'No se pudo cargar la disponibilidad.'))
        setRooms([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [adults, checkInDate, checkOutDate, children, open, propertyId, roomTypeId])

  const handleAssign = async () => {
    if (!reservationUuid || !lineUuid || roomId === '') {
      toast.error('Selecciona una habitación.')

      return
    }

    setSaving(true)

    try {
      await reservationsApi.updateRoom(propertyId, reservationUuid, lineUuid, { roomId })
      toast.success('Habitación asignada.')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo asignar la habitación.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='xs'>
      <DialogTitle>Asignar habitación</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-4'>
        {loading ? (
          <div className='flex justify-center p-4'>
            <CircularProgress size={28} />
          </div>
        ) : (
          <FormControl fullWidth>
            <InputLabel id='assign-reservation-room'>Habitación libre</InputLabel>
            <Select
              labelId='assign-reservation-room'
              label='Habitación libre'
              value={roomId}
              onChange={e => {
                const next = Number(e.target.value)

                setRoomId(Number.isFinite(next) ? next : '')
              }}
            >
              {rooms.length === 0 ? <MenuItem value=''>No hay habitaciones libres</MenuItem> : null}
              {rooms.map(room => (
                <MenuItem key={room.id} value={room.id}>
                  <span className='flex items-center gap-2'>
                    {room.number} · {room.floorName} · {formatRoomPrice(room.effectivePrice)}
                    {room.status === 'CLEANING' || room.status === 'MAINTENANCE' ? (
                      <Chip size='small' label={room.status === 'CLEANING' ? 'Limpieza' : 'Mantenimiento'} />
                    ) : null}
                  </span>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Typography variant='caption' color='text.secondary'>
          Limpieza o mantenimiento es el estado de hoy; no bloquea una reserva futura.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant='contained' disabled={saving || loading || rooms.length === 0} onClick={handleAssign}>
          {saving ? <CircularProgress size={20} color='inherit' /> : 'Asignar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AssignReservationRoomDialog
