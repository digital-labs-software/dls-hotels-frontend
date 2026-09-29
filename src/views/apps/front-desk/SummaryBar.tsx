'use client'

import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import type { FrontDeskSummary, RackStatus } from '@/types/apps/frontDeskTypes'

type Props = {
  summary: FrontDeskSummary
  selectedStatus: RackStatus | ''
  onSelectStatus: (status: RackStatus | '') => void
  onSelectArrivals: () => void
  onSelectDepartures: () => void
}

const SummaryBar = ({ summary, selectedStatus, onSelectStatus, onSelectArrivals, onSelectDepartures }: Props) => {
  const toggle = (status: RackStatus) => {
    onSelectStatus(selectedStatus === status ? '' : status)
  }

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Chip
        clickable
        color='success'
        variant={selectedStatus === 'AVAILABLE' ? 'filled' : 'tonal'}
        label={`${summary.available} Libres`}
        onClick={() => toggle('AVAILABLE')}
      />
      <Chip
        clickable
        color='error'
        variant={selectedStatus === 'OCCUPIED' ? 'filled' : 'tonal'}
        label={`${summary.occupied} Ocupadas`}
        onClick={() => toggle('OCCUPIED')}
      />
      <Chip
        clickable
        color='warning'
        variant={selectedStatus === 'CLEANING' ? 'filled' : 'tonal'}
        label={`${summary.cleaning} Limpieza`}
        onClick={() => toggle('CLEANING')}
      />
      <Chip
        clickable
        color='secondary'
        variant={selectedStatus === 'MAINTENANCE' ? 'filled' : 'tonal'}
        label={`${summary.maintenance} Mantenimiento`}
        onClick={() => toggle('MAINTENANCE')}
      />
      <Chip clickable color='info' variant='tonal' label={`${summary.arrivals} Llegadas`} onClick={onSelectArrivals} />
      <Chip clickable color='warning' variant='tonal' label={`${summary.departures} Salidas`} onClick={onSelectDepartures} />
      <Typography variant='body2' color='text.secondary' className='mis-auto'>
        {summary.totalRooms} habitaciones · {summary.inHouse} en casa
      </Typography>
    </div>
  )
}

export default SummaryBar
