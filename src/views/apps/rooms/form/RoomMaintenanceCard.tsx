'use client'

import { useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import DateField from '@/components/date-picker/DateField'
import { limaToday } from '@/types/apps/frontDeskTypes'
import type { RoomMaintenance } from '@/types/apps/roomsTypes'
import {
  createRoomMaintenance,
  deleteRoomMaintenance,
  getRoomsApiErrorMessage,
  updateRoomMaintenance
} from '@/libs/roomsApi'

type Props = {
  propertyId: number
  roomUuid?: string
  maintenances: RoomMaintenance[]
  readOnly: boolean
  onChanged: () => Promise<void> | void
}

const formatDay = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}

const nextDay = (iso: string) => {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + 1))

  return date.toISOString().slice(0, 10)
}

const laterDate = (a: string, b: string) => (a > b ? a : b)

const BlockRow = ({
  propertyId,
  roomUuid,
  block,
  readOnly,
  onChanged
}: {
  propertyId: number
  roomUuid: string
  block: RoomMaintenance
  readOnly: boolean
  onChanged: () => Promise<void> | void
}) => {
  const [endsOn, setEndsOn] = useState(block.endsOn)
  const [reason, setReason] = useState(block.reason)
  const [busy, setBusy] = useState(false)
  const minEnd = laterDate(nextDay(block.startsOn), limaToday())
  const unchanged = endsOn === block.endsOn && reason.trim() === block.reason

  const save = async () => {
    if (endsOn <= block.startsOn) {
      toast.error('La fecha en que vuelve a venderse tiene que ser posterior al inicio.')

      return
    }

    setBusy(true)

    try {
      await updateRoomMaintenance(propertyId, roomUuid, block.uuid, { endsOn, reason })
      toast.success('Mantenimiento actualizado.')
      await onChanged()
    } catch (error) {
      toast.error(getRoomsApiErrorMessage(error, 'No se pudo actualizar el mantenimiento.'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('¿Quitar este mantenimiento? Esas noches se podrán reservar.')) {
      return
    }

    setBusy(true)

    try {
      await deleteRoomMaintenance(propertyId, roomUuid, block.uuid)
      toast.success('Mantenimiento quitado.')
      await onChanged()
    } catch (error) {
      toast.error(getRoomsApiErrorMessage(error, 'No se pudo quitar el mantenimiento.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='flex flex-col gap-3 border-bs pb-4'>
      <Typography>
        No se vende desde {formatDay(block.startsOn)}. Se puede volver a reservar el {formatDay(block.endsOn)}.
      </Typography>
      {readOnly ? (
        <Typography color='text.secondary'>{block.reason}</Typography>
      ) : (
        <>
          <DateField
            label='Se puede volver a reservar el'
            value={endsOn}
            minDate={minEnd}
            disabled={busy}
            onChange={setEndsOn}
          />
          <TextField
            fullWidth
            label='Motivo'
            value={reason}
            disabled={busy}
            onChange={event => setReason(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          <div className='flex flex-wrap justify-end gap-3'>
            <Button variant='outlined' color='secondary' disabled={busy} onClick={remove}>
              Quitar
            </Button>
            <Button variant='contained' disabled={busy || !reason.trim() || unchanged} onClick={save}>
              Guardar
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

const RoomMaintenanceCard = ({ propertyId, roomUuid, maintenances, readOnly, onChanged }: Props) => {
  const today = limaToday()
  const [startsOn, setStartsOn] = useState(today)
  const [endsOn, setEndsOn] = useState(nextDay(today))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const schedule = async () => {
    if (!roomUuid) {
      return
    }

    if (!reason.trim()) {
      toast.error('Indique el motivo del mantenimiento.')

      return
    }

    if (endsOn <= startsOn || endsOn <= today) {
      toast.error('La fecha de fin es el día en que vuelve a venderse y tiene que ser posterior a hoy y al inicio.')

      return
    }

    setBusy(true)

    try {
      await createRoomMaintenance(propertyId, roomUuid, { startsOn, endsOn, reason })
      setReason('')
      toast.success('Mantenimiento programado.')
      await onChanged()
    } catch (error) {
      toast.error(getRoomsApiErrorMessage(error, 'No se pudo programar el mantenimiento.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader title='Mantenimiento programado' />
      <CardContent className='flex flex-col gap-4'>
        {!roomUuid ? (
          <Typography color='text.secondary'>Guarde la habitación para programar un mantenimiento.</Typography>
        ) : (
          <>
            {maintenances.length === 0 ? (
              <Typography color='text.secondary'>No hay mantenimiento programado.</Typography>
            ) : (
              maintenances.map(block => (
                <BlockRow
                  key={block.uuid}
                  propertyId={propertyId}
                  roomUuid={roomUuid}
                  block={block}
                  readOnly={readOnly}
                  onChanged={onChanged}
                />
              ))
            )}
            {readOnly ? null : (
              <div className='flex flex-col gap-4 border-bs pt-4'>
                <div className='flex flex-col gap-4 sm:flex-row'>
                  <div className='is-full sm:min-is-0 sm:flex-1'>
                    <DateField fullWidth label='Desde' value={startsOn} minDate={today} disabled={busy} onChange={setStartsOn} />
                  </div>
                  <div className='is-full sm:min-is-0 sm:flex-1'>
                    <DateField
                      fullWidth
                      label='Se puede volver a reservar el'
                      value={endsOn}
                      minDate={laterDate(nextDay(startsOn), nextDay(today))}
                      disabled={busy}
                      onChange={setEndsOn}
                    />
                  </div>
                </div>
                <TextField
                  fullWidth
                  label='Motivo'
                  placeholder='Reparación del baño'
                  value={reason}
                  disabled={busy}
                  onChange={event => setReason(event.target.value)}
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />
                <div className='flex justify-end'>
                  <Button variant='contained' disabled={busy || !reason.trim()} onClick={schedule}>
                    Programar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default RoomMaintenanceCard
