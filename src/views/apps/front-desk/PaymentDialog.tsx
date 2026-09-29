'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'

import { toast } from 'react-toastify'

import type { PaymentMethod, Stay } from '@/types/apps/frontDeskTypes'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'

type Props = {
  open: boolean
  propertyId: number
  stay: Stay | null
  onClose: () => void
  onSuccess: () => void
}

const PaymentDialog = ({ open, propertyId, stay, onClose, onSuccess }: Props) => {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setAmount(stay && stay.reservationBalance > 0 ? String(stay.reservationBalance) : '')
    setMethod('CASH')
    setReference('')
    setNotes('')
  }, [open, stay])

  const handleSubmit = async () => {
    if (!stay) {
      return
    }

    const parsed = Number(amount)

    if (!Number.isFinite(parsed) || parsed === 0) {
      toast.error('El monto no puede ser 0.')

      return
    }

    setSaving(true)

    try {
      await frontDeskApi.pay(propertyId, stay.reservationUuid, {
        amount: parsed,
        method,
        reference: reference.trim() || null,
        notes: notes.trim() || null
      })
      toast.success(parsed < 0 ? 'Devolución registrada.' : 'Pago registrado.')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo registrar el pago.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='xs'>
      <DialogTitle>Registrar pago</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-4'>
        <TextField
          label='Monto'
          value={amount}
          onChange={e => setAmount(e.target.value)}
          helperText={stay ? `Saldo actual: ${formatRoomPrice(stay.reservationBalance)}. Un monto negativo es una devolución.` : ''}
        />
        <FormControl fullWidth>
          <InputLabel id='payment-method'>Método</InputLabel>
          <Select labelId='payment-method' label='Método' value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map(item => (
              <MenuItem key={item} value={item}>
                {PAYMENT_METHOD_LABELS[item]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label='N.º operación' value={reference} onChange={e => setReference(e.target.value)} />
        <TextField label='Notas' value={notes} onChange={e => setNotes(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant='contained' disabled={saving} onClick={handleSubmit}>
          {saving ? <CircularProgress size={20} color='inherit' /> : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PaymentDialog
