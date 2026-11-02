'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import DateField from '@/components/date-picker/DateField'
import {
  createRoomMaintenance,
  deleteRoomMaintenance,
  getRoomsApiErrorMessage,
  updateRoomMaintenance
} from '@/libs/roomsApi'
import { limaToday } from '@/types/apps/frontDeskTypes'
import type { Room } from '@/types/apps/roomsTypes'

type Props = {
  open: boolean
  propertyId: number
  room: Room | null
  onClose: () => void
  onSaved: () => void
}

const nextDay = (iso: string) => {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + 1))

  return date.toISOString().slice(0, 10)
}

const laterDate = (a: string, b: string) => (a > b ? a : b)

const RoomMaintenanceDialog = ({ open, propertyId, room, onClose, onSaved }: Props) => {
  const block = room?.maintenances?.[0] ?? null
  const today = limaToday()
  const [startsOn, setStartsOn] = useState(today)
  const [endsOn, setEndsOn] = useState(nextDay(today))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    const start = block?.startsOn || today

    setStartsOn(start)
    setEndsOn(block?.endsOn || nextDay(start))
    setReason(block?.reason || '')
  }, [open, block?.startsOn, block?.endsOn, block?.reason, today])

  const save = async () => {
    if (!room) {
      return
    }

    if (!reason.trim()) {
      toast.error('Indique el motivo del mantenimiento.')

      return
    }

    if (endsOn <= startsOn) {
      toast.error('La fecha en que vuelve a venderse tiene que ser posterior al inicio.')

      return
    }

    setBusy(true)

    try {
      if (block) {
        await updateRoomMaintenance(propertyId, room.uuid, block.uuid, { startsOn, endsOn, reason: reason.trim() })
        toast.success('Mantenimiento actualizado.')
      } else {
        await createRoomMaintenance(propertyId, room.uuid, { startsOn, endsOn, reason: reason.trim() })
        toast.success('Habitación en mantenimiento.')
      }

      onSaved()
      onClose()
    } catch (error) {
      toast.error(getRoomsApiErrorMessage(error, 'No se pudo guardar el mantenimiento.'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!room || !block) {
      return
    }

    setBusy(true)

    try {
      await deleteRoomMaintenance(propertyId, room.uuid, block.uuid)
      toast.success(`Habitación ${room.number} habilitada.`)
      onSaved()
      onClose()
    } catch (error) {
      toast.error(getRoomsApiErrorMessage(error, 'No se pudo habilitar la habitación.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth='sm'>
      <DialogTitle>Mantenimiento · {room?.number || ''}</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-2'>
        <Typography variant='body2' color='text.secondary'>
          Esas noches no se venden. El día de fin la habitación vuelve a poder reservarse.
        </Typography>
        <DateField
          fullWidth
          label='Desde'
          value={startsOn}
          minDate={block ? undefined : today}
          disabled={busy}
          onChange={value => {
            setStartsOn(value)

            if (endsOn <= value) {
              setEndsOn(nextDay(value))
            }
          }}
        />
        <DateField
          fullWidth
          label='Vuelve a venderse el'
          value={endsOn}
          minDate={laterDate(nextDay(startsOn), block ? nextDay(block.startsOn) : nextDay(today))}
          disabled={busy}
          onChange={setEndsOn}
        />
        <TextField
          fullWidth
          label='Motivo'
          placeholder='Se malogró el baño'
          value={reason}
          disabled={busy}
          onChange={event => setReason(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
      </DialogContent>
      <DialogActions className='flex-wrap gap-2'>
        {block ? (
          <Button variant='outlined' color='secondary' disabled={busy} onClick={remove} className='mie-auto'>
            Habilitar
          </Button>
        ) : null}
        <Button variant='outlined' color='secondary' disabled={busy} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant='contained' disabled={busy || !reason.trim()} onClick={save}>
          {busy ? <CircularProgress size={20} color='inherit' /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RoomMaintenanceDialog
