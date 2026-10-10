'use client'

import { useEffect, useRef, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

import { toast } from 'react-toastify'

import DateField from '@/components/date-picker/DateField'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'

type SpeechResult = { isFinal: boolean; 0: { transcript: string } }

type SpeechRec = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

const speechCtor = () => {
  if (typeof window === 'undefined') return null

  const host = window as unknown as {
    SpeechRecognition?: new () => SpeechRec
    webkitSpeechRecognition?: new () => SpeechRec
  }

  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

type Props = {
  open: boolean
  propertyId: number
  initialDate: string
  onClose: () => void
  onSaved: () => void
}

const QuickNoteDialog = ({ open, propertyId, initialDate, onClose, onSaved }: Props) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [stayDate, setStayDate] = useState(initialDate)
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [saving, setSaving] = useState(false)
  const recRef = useRef<SpeechRec | null>(null)
  const baseRef = useRef('')
  const canDictate = speechCtor() !== null

  useEffect(() => {
    if (!open) return

    setStayDate(initialDate)
    setText('')
    setListening(false)
  }, [initialDate, open])

  useEffect(() => {
    return () => recRef.current?.stop()
  }, [])

  const stopListening = () => {
    recRef.current?.stop()
    recRef.current = null
    setListening(false)
  }

  const startListening = () => {
    const Ctor = speechCtor()

    if (!Ctor) {
      toast.error('Este navegador no dicta. Escribe la nota, o ábrela en Chrome del celular.')

      return
    }

    const rec = new Ctor()

    rec.lang = 'es-PE'
    rec.continuous = true
    rec.interimResults = true
    baseRef.current = text.trim()

    rec.onresult = event => {
      let spoken = ''

      for (let index = 0; index < event.results.length; index += 1) {
        spoken += event.results[index][0]?.transcript ?? ''
      }

      setText([baseRef.current, spoken.trim()].filter(Boolean).join(' ').slice(0, 500))
    }

    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recRef.current = rec

    try {
      rec.start()
      setListening(true)
    } catch {
      toast.error('No se pudo usar el micrófono. Revisa el permiso del navegador.')
    }
  }

  const save = async () => {
    const note = text.trim()

    if (!stayDate) {
      toast.error('Elige el día.')

      return
    }

    if (!note) {
      toast.error('Escribe o dicta la nota.')

      return
    }

    setSaving(true)
    stopListening()

    try {
      await reservationsApi.createNote(propertyId, { stayDate, text: note })
      toast.success('Nota guardada. Luego la completas como reserva.')
      onSaved()
      onClose()
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo guardar la nota.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='sm' fullScreen={isMobile}>
      <DialogTitle>Anotar</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-2'>
        <Typography variant='body2' color='text.secondary'>
          Nota urgente de una reserva. Anota el día y lo que haya que recordar. La habitación y los nombres se completan después.
        </Typography>
        <DateField fullWidth label='Día' value={stayDate} onChange={value => value && setStayDate(value)} />
        <TextField
          label='Nota'
          placeholder='2 dobles y 1 triple, llegan el viernes'
          value={text}
          multiline
          minRows={3}
          autoFocus
          slotProps={{
            htmlInput: { maxLength: 500 },
            input: {
              endAdornment: canDictate ? (
                <InputAdornment position='end'>
                  <IconButton
                    color={listening ? 'error' : 'primary'}
                    aria-label={listening ? 'Dejar de dictar' : 'Dictar la nota'}
                    onClick={() => (listening ? stopListening() : startListening())}
                  >
                    <i className={listening ? 'ri-stop-circle-line' : 'ri-mic-line'} />
                  </IconButton>
                </InputAdornment>
              ) : undefined
            }
          }}
          helperText={
            listening
              ? 'Escuchando… habla y pulsa el micrófono otra vez para terminar.'
              : canDictate
                ? 'Puedes escribir o pulsar el micrófono y dictar. En el celular funciona con Chrome.'
                : 'En este navegador se escribe. Para dictar, ábrelo en Chrome del celular.'
          }
          onChange={event => setText(event.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button color='secondary' disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant='contained' disabled={saving} onClick={save}>
          Guardar nota
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default QuickNoteDialog
