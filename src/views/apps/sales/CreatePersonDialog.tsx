'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'

import { toast } from 'react-toastify'

import { DocumentLookupAdornment, DocumentLookupHelper } from '@/components/document-lookup/DocumentLookupHelper'
import ExistingRecordAlert from '@/components/document-lookup/ExistingRecordAlert'
import { isCompleteDocument, useDocumentLookup } from '@/hooks/useDocumentLookup'
import { useExistingRecord } from '@/hooks/useExistingRecord'
import { personsApi, type SalePerson } from '@/libs/personsApi'
import { getSalesApiErrorMessage } from '@/libs/salesApi'
import { toPersonName } from '@/utils/string'

type Props = {
  open: boolean
  propertyId: number
  initialQuery?: string
  onClose: () => void
  onCreated: (person: SalePerson) => void
}

const CreatePersonDialog = ({ open, propertyId, initialQuery = '', onClose, onCreated }: Props) => {
  const [documentNumber, setDocumentNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saving, setSaving] = useState(false)

  const dniLookup = useDocumentLookup('DNI', data => {
    if (data.firstName) setFirstName(data.firstName)
    if (data.lastName) setLastName(data.lastName)
  })

  const existingPerson = useExistingRecord((number: string) => personsApi.findByDni(propertyId, number))
  const { reset: resetLookup, lookup: lookupDni } = dniLookup
  const { clear: clearExisting, check: checkExisting } = existingPerson

  useEffect(() => {
    if (!open) return

    const query = initialQuery.trim()
    const isDni = /^\d{8}$/.test(query)

    setDocumentNumber(isDni ? query : '')
    setFirstName('')
    setLastName('')
    resetLookup()
    clearExisting()

    if (isDni) {
      void (async () => {
        const found = await checkExisting(query)

        if (found === undefined) return
        if (found) resetLookup()
        else void lookupDni(query)
      })()
    }
  }, [open, initialQuery, resetLookup, clearExisting, checkExisting, lookupDni])

  const existing = existingPerson.record

  const checkDocument = async (raw: string) => {
    const number = raw.trim()

    if (!isCompleteDocument('DNI', number)) {
      existingPerson.clear()
      dniLookup.lookup(number)

      return
    }

    const found = await existingPerson.check(number)

    if (found === undefined) return
    if (found) dniLookup.reset()
    else dniLookup.lookup(number)
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

    const number = documentNumber.trim()
    const names = toPersonName(firstName)
    const surnames = toPersonName(lastName)

    setFirstName(names)
    setLastName(surnames)

    if (!isCompleteDocument('DNI', number)) {
      toast.error('El DNI tiene 8 dígitos.')

      return
    }

    if (!names || !surnames) {
      toast.error('Nombres y apellidos son obligatorios.')

      return
    }

    setSaving(true)

    try {
      const person = await personsApi.create(propertyId, { documentNumber: number, firstName: names, lastName: surnames })

      toast.success('Persona registrada.')
      onCreated(person)
      onClose()
    } catch (error) {
      toast.error(getSalesApiErrorMessage(error, 'No se pudo registrar la persona.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='sm'>
      <DialogTitle>Registrar persona</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-4'>
        {existing ? (
          <ExistingRecordAlert
            title='Este DNI ya está en el hotel'
            name={`${existing.firstName} ${existing.lastName}`}
            details={[`DNI ${existing.documentNumber}`]}
            actionLabel='Usar esta persona'
            onAction={selectExisting}
          />
        ) : null}
        <TextField
          autoFocus
          label='DNI'
          placeholder='12345678'
          value={documentNumber}
          onChange={event => {
            const value = event.target.value.replace(/\D/g, '').slice(0, 8)

            setDocumentNumber(value)
            void checkDocument(value)
          }}
          helperText={
            existingPerson.checking ? (
              'Verificando si ya está registrada…'
            ) : existing || dniLookup.status === 'idle' ? undefined : (
              <DocumentLookupHelper lookup={dniLookup} />
            )
          }
          slotProps={{
            htmlInput: { inputMode: 'numeric' },
            input: {
              endAdornment: (
                <DocumentLookupAdornment
                  lookup={dniLookup}
                  canSearch={isCompleteDocument('DNI', documentNumber) && !existing}
                  onSearch={() => dniLookup.lookup(documentNumber, { force: true })}
                />
              )
            }
          }}
        />
        <TextField label='Nombres' value={firstName} onChange={event => setFirstName(event.target.value)} onBlur={() => setFirstName(toPersonName(firstName))} disabled={Boolean(existing)} />
        <TextField label='Apellidos' value={lastName} onChange={event => setLastName(event.target.value)} onBlur={() => setLastName(toPersonName(lastName))} disabled={Boolean(existing)} />
      </DialogContent>
      <DialogActions>
        <Button color='secondary' onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? <CircularProgress size={20} color='inherit' /> : existing ? 'Usar esta persona' : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreatePersonDialog
