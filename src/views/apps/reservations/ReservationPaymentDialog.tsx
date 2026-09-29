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

import { formatRoomPrice } from '@/types/apps/roomsTypes'
import type { PaymentMethod } from '@/types/apps/reservationsTypes'
import { PAYMENT_LABELS, PAYMENT_METHODS } from '@/types/apps/reservationsTypes'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'

type Props = {
  open: boolean
  propertyId: number
  reservationUuid: string | null
  balance?: number
  onClose: () => void
  onSuccess: () => void
}

const ReservationPaymentDialog = ({ open, propertyId, reservationUuid, balance = 0, onClose, onSuccess }: Props) => {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setAmount(balance > 0 ? String(balance) : '')
    setMethod('CASH')
    setReference('')
    setNotes('')
  }, [balance, open])

  const handleSubmit = async () => {
    if (!reservationUuid) {
      return
    }

    const parsed = Number(amount)

    if (!Number.isFinite(parsed) || parsed === 0) {
      toast.error('El monto no puede ser 0.')

      return
    }

    setSaving(true)

    try {
      await reservationsApi.addPayment(propertyId, reservationUuid, {
        amount: parsed,
        method,
        reference: reference.trim() || null,
        notes: notes.trim() || null
      })
      toast.success(parsed < 0 ? 'Devolución registrada.' : 'Pago registrado.')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo registrar el pago.'))
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
          helperText={`Saldo actual: ${formatRoomPrice(balance)}. Un monto negativo es una devolución.`}
        />
        <FormControl fullWidth>
          <InputLabel id='res-payment-method'>Método</InputLabel>
          <Select
            labelId='res-payment-method'
            label='Método'
            value={method}
            onChange={e => setMethod(e.target.value as PaymentMethod)}
          >
            {PAYMENT_METHODS.map(item => (
              <MenuItem key={item} value={item}>
                {PAYMENT_LABELS[item]}
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

export default ReservationPaymentDialog
