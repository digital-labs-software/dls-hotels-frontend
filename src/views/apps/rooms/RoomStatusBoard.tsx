'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'
import { deleteRoomMaintenance, getRoom, getRoomsApiErrorMessage } from '@/libs/roomsApi'
import type { FrontDeskFloor, RackRoom, RoomPhysicalStatus } from '@/types/apps/frontDeskTypes'
import type { Room } from '@/types/apps/roomsTypes'
import RoomMaintenanceDialog from '@views/apps/rooms/list/RoomMaintenanceDialog'

const changedEvent = 'front-desk-rooms-changed'

const notifyRack = () => window.dispatchEvent(new Event(changedEvent))

type Tone = 'available' | 'cleaning' | 'maintenance' | 'occupied'

type ToneStyle = {
  background: string
  ink: string
  line: string
  label: string
}

const toneStyle: Record<Tone, ToneStyle> = {
  available: {
    background: 'var(--mui-palette-success-lightOpacity)',
    ink: 'var(--mui-palette-success-main)',
    line: 'var(--mui-palette-success-mainOpacity)',
    label: 'Disponible'
  },
  cleaning: {
    background: 'var(--mui-palette-info-lightOpacity)',
    ink: 'var(--mui-palette-info-main)',
    line: 'var(--mui-palette-info-mainOpacity)',
    label: 'Limpieza'
  },
  maintenance: {
    background: 'var(--mui-palette-warning-lightOpacity)',
    ink: 'var(--mui-palette-warning-main)',
    line: 'var(--mui-palette-warning-mainOpacity)',
    label: 'Mantenimiento'
  },
  occupied: {
    background: 'var(--mui-palette-error-lightOpacity)',
    ink: 'var(--mui-palette-error-main)',
    line: 'var(--mui-palette-error-mainOpacity)',
    label: 'Ocupada'
  }
}

const toneOf = (room: RackRoom): Tone => {
  if (room.displayStatus === 'MAINTENANCE') return 'maintenance'
  if (room.displayStatus === 'OCCUPIED' || room.status === 'OCCUPIED') return 'occupied'
  if (room.status === 'CLEANING') return 'cleaning'

  return 'available'
}

const compareNumber = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true })

const maintenanceButtonSx = {
  backgroundColor: 'var(--mui-palette-warning-dark)',
  color: '#fff',
  '&:hover': { backgroundColor: 'var(--mui-palette-warning-dark)', filter: 'brightness(0.92)' }
} as const

const RoomStatusBoard = () => {
  const { data: session, status } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const [floors, setFloors] = useState<FrontDeskFloor[]>([])
  const [loading, setLoading] = useState(true)
  const [maintainRoom, setMaintainRoom] = useState<Room | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [floorId, setFloorId] = useState<number | 'all'>('all')
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))
  const busy = useRef(new Set<string>())

  const load = useCallback(async () => {
    const overview = await frontDeskApi.overview(propertyId)

    setFloors(overview.floors)
  }, [propertyId])

  useEffect(() => {
    if (status === 'loading') return

    let active = true

    load()
      .catch(error => {
        toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo cargar el estado de las habitaciones.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [load, status])

  const paint = (uuids: string[], nextStatus: Extract<RoomPhysicalStatus, 'AVAILABLE' | 'CLEANING'>) => {
    setFloors(current =>
      current.map(floor => ({
        ...floor,
        rooms: floor.rooms.map(room => {
          if (!uuids.includes(room.uuid)) return room

          return {
            ...room,
            status: nextStatus,
            displayStatus: room.displayStatus === 'RESERVED' ? 'RESERVED' : nextStatus
          }
        })
      }))
    )
  }

  const setStatus = async (
    rooms: RackRoom[],
    nextStatus: Extract<RoomPhysicalStatus, 'AVAILABLE' | 'CLEANING'>
  ): Promise<boolean> => {
    const free = rooms.filter(room => {
      const tone = toneOf(room)

      return !busy.current.has(room.uuid) && tone !== 'occupied' && tone !== 'maintenance' && room.status !== nextStatus
    })

    if (!free.length) return false

    const previous = free.map(room => ({ uuid: room.uuid, number: room.number, status: room.status }))

    free.forEach(room => busy.current.add(room.uuid))
    paint(
      free.map(room => room.uuid),
      nextStatus
    )

    try {
      await Promise.all(free.map(room => frontDeskApi.setRoomStatus(propertyId, room.uuid, nextStatus)))
      notifyRack()

      const toastId = `status-${free.map(room => room.uuid).join('-')}-${nextStatus}`
      const label =
        free.length === 1
          ? `Habitación ${free[0].number} ${nextStatus === 'AVAILABLE' ? 'lista' : 'en limpieza'}`
          : `${free.length} habitaciones ${nextStatus === 'AVAILABLE' ? 'listas' : 'en limpieza'}`

      toast.success(
        <span className='flex items-center gap-3'>
          {label}
          <button
            type='button'
            className='font-semibold underline'
            onClick={() => {
              toast.dismiss(toastId)
              void undo(previous)
            }}
          >
            Deshacer
          </button>
        </span>,
        { toastId, autoClose: 6000 }
      )
    } catch (error) {
      previous.forEach(room => {
        if (room.status === 'AVAILABLE' || room.status === 'CLEANING') paint([room.uuid], room.status)
      })
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo cambiar el estado.'))

      return false
    } finally {
      free.forEach(room => busy.current.delete(room.uuid))
    }

    return true
  }

  const undo = async (previous: { uuid: string; number: string; status: RoomPhysicalStatus }[]) => {
    const restorable = previous.filter(
      (room): room is { uuid: string; number: string; status: 'AVAILABLE' | 'CLEANING' } =>
        room.status === 'AVAILABLE' || room.status === 'CLEANING'
    )

    restorable.forEach(room => paint([room.uuid], room.status))

    try {
      await Promise.all(restorable.map(room => frontDeskApi.setRoomStatus(propertyId, room.uuid, room.status)))
      notifyRack()
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo deshacer.'))
      await load().catch(() => undefined)
    }
  }

  const openMaintenance = async (room: RackRoom) => {
    setOpeningId(room.uuid)

    try {
      setMaintainRoom(await getRoom(propertyId, room.uuid))
    } catch (error) {
      toast.error(getRoomsApiErrorMessage(error, 'No se pudo abrir el mantenimiento.'))
    } finally {
      setOpeningId(null)
    }
  }

  const enableRoom = async (room: RackRoom) => {
    setOpeningId(room.uuid)

    try {
      const full = await getRoom(propertyId, room.uuid)
      const block = full.maintenances[0]

      if (!block) {
        toast.error('Esta habitación no tiene un mantenimiento para habilitar.')

        return
      }

      await deleteRoomMaintenance(propertyId, room.uuid, block.uuid)
      notifyRack()
      toast.success(`Habitación ${room.number} habilitada.`)
      await load()
    } catch (error) {
      toast.error(getRoomsApiErrorMessage(error, 'No se pudo habilitar la habitación.'))
    } finally {
      setOpeningId(null)
    }
  }

  const needle = query.trim().toLowerCase()

  const ordered = floors
    .filter(floor => floorId === 'all' || floor.floorId === floorId)
    .map(floor => ({
      ...floor,
      rooms: [...floor.rooms]
        .filter(room => !needle || room.number.toLowerCase().includes(needle))
        .sort((a, b) => compareNumber(a.number, b.number))
    }))
    .filter(floor => floor.rooms.length > 0)

  const visibleCleaning = ordered.flatMap(floor => floor.rooms.filter(room => toneOf(room) === 'cleaning'))
  const selected = visibleCleaning.filter(room => checked[room.uuid])
  const allChecked = visibleCleaning.length > 0 && selected.length === visibleCleaning.length

  const changeQuery = (value: string) => {
    setQuery(value)
    setChecked({})
  }

  const changeFloor = (value: number | 'all') => {
    setFloorId(value)
    setChecked({})
  }

  const toggleRoom = (room: RackRoom, value: boolean) => {
    if (toneOf(room) !== 'cleaning') return

    setChecked(current => ({ ...current, [room.uuid]: value }))
  }

  const toggleAll = (value: boolean) => {
    setChecked(Object.fromEntries(visibleCleaning.map(room => [room.uuid, value])))
  }

  const markListed = async () => {
    if (!selected.length) return

    const ok = await setStatus(selected, 'AVAILABLE')

    if (ok) setChecked({})
  }

  const listLabel = selected.length ? `Dejar listas (${selected.length})` : 'Dejar listas'

  if (loading) {
    return (
      <div className='flex justify-center items-center p-10'>
        <CircularProgress size={32} />
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-4 ${isMobile ? 'pb-20' : ''}`}>
      <div className='flex flex-col gap-3'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
          <TextField
            size='small'
            value={query}
            placeholder='Buscar habitación'
            onChange={event => changeQuery(event.target.value)}
            className='is-full shrink-0 sm:is-[240px]'
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='ri-search-line' />
                  </InputAdornment>
                )
              }
            }}
          />
          <div className='flex flex-wrap items-center gap-2 sm:flex-nowrap sm:overflow-x-auto'>
            <Chip
              label='Todos'
              color={floorId === 'all' ? 'primary' : 'default'}
              variant={floorId === 'all' ? 'filled' : 'outlined'}
              onClick={() => changeFloor('all')}
            />
            {floors.map(floor => (
              <Chip
                key={floor.floorId}
                label={floor.floorName}
                color={floorId === floor.floorId ? 'primary' : 'default'}
                variant={floorId === floor.floorId ? 'filled' : 'outlined'}
                onClick={() => changeFloor(floor.floorId)}
              />
            ))}
          </div>
        </div>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <FormControlLabel
            control={
              <Checkbox
                checked={allChecked}
                indeterminate={selected.length > 0 && !allChecked}
                disabled={!visibleCleaning.length}
                onChange={event => toggleAll(event.target.checked)}
                inputProps={{ 'aria-label': 'Seleccionar todas las habitaciones en limpieza que se ven' }}
              />
            }
            label={visibleCleaning.length ? `Seleccionar todas (${visibleCleaning.length})` : 'Seleccionar todas'}
          />
          {isMobile ? null : (
            <Button variant='contained' color='success' disabled={!selected.length} onClick={() => void markListed()}>
              {listLabel}
            </Button>
          )}
        </div>
      </div>

      {ordered.length === 0 ? (
        <Typography color='text.secondary'>No hay habitaciones con ese filtro.</Typography>
      ) : (
        ordered.map(floor => {
          const cleaningCount = floor.rooms.filter(room => toneOf(room) === 'cleaning').length

          return (
            <Card key={floor.floorId}>
              <CardContent className='flex flex-col gap-4'>
                <div>
                  <Typography variant='h6'>{floor.floorName}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {cleaningCount === 0
                      ? 'Nada en limpieza'
                      : cleaningCount === 1
                        ? '1 en limpieza'
                        : `${cleaningCount} en limpieza`}
                  </Typography>
                </div>
                <div className='flex flex-wrap gap-3'>
                  {floor.rooms.map(room => {
                    const tone = toneOf(room)
                    const style = toneStyle[tone]
                    const opening = openingId === room.uuid
                    const reserved = Boolean(room.arrival) && tone !== 'occupied'
                    const isChecked = Boolean(checked[room.uuid])

                    return (
                      <Box
                        key={room.uuid}
                        onClick={() => toggleRoom(room, !isChecked)}
                        className='flex w-full flex-col overflow-hidden rounded-md sm:w-[280px]'
                        sx={{
                          minHeight: 176,
                          backgroundColor: style.background,
                          color: style.ink,
                          border: isChecked ? '2px solid' : '1px solid',
                          borderColor: isChecked ? 'var(--mui-palette-text-primary)' : style.ink,
                          cursor: tone === 'cleaning' ? 'pointer' : 'default'
                        }}
                      >
                        <div className='flex items-center gap-1' style={{ minHeight: 44, padding: '8px 10px' }}>
                          <div className='flex w-8 shrink-0 items-center justify-center'>
                            {tone === 'cleaning' ? (
                              <Checkbox
                                checked={isChecked}
                                onClick={event => event.stopPropagation()}
                                onChange={event => toggleRoom(room, event.target.checked)}
                                inputProps={{ 'aria-label': `Seleccionar habitación ${room.number}` }}
                                sx={{ p: 0.5, color: style.ink }}
                              />
                            ) : null}
                          </div>
                          <Typography variant='h5' className='font-semibold leading-none' color='inherit'>
                            {room.number}
                          </Typography>
                        </div>
                        <div style={{ height: 1, backgroundColor: style.line }} />
                        <div
                          className='flex flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-center'
                          style={{ minHeight: 72 }}
                        >
                          <Typography variant='body1' className='font-semibold' color='inherit'>
                            {style.label}
                          </Typography>
                          {reserved ? (
                            <Typography variant='caption' color='primary'>
                              Reservada
                            </Typography>
                          ) : null}
                          {tone === 'maintenance' && room.maintenanceReason ? (
                            <Typography variant='caption' color='inherit'>
                              {room.maintenanceReason}
                            </Typography>
                          ) : null}
                        </div>
                        {tone === 'occupied' ? null : (
                          <>
                            <div style={{ height: 1, backgroundColor: style.line }} />
                            <div className='flex gap-2' style={{ padding: '8px 10px' }} onClick={event => event.stopPropagation()}>
                              {tone === 'available' ? (
                                <Button
                                  size='small'
                                  variant='contained'
                                  color='info'
                                  className='flex-1'
                                  onClick={() => void setStatus([room], 'CLEANING')}
                                >
                                  Limpieza
                                </Button>
                              ) : null}
                              {tone === 'maintenance' ? (
                                <Button
                                  size='small'
                                  variant='contained'
                                  className='flex-1'
                                  disabled={opening}
                                  onClick={() => void enableRoom(room)}
                                  sx={maintenanceButtonSx}
                                >
                                  {opening ? <CircularProgress size={16} color='inherit' /> : 'Habilitar'}
                                </Button>
                              ) : (
                                <Button
                                  size='small'
                                  variant='contained'
                                  className='flex-1'
                                  disabled={opening}
                                  onClick={() => void openMaintenance(room)}
                                  sx={maintenanceButtonSx}
                                >
                                  {opening ? <CircularProgress size={16} color='inherit' /> : 'Mantenimiento'}
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </Box>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}

      {isMobile ? (
        <Box sx={{ position: 'sticky', bottom: 16, zIndex: 5 }}>
          <Button
            fullWidth
            variant='contained'
            color='success'
            disabled={!selected.length}
            onClick={() => void markListed()}
          >
            {listLabel}
          </Button>
        </Box>
      ) : null}

      <RoomMaintenanceDialog
        open={Boolean(maintainRoom)}
        propertyId={propertyId}
        room={maintainRoom}
        onClose={() => setMaintainRoom(null)}
        onSaved={() => {
          notifyRack()
          void load()
        }}
      />
    </div>
  )
}

export default RoomStatusBoard
