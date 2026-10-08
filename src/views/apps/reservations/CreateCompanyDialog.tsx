'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'

import { toast } from 'react-toastify'

import type { Company, CompanyType } from '@/types/apps/clientsTypes'
import { COMPANY_TYPE_LABELS, COMPANY_TYPES } from '@/types/apps/clientsTypes'
import { companiesApi } from '@/libs/clientsApi'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'
import { isCompleteDocument, useDocumentLookup } from '@/hooks/useDocumentLookup'
import { useExistingRecord } from '@/hooks/useExistingRecord'
import { DocumentLookupAdornment, DocumentLookupHelper } from '@/components/document-lookup/DocumentLookupHelper'
import ExistingRecordAlert from '@/components/document-lookup/ExistingRecordAlert'

type Props = {
  open: boolean
  propertyId: number
  onClose: () => void

  /** Recibe la empresa creada o, si el RUC ya existía, la empresa existente. */
  onCreated: (company: Company) => void
}

const CreateCompanyDialog = ({ open, propertyId, onClose, onCreated }: Props) => {
  const [businessName, setBusinessName] = useState('')
  const [companyType, setCompanyType] = useState<CompanyType | ''>('')
  const [typeError, setTypeError] = useState(false)
  const [taxNumber, setTaxNumber] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  const rucLookup = useDocumentLookup('RUC', data => {
    if (data.businessName) setBusinessName(data.businessName)
    if (data.tradeName) setTradeName(data.tradeName)
    if (data.fullAddress || data.address) setAddress(data.fullAddress ?? data.address ?? '')
  })

  const existingCompany = useExistingRecord((number: string) => companiesApi.findByTaxNumber(propertyId, number))

  const { reset: resetLookup } = rucLookup
  const { clear: clearExisting } = existingCompany

  useEffect(() => {
    if (!open) {
      return
    }

    setBusinessName('')
    setCompanyType('')
    setTypeError(false)
    setTaxNumber('')
    setTradeName('')
    setAddress('')
    setPhone('')
    setEmail('')
    resetLookup()
    clearExisting()
  }, [open, resetLookup, clearExisting])

  const existing = existingCompany.record

  /** Primero busca el RUC entre las empresas del hotel; solo si no existe consulta SUNAT. */
  const checkTaxNumber = async (raw: string) => {
    const number = raw.trim()
    const found = await existingCompany.check(number)

    if (found === undefined) return

    if (found) rucLookup.reset()
    else rucLookup.lookup(number)
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

    if (!businessName.trim()) {
      toast.error('La razón social es obligatoria.')

      return
    }

    if (!companyType) {
      setTypeError(true)
      toast.error('Selecciona el tipo.')

      return
    }

    setSaving(true)

    try {
      const company = await reservationsApi.createCompany(propertyId, {
        businessName: businessName.trim(),
        companyType,
        taxNumber: taxNumber.trim() || null,
        tradeName: tradeName.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null
      })

      toast.success('Empresa creada.')
      onCreated(company)
      onClose()
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo crear la empresa. Si el RUC ya existe, búscalo.'))
    } finally {
      setSaving(false)
    }
  }

  const taxNumberHelper = () => {
    if (existingCompany.checking) return 'Verificando si ya está registrada…'
    if (existing) return undefined

    return rucLookup.status === 'idle' ? (
      'Con 11 dígitos se cargan los datos de SUNAT.'
    ) : (
      <DocumentLookupHelper lookup={rucLookup} />
    )
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='sm'>
      <DialogTitle>Nueva empresa</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-4'>
        <TextField
          autoFocus
          label='RUC'
          placeholder='20123456789'
          value={taxNumber}
          onChange={e => {
            const value = e.target.value

            setTaxNumber(value)

            if (isCompleteDocument('RUC', value)) {
              void checkTaxNumber(value)
            } else {
              existingCompany.clear()
              rucLookup.lookup(value)
            }
          }}
          onBlur={() => {
            const number = taxNumber.trim()

            if (number && !isCompleteDocument('RUC', number)) void existingCompany.check(number)
          }}
          helperText={taxNumberHelper()}
          slotProps={{
            htmlInput: { inputMode: 'numeric' },
            input: {
              endAdornment: (
                <DocumentLookupAdornment
                  lookup={rucLookup}
                  canSearch={isCompleteDocument('RUC', taxNumber) && !existing}
                  onSearch={() => rucLookup.lookup(taxNumber, { force: true })}
                />
              )
            }
          }}
        />
        {existing ? (
          <ExistingRecordAlert
            title='Este RUC ya está registrado'
            name={existing.businessName}
            details={[existing.tradeName, existing.phone && `Tel. ${existing.phone}`, existing.email]}
            actionLabel='Usar esta empresa'
            onAction={selectExisting}
          />
        ) : (
          <>
            <TextField label='Razón social' value={businessName} onChange={e => setBusinessName(e.target.value)} />
            <div className='flex gap-4 max-sm:flex-col'>
              <TextField
                fullWidth
                label='Nombre comercial'
                value={tradeName}
                onChange={e => setTradeName(e.target.value)}
              />
              <FormControl sx={{ width: { xs: '100%', sm: '40%' }, flexShrink: 0 }} error={typeError}>
                <InputLabel id='company-type'>Tipo</InputLabel>
                <Select
                  labelId='company-type'
                  label='Tipo'
                  value={companyType}
                  onChange={e => {
                    setCompanyType(e.target.value as CompanyType)
                    setTypeError(false)
                  }}
                >
                  <MenuItem value='' disabled>
                    Selecciona el tipo
                  </MenuItem>
                  {COMPANY_TYPES.map(type => (
                    <MenuItem key={type} value={type}>
                      {COMPANY_TYPE_LABELS[type]}
                    </MenuItem>
                  ))}
                </Select>
                {typeError ? <FormHelperText>Selecciona el tipo.</FormHelperText> : null}
              </FormControl>
            </div>
            <TextField label='Dirección fiscal' value={address} onChange={e => setAddress(e.target.value)} />
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
        <Button variant='contained' disabled={saving || existingCompany.checking} onClick={handleSubmit}>
          {saving ? <CircularProgress size={20} color='inherit' /> : existing ? 'Usar esta empresa' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreateCompanyDialog
