'use client'

import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import { ROW_DRAG_HANDLE_CLASS } from '@/hooks/useReorderableRows'

/** Primera celda de la fila: ícono para arrastrar y la posición (1, 2, 3…). */
export const RowPosition = ({ position, disabled }: { position: number; disabled: boolean }) => (
  <div className='flex items-center gap-1'>
    {disabled ? (
      <span className='inline-block is-10' />
    ) : (
      <span
        className={`${ROW_DRAG_HANDLE_CLASS} flex items-center justify-center is-10 bs-10 rounded cursor-grab active:cursor-grabbing text-textSecondary hover:bg-actionHover`}
        style={{ touchAction: 'none' }}
        title='Arrastre para cambiar el orden'
        aria-label='Arrastrar para cambiar el orden'
      >
        <i className='ri-draggable text-2xl' />
      </span>
    )}
    <Typography color='text.primary' className='font-medium min-is-6 text-center'>
      {position}
    </Typography>
  </div>
)

type MoveButtonsProps = {
  index: number
  count: number
  disabled: boolean
  onMove: (index: number, delta: -1 | 1) => void
}

/** Flechas para subir o bajar una posición; útiles en el celular. */
export const MoveButtons = ({ index, count, disabled, onMove }: MoveButtonsProps) => (
  <div className='flex items-center'>
    <IconButton
      onClick={() => onMove(index, -1)}
      disabled={disabled || index === 0}
      title='Subir'
      aria-label='Subir una posición'
    >
      <i className='ri-arrow-up-line' />
    </IconButton>
    <IconButton
      onClick={() => onMove(index, 1)}
      disabled={disabled || index === count - 1}
      title='Bajar'
      aria-label='Bajar una posición'
    >
      <i className='ri-arrow-down-line' />
    </IconButton>
  </div>
)

type ReorderHintProps = {
  searching: boolean
  saving: boolean
  count: number
}

/** Explica cómo ordenar, o por qué no se puede mientras hay una búsqueda. */
export const ReorderHint = ({ searching, saving, count }: ReorderHintProps) => {
  if (count < 2 && !saving) {
    return null
  }

  return (
    <div className='flex items-center gap-2 pli-5 pbe-4'>
      {saving ? (
        <>
          <CircularProgress size={14} />
          <Typography variant='body2' color='text.secondary'>
            Guardando orden…
          </Typography>
        </>
      ) : searching ? (
        <>
          <i className='ri-information-line text-textSecondary' />
          <Typography variant='body2' color='text.secondary'>
            Borre la búsqueda para reordenar.
          </Typography>
        </>
      ) : (
        <>
          <i className='ri-draggable text-textSecondary' />
          <Typography variant='body2' color='text.secondary'>
            Para cambiar el orden, arrastre desde el ícono o use las flechas. Se guarda solo.
          </Typography>
        </>
      )}
    </div>
  )
}
