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

import type { Company, CompanyType } from '@/types/apps/clientsTypes'
import { COMPANY_TYPE_LABELS, COMPANY_TYPES } from '@/types/apps/clientsTypes'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'

type Props = {
  open: boolean
  propertyId: number
  onClose: () => void
  onCreated: (company: Company) => void
}

const CreateCompanyDialog = ({ open, propertyId, onClose, onCreated }: Props) => {
  const [businessName, setBusinessName] = useState('')
  const [companyType, setCompanyType] = useState<CompanyType>('CORPORATE')
  const [taxNumber, setTaxNumber] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setBusinessName('')
    setCompanyType('CORPORATE')
    setTaxNumber('')
    setTradeName('')
    setPhone('')
    setEmail('')
  }, [open])

  const handleSubmit = async () => {
    if (!businessName.trim()) {
      toast.error('La razón social es obligatoria.')

      return
    }

    setSaving(true)

    try {
      const company = await reservationsApi.createCompany(propertyId, {
        businessName: businessName.trim(),
        companyType,
        taxNumber: taxNumber.trim() || null,
        tradeName: tradeName.trim() || null,
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

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='xs'>
      <DialogTitle>Nueva empresa</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-4'>
        <TextField label='Razón social' value={businessName} onChange={e => setBusinessName(e.target.value)} />
        <FormControl fullWidth>
          <InputLabel id='company-type'>Tipo</InputLabel>
          <Select
            labelId='company-type'
            label='Tipo'
            value={companyType}
            onChange={e => setCompanyType(e.target.value as CompanyType)}
          >
            {COMPANY_TYPES.map(type => (
              <MenuItem key={type} value={type}>
                {COMPANY_TYPE_LABELS[type]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label='RUC' value={taxNumber} onChange={e => setTaxNumber(e.target.value)} />
        <TextField label='Nombre comercial' value={tradeName} onChange={e => setTradeName(e.target.value)} />
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

export default CreateCompanyDialog
