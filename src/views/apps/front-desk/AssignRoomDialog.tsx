'use client'

import { useEffect, useState } from 'react'

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
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import type { AvailabilityFreeRoom, Stay } from '@/types/apps/frontDeskTypes'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'

type Props = {
  open: boolean
  propertyId: number
  stay: Stay | null
  onClose: () => void
  onSuccess: () => void
}

const AssignRoomDialog = ({ open, propertyId, stay, onClose, onSuccess }: Props) => {
  const [rooms, setRooms] = useState<AvailabilityFreeRoom[]>([])
  const [roomId, setRoomId] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !stay) {
      return
    }

    setRoomId('')
    setLoading(true)

    const load = async () => {
      try {
        const types = await frontDeskApi.availability(propertyId, {
          checkInDate: stay.checkInDate,
          checkOutDate: stay.checkOutDate,
          adults: stay.adults,
          children: stay.children,
          roomTypeId: stay.roomTypeId
        })
        const match = types.find(type => type.id === stay.roomTypeId) ?? types[0]

        setRooms(match?.freeRooms ?? [])
      } catch (error) {
        toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo cargar la disponibilidad.'))
        setRooms([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [open, propertyId, stay])

  const handleAssign = async () => {
    if (!stay || roomId === '') {
      toast.error('Selecciona una habitación.')

      return
    }

    setSaving(true)

    try {
      await frontDeskApi.patchRoomLine(propertyId, stay.reservationUuid, stay.reservationRoomUuid, { roomId })
      toast.success('Habitación asignada.')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo asignar la habitación.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='xs'>
      <DialogTitle>Asignar habitación</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-4'>
        <Typography variant='body2' color='text.secondary'>
          {stay ? `${stay.reservationCode} · ${stay.roomTypeName}` : ''}
        </Typography>
        {loading ? (
          <div className='flex justify-center p-4'>
            <CircularProgress size={28} />
          </div>
        ) : (
          <FormControl fullWidth>
            <InputLabel id='assign-room'>Habitación libre</InputLabel>
            <Select
              labelId='assign-room'
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
                  {room.number}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
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

export default AssignRoomDialog
