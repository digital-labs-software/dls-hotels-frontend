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

type Props = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  placeholder?: string
  confirming?: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

const DeleteReasonDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Eliminar',
  placeholder = 'Escriba por qué',
  confirming = false,
  onClose,
  onConfirm
}: Props) => {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  return (
    <Dialog open={open} onClose={() => !confirming && onClose()} fullWidth maxWidth='sm'>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent className='flex flex-col gap-4'>
        <Typography>{description}</Typography>
        <TextField
          label='Motivo'
          value={reason}
          onChange={event => setReason(event.target.value)}
          placeholder={placeholder}
          required
          fullWidth
          multiline
          minRows={2}
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' disabled={confirming} onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant='contained'
          color='error'
          disabled={confirming || !reason.trim()}
          onClick={() => onConfirm(reason.trim())}
        >
          {confirming ? <CircularProgress size={20} color='inherit' /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteReasonDialog
