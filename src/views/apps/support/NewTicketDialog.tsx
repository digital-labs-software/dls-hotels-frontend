'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

import type { CreateSupportTicketDto, SupportStatus, SupportTicketCategory } from '@/types/apps/supportTypes'
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_MAX_ATTACHMENTS,
  SUPPORT_MAX_MESSAGE
} from '@/types/apps/supportTypes'
import { validateSupportFile } from '@/libs/supportApi'
import { PendingFiles, SUPPORT_FILE_ACCEPT } from './SupportAttachments'

type Props = {
  open: boolean
  status: SupportStatus | null
  submitting: boolean
  onClose: () => void
  onSubmit: (payload: Omit<CreateSupportTicketDto, 'attachments'>, files: File[]) => Promise<boolean>
}

const NewTicketDialog = ({ open, status, submitting, onClose, onSubmit }: Props) => {
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<SupportTicketCategory>('TECHNICAL')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setSubject('')
      setCategory('TECHNICAL')
      setBody('')
      setFiles([])
      setError(null)
    }
  }, [open])

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || [])

    event.target.value = ''

    const invalid = picked.map(file => validateSupportFile(file)).find(Boolean)

    if (invalid) {
      setError(invalid)

      return
    }

    setError(null)
    setFiles(prev => [...prev, ...picked].slice(0, SUPPORT_MAX_ATTACHMENTS))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (subject.trim().length < 3) {
      setError('Escribe un asunto de al menos 3 caracteres.')

      return
    }

    if (!body.trim() && !files.length) {
      setError('Cuéntanos qué pasó o adjunta una captura.')

      return
    }

    setError(null)

    const ok = await onSubmit({ subject: subject.trim(), category, body: body.trim() || undefined }, files)

    if (ok) onClose()
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth='sm'>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>Nueva consulta a soporte DLS</DialogTitle>
        <DialogContent className='flex flex-col gap-4'>
          {status?.mode === 'OFFLINE' ? (
            <Alert severity='info' icon={<i className='ri-time-line' />}>
              Estamos fuera de horario. Tu consulta queda registrada como ticket y te responderemos
              {status.nextOpeningLabel ? ` ${status.nextOpeningLabel}` : ' en cuanto volvamos'}.
            </Alert>
          ) : status?.mode === 'AWAY' ? (
            <Alert severity='warning' icon={<i className='ri-user-voice-line' />}>
              {status.message}
            </Alert>
          ) : status?.mode === 'ONLINE' ? (
            <Alert severity='success' icon={<i className='ri-chat-smile-2-line' />}>
              {status.message}
            </Alert>
          ) : null}

          <TextField
            label='Asunto'
            placeholder='Ej. No puedo registrar el check-in (ingreso) de la habitación 201'
            value={subject}
            onChange={event => setSubject(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 150 } }}
            autoFocus
            fullWidth
            required
          />
          <TextField
            select
            label='Tema'
            value={category}
            onChange={event => setCategory(event.target.value as SupportTicketCategory)}
            fullWidth
          >
            {SUPPORT_CATEGORIES.map(item => (
              <MenuItem key={item} value={item}>
                {SUPPORT_CATEGORY_LABELS[item]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label='Mensaje'
            placeholder='Describe el problema: qué intentabas hacer, qué mensaje apareció…'
            value={body}
            onChange={event => setBody(event.target.value)}
            slotProps={{ htmlInput: { maxLength: SUPPORT_MAX_MESSAGE } }}
            multiline
            minRows={4}
            maxRows={10}
            fullWidth
          />
          <div className='flex flex-col gap-2'>
            <div>
              <Button
                variant='outlined'
                color='secondary'
                size='small'
                startIcon={<i className='ri-attachment-2' />}
                disabled={files.length >= SUPPORT_MAX_ATTACHMENTS || submitting}
                onClick={() => fileInputRef.current?.click()}
              >
                Adjuntar captura o PDF
              </Button>
              <input
                ref={fileInputRef}
                hidden
                type='file'
                multiple
                accept={SUPPORT_FILE_ACCEPT}
                onChange={handleFiles}
              />
            </div>
            <PendingFiles files={files} onRemove={index => setFiles(prev => prev.filter((_, i) => i !== index))} />
          </div>
          {error ? (
            <Alert severity='error' className='whitespace-pre-line'>
              {error}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' color='secondary' onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            type='submit'
            disabled={submitting}
            endIcon={<i className={submitting ? 'ri-loader-4-line animate-spin' : 'ri-send-plane-line'} />}
          >
            {submitting ? 'Enviando…' : 'Enviar consulta'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default NewTicketDialog
