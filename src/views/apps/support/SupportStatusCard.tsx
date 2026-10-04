'use client'

import { useState } from 'react'

import Badge from '@mui/material/Badge'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Typography from '@mui/material/Typography'

import type { SupportStatus } from '@/types/apps/supportTypes'
import { SUPPORT_MODE_COLORS } from '@/types/apps/supportTypes'

type Props = {
  status: SupportStatus | null
  connected: boolean
  compact?: boolean
}

const SupportStatusCard = ({ status, connected, compact = false }: Props) => {
  const [showSchedule, setShowSchedule] = useState(!compact)

  if (!status) {
    return (
      <div className='flex items-center gap-3'>
        <CircularProgress size={14} />
        <Typography variant='body2' color='text.secondary'>
          Consultando disponibilidad del soporte…
        </Typography>
      </div>
    )
  }

  const color = SUPPORT_MODE_COLORS[status.mode]

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-start gap-3'>
        <Badge
          variant='dot'
          color={color}
          overlap='circular'
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{
            '& .MuiBadge-badge': {
              inlineSize: 10,
              blockSize: 10,
              borderRadius: '50%',
              boxShadow: '0 0 0 2px var(--mui-palette-background-paper)'
            }
          }}
        >
          <div className='flex items-center justify-center rounded-full bg-primaryLight is-10 bs-10'>
            <i className='ri-customer-service-2-line text-xl text-primary' />
          </div>
        </Badge>
        <div className='min-is-0 flex-auto'>
          <Typography color='text.primary' className='font-medium'>
            Soporte DLS · {status.title}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {status.message}
          </Typography>
          {status.mode === 'OFFLINE' && status.nextOpeningLabel ? (
            <Typography variant='body2' color='text.secondary'>
              Volvemos {status.nextOpeningLabel}.
            </Typography>
          ) : null}
          {!connected ? (
            <Typography variant='caption' color='warning.main'>
              Reconectando… los mensajes nuevos pueden tardar en aparecer.
            </Typography>
          ) : null}
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        {status.scheduleSummary.length ? (
          <Button
            size='small'
            variant='text'
            color='secondary'
            startIcon={<i className='ri-time-line' />}
            onClick={() => setShowSchedule(prev => !prev)}
          >
            {showSchedule ? 'Ocultar horario' : 'Ver horario'}
          </Button>
        ) : null}
        {status.whatsappUrl ? (
          <Button
            size='small'
            variant='outlined'
            color='success'
            href={status.whatsappUrl}
            target='_blank'
            rel='noopener noreferrer'
            startIcon={<i className='ri-whatsapp-line' />}
          >
            WhatsApp urgente
          </Button>
        ) : null}
      </div>

      <Collapse in={showSchedule} unmountOnExit>
        <div className='flex flex-col gap-0.5 pis-1'>
          {status.scheduleSummary.map(line => (
            <Typography key={line} variant='caption' color='text.secondary'>
              {line}
            </Typography>
          ))}
          <Typography variant='caption' color='text.disabled'>
            Hora de Lima (Perú).
          </Typography>
        </div>
      </Collapse>
    </div>
  )
}

export default SupportStatusCard
