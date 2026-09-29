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
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import type { PaymentMethod, Stay } from '@/types/apps/frontDeskTypes'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'

type Kind = 'charge' | 'refund'

type Props = {
  open: boolean
  propertyId: number
  stay?: Stay | null
  reservationUuid?: string | null
  reservationCode?: string
  balance?: number
  onClose: () => void
  onSuccess: () => void
}

const PaymentDialog = ({
  open,
  propertyId,
  stay,
  reservationUuid,
  reservationCode,
  balance,
  onClose,
  onSuccess
}: Props) => {
  const uuid = stay?.reservationUuid ?? reservationUuid
  const code = stay?.reservationCode ?? reservationCode
  const currentBalance = stay?.reservationBalance ?? balance ?? 0
  const [kind, setKind] = useState<Kind>('charge')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setKind(currentBalance >= 0 ? 'charge' : 'refund')
    setAmount(currentBalance !== 0 ? String(Math.abs(currentBalance)) : '')
    setMethod('CASH')
    setReference('')
    setNotes('')
  }, [currentBalance, open])

  const handleSubmit = async () => {
    if (!uuid) {
      return
    }

    const parsed = Math.abs(Number(amount))

    if (!Number.isFinite(parsed) || parsed === 0) {
      toast.error('El monto no puede ser 0.')

      return
    }

    const signed = kind === 'refund' ? -parsed : parsed

    setSaving(true)

    try {
      await frontDeskApi.pay(propertyId, uuid, {
        amount: signed,
        method,
        reference: reference.trim() || null,
        notes: notes.trim() || null
      })
      toast.success(kind === 'refund' ? 'Devolución registrada.' : 'Pago registrado.')
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
      <DialogTitle>{kind === 'refund' ? 'Registrar devolución' : 'Registrar pago'}</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-4'>
        {code ? (
          <Typography variant='body2' color='text.secondary'>
            Reserva {code} · saldo {formatRoomPrice(currentBalance)}
          </Typography>
        ) : null}
        <ToggleButtonGroup
          exclusive
          fullWidth
          size='small'
          value={kind}
          onChange={(_, next) => {
            if (next) {
              setKind(next)
            }
          }}
        >
          <ToggleButton value='charge'>Cobro</ToggleButton>
          <ToggleButton value='refund'>Devolución</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          label='Monto'
          value={amount}
          onChange={e => setAmount(e.target.value)}
          helperText='Los pagos no se editan ni se borran. Para corregir, registra una devolución.'
        />
        <FormControl fullWidth>
          <InputLabel id='payment-method'>Método</InputLabel>
          <Select
            labelId='payment-method'
            label='Método'
            value={method}
            onChange={e => setMethod(e.target.value as PaymentMethod)}
          >
            {PAYMENT_METHODS.map(item => (
              <MenuItem key={item} value={item}>
                {PAYMENT_METHOD_LABELS[item]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label='N.º operación' value={reference} onChange={e => setReference(e.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
        <TextField label='Notas' value={notes} onChange={e => setNotes(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant='contained' disabled={saving || !uuid} onClick={handleSubmit}>
          {saving ? <CircularProgress size={20} color='inherit' /> : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PaymentDialog
