'use client'

import Chip from '@mui/material/Chip'

import type { FrontDeskSummary, RackStatus } from '@/types/apps/frontDeskTypes'

type Props = {
  summary: FrontDeskSummary
  selectedStatus: RackStatus | ''
  onSelectStatus: (status: RackStatus | '') => void
}

const SummaryBar = ({ summary, selectedStatus, onSelectStatus }: Props) => {
  const toggle = (status: RackStatus) => {
    onSelectStatus(selectedStatus === status ? '' : status)
  }

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Chip
        clickable
        size='small'
        color='success'
        variant={selectedStatus === 'AVAILABLE' ? 'filled' : 'tonal'}
        label={`${summary.available} Disponibles`}
        onClick={() => toggle('AVAILABLE')}
      />
      <Chip
        clickable
        size='small'
        color='error'
        variant={selectedStatus === 'OCCUPIED' ? 'filled' : 'tonal'}
        label={`${summary.occupied} Ocupados`}
        onClick={() => toggle('OCCUPIED')}
      />
      <Chip
        clickable
        size='small'
        color='info'
        variant={selectedStatus === 'CLEANING' ? 'filled' : 'tonal'}
        label={`${summary.cleaning} Limpieza`}
        onClick={() => toggle('CLEANING')}
      />
      <Chip
        clickable
        size='small'
        color='warning'
        variant={selectedStatus === 'MAINTENANCE' ? 'filled' : 'tonal'}
        label={`${summary.maintenance} Mantenimiento`}
        onClick={() => toggle('MAINTENANCE')}
      />
    </div>
  )
}

export default SummaryBar
