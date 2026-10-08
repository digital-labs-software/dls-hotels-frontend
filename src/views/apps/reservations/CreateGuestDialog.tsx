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
import { DOCUMENT_TYPE_LABELS, guestDocumentOptions } from '@/types/apps/clientsTypes'
import { guestsApi } from '@/libs/clientsApi'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'
import { isCompleteDocument, useDocumentLookup } from '@/hooks/useDocumentLookup'
import { useExistingRecord } from '@/hooks/useExistingRecord'
import { DocumentLookupAdornment, DocumentLookupHelper } from '@/components/document-lookup/DocumentLookupHelper'
import ExistingRecordAlert from '@/components/document-lookup/ExistingRecordAlert'

type Props = {
  open: boolean
  propertyId: number
  onClose: () => void

  /** Recibe el huésped creado o, si el documento ya existía, el huésped existente. */
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

  const dniLookup = useDocumentLookup('DNI', data => {
    if (data.firstName) setFirstName(data.firstName)
    if (data.lastName) setLastName(data.lastName)
  })

  const existingGuest = useExistingRecord((query: { type: DocumentType; number: string }) =>
    guestsApi.findByDocument(propertyId, query.type, query.number)
  )

  const { reset: resetLookup } = dniLookup
  const { clear: clearExisting } = existingGuest

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
    resetLookup()
    clearExisting()
  }, [open, resetLookup, clearExisting])

  const isDni = documentType === 'DNI'
  const existing = existingGuest.record

  /** Primero busca el documento entre los huéspedes del hotel; solo si no existe consulta RENIEC. */
  const checkDocument = async (type: DocumentType | '', raw: string) => {
    const number = raw.trim()
    const complete = type === 'DNI' ? isCompleteDocument('DNI', number) : Boolean(number)

    if (!type || !complete) {
      existingGuest.clear()

      if (type === 'DNI') dniLookup.lookup(number)
      else dniLookup.reset()

      return
    }

    const found = await existingGuest.check({ type, number })

    if (found === undefined) return

    if (found) dniLookup.reset()
    else if (type === 'DNI') dniLookup.lookup(number)
  }

  const selectExisting = () => {
    if (!existing) return

    onCreated(existing)
    onClose()
  }

  const handleSubmit = async () => {
    if (existing) {
      selectExisting()

      return
    }

    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Nombres y apellidos son obligatorios.')

      return
    }

    const number = documentNumber.trim()

    if (number && !documentType) {
      toast.error('Selecciona el tipo de documento.')

      return
    }

    setSaving(true)

    try {
      const guest = await reservationsApi.createGuest(propertyId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        documentType: number ? documentType || null : null,
        documentNumber: number || null,
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

  const documentHelper = () => {
    if (existingGuest.checking) return 'Verificando si ya está registrado…'
    if (existing) return undefined

    if (isDni) {
      return dniLookup.status === 'idle' ? 'Con 8 dígitos se cargan los datos de RENIEC.' : <DocumentLookupHelper lookup={dniLookup} />
    }

    return undefined
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='sm'>
      <DialogTitle>Nuevo huésped</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-4'>
        <div className='flex gap-4 max-sm:flex-col'>
          <FormControl sx={{ width: { xs: '100%', sm: '38%' }, flexShrink: 0 }}>
            <InputLabel id='guest-doc-type'>Documento</InputLabel>
            <Select
              labelId='guest-doc-type'
              label='Documento'
              value={documentType}
              onChange={e => {
                const nextType = e.target.value as DocumentType | ''
                const nextNumber = nextType === 'DNI' ? documentNumber.replace(/\D/g, '').slice(0, 8) : documentNumber

                setDocumentType(nextType)
                setDocumentNumber(nextNumber)
                void checkDocument(nextType, nextNumber)
              }}
            >
              <MenuItem value=''>Sin documento</MenuItem>
              {guestDocumentOptions(documentType).map(type => (
                <MenuItem key={type} value={type}>
                  {DOCUMENT_TYPE_LABELS[type]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            autoFocus
            label='N.º documento'
            placeholder={isDni ? '45678912' : undefined}
            value={documentNumber}
            onChange={e => {
              const value = isDni ? e.target.value.replace(/\D/g, '').slice(0, 8) : e.target.value

              setDocumentNumber(value)

              if (isDni) void checkDocument('DNI', value)
              else existingGuest.clear()
            }}
            onBlur={() => {
              if (!isDni) void checkDocument(documentType, documentNumber)
            }}
            helperText={documentHelper()}
            slotProps={{
              htmlInput: isDni ? { inputMode: 'numeric' } : undefined,
              input: isDni
                ? {
                    endAdornment: (
                      <DocumentLookupAdornment
                        lookup={dniLookup}
                        canSearch={isCompleteDocument('DNI', documentNumber) && !existing}
                        onSearch={() => dniLookup.lookup(documentNumber, { force: true })}
                      />
                    )
                  }
                : undefined
            }}
          />
        </div>
        {existing ? (
          <ExistingRecordAlert
            title='Este documento ya está registrado'
            name={`${existing.person.firstName} ${existing.person.lastName}`}
            details={[existing.person.phone && `Tel. ${existing.person.phone}`, existing.person.email]}
            actionLabel='Usar este huésped'
            onAction={selectExisting}
          />
        ) : (
          <>
            <TextField label='Nombres' value={firstName} onChange={e => setFirstName(e.target.value)} />
            <TextField label='Apellidos' value={lastName} onChange={e => setLastName(e.target.value)} />
            <div className='flex gap-4 max-sm:flex-col'>
              <TextField fullWidth label='Teléfono' value={phone} onChange={e => setPhone(e.target.value)} />
              <TextField fullWidth label='Correo' value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant='contained' disabled={saving || existingGuest.checking} onClick={handleSubmit}>
          {saving ? <CircularProgress size={20} color='inherit' /> : existing ? 'Usar este huésped' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreateGuestDialog
