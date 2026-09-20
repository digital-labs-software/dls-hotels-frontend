'use client'

import { useEffect, useState } from 'react'

import Grid from '@mui/material/Grid'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'

import type { Floor } from '@/types/apps/floorTypes'
import type { RoomType } from '@/types/apps/roomTypeTypes'
import type { Room, RoomStatus } from '@/types/apps/roomsTypes'
import { ROOM_STATUS_LABELS, ROOM_STATUSES } from '@/types/apps/roomsTypes'

const TableFilters = ({
  setData,
  rooms,
  floors,
  roomTypes
}: {
  setData: (data: Room[]) => void
  rooms: Room[]
  floors: Floor[]
  roomTypes: RoomType[]
}) => {
  const [status, setStatus] = useState<RoomStatus | ''>('')
  const [floorId, setFloorId] = useState<number | ''>('')
  const [roomTypeId, setRoomTypeId] = useState<number | ''>('')

  useEffect(() => {
    const filtered = rooms.filter(room => {
      if (status && room.status !== status) return false
      if (floorId !== '' && room.floorId !== floorId) return false
      if (roomTypeId !== '' && room.roomTypeId !== roomTypeId) return false

      return true
    })

    setData(filtered)
  }, [status, floorId, roomTypeId, rooms, setData])

  const floorsWithId = floors.filter(floor => typeof floor.id === 'number')
  const typesWithId = roomTypes.filter(type => typeof type.id === 'number')

  return (
    <CardContent>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormControl fullWidth>
            <InputLabel id='room-status-filter'>Estado</InputLabel>
            <Select
              fullWidth
              label='Estado'
              labelId='room-status-filter'
              value={status}
              onChange={e => setStatus(e.target.value as RoomStatus | '')}
            >
              <MenuItem value=''>Todos</MenuItem>
              {ROOM_STATUSES.map(item => (
                <MenuItem key={item} value={item}>
                  {ROOM_STATUS_LABELS[item]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormControl fullWidth>
            <InputLabel id='room-floor-filter'>Nivel</InputLabel>
            <Select
              fullWidth
              label='Nivel'
              labelId='room-floor-filter'
              value={floorId}
              onChange={e => setFloorId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <MenuItem value=''>Todos</MenuItem>
              {floorsWithId.map(floor => (
                <MenuItem key={floor.uuid} value={floor.id}>
                  {floor.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormControl fullWidth>
            <InputLabel id='room-type-filter'>Tipo</InputLabel>
            <Select
              fullWidth
              label='Tipo'
              labelId='room-type-filter'
              value={roomTypeId}
              onChange={e => setRoomTypeId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <MenuItem value=''>Todos</MenuItem>
              {typesWithId.map(type => (
                <MenuItem key={type.uuid} value={type.id}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </CardContent>
  )
}

export default TableFilters
