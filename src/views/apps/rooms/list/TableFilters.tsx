'use client'

import Grid from '@mui/material/Grid'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'

import type { Floor } from '@/types/apps/floorTypes'
import type { RoomType } from '@/types/apps/roomTypeTypes'
import type { RoomStatus } from '@/types/apps/roomsTypes'
import { ROOM_STATUS_LABELS, ROOM_STATUSES } from '@/types/apps/roomsTypes'

const TableFilters = ({
  status,
  floorId,
  roomTypeId,
  floors,
  roomTypes,
  onStatusChange,
  onFloorChange,
  onRoomTypeChange
}: {
  status: RoomStatus | ''
  floorId: number | ''
  roomTypeId: number | ''
  floors: Floor[]
  roomTypes: RoomType[]
  onStatusChange: (value: RoomStatus | '') => void
  onFloorChange: (value: number | '') => void
  onRoomTypeChange: (value: number | '') => void
}) => {
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
              onChange={e => onStatusChange(e.target.value as RoomStatus | '')}
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
              onChange={e => onFloorChange(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <MenuItem value=''>Todos</MenuItem>
              {floors.map(floor => (
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
              onChange={e => onRoomTypeChange(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <MenuItem value=''>Todos</MenuItem>
              {roomTypes.map(type => (
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
