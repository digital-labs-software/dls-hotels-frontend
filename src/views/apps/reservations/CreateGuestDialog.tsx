'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'

import { toast } from 'react-toastify'

import type { DocumentType, Guest } from '@/types/apps/clientsTypes'
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from '@/types/apps/clientsTypes'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'

type Props = {
  open: boolean
  propertyId: number
  onClose: () => void
  onCreated: (guest: Guest) => void
}

const CreateGuestDialog = ({ open, propertyId, onClose, onCreated }: Props) => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [documentType, setDocumentType] = useState<DocumentType | ''>('DNI')
  const [documentNumber, setDocumentNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setFirstName('')
    setLastName('')
    setDocumentType('DNI')
    setDocumentNumber('')
    setPhone('')
    setEmail('')
  }, [open])

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Nombres y apellidos son obligatorios.')

      return
    }

    if (Boolean(documentType) !== Boolean(documentNumber.trim())) {
      toast.error('El tipo y el número de documento van juntos.')

      return
    }

    setSaving(true)

    try {
      const guest = await reservationsApi.createGuest(propertyId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        documentType: documentType || null,
        documentNumber: documentNumber.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null
      })

      toast.success('Huésped creado.')
      onCreated(guest)
      onClose()
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo crear el huésped. Si el documento ya existe, búscalo.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='xs'>
      <DialogTitle>Nuevo huésped</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-4'>
        <TextField label='Nombres' value={firstName} onChange={e => setFirstName(e.target.value)} />
        <TextField label='Apellidos' value={lastName} onChange={e => setLastName(e.target.value)} />
        <FormControl fullWidth>
          <InputLabel id='guest-doc-type'>Documento</InputLabel>
          <Select
            labelId='guest-doc-type'
            label='Documento'
            value={documentType}
            onChange={e => setDocumentType(e.target.value as DocumentType | '')}
          >
            <MenuItem value=''>Sin documento</MenuItem>
            {DOCUMENT_TYPES.map(type => (
              <MenuItem key={type} value={type}>
                {DOCUMENT_TYPE_LABELS[type]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label='N.º documento' value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} />
        <TextField label='Teléfono' value={phone} onChange={e => setPhone(e.target.value)} />
        <TextField label='Correo' value={email} onChange={e => setEmail(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant='contained' disabled={saving} onClick={handleSubmit}>
          {saving ? <CircularProgress size={20} color='inherit' /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreateGuestDialog
