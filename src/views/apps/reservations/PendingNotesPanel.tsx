'use client'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import type { ReservationNote } from '@/types/apps/reservationsTypes'
import { formatPlanningDate } from '@/types/apps/reservationsTypes'

const formatWhen = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

type Props = {
  notes: ReservationNote[]
  onComplete: (note: ReservationNote) => void
  onDiscard: (note: ReservationNote) => void
}

const PendingNotesPanel = ({ notes, onComplete, onDiscard }: Props) => {
  if (notes.length === 0) {
    return (
      <Typography color='text.secondary'>
        No hay notas por completar. Si llega algo urgente y aún no puedes armar la reserva, pulsa Anotar.
      </Typography>
    )
  }

  return (
    <div className='flex flex-col gap-3'>
      <Typography variant='body2' color='text.secondary'>
        Notas urgentes. Cuando tengas un momento, completa cada una como reserva.
      </Typography>
      {notes.map(note => (
        <Card key={note.uuid} variant='outlined'>
          <CardContent className='flex flex-col gap-2'>
            <Typography fontWeight={700}>{formatPlanningDate(note.stayDate)}</Typography>
            <Typography>{note.text}</Typography>
            <Typography variant='caption' color='text.secondary'>
              Anotó {note.createdByName} · {formatWhen(note.createdAt)} · Por completar
            </Typography>
            <div className='flex flex-wrap gap-2'>
              <Button size='small' variant='contained' onClick={() => onComplete(note)}>
                Completar reserva
              </Button>
              <Button size='small' color='secondary' onClick={() => onDiscard(note)}>
                Descartar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default PendingNotesPanel
