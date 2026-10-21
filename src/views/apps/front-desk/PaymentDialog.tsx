'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
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
import { CASH_REQUIRED_MESSAGE, useCashSessionOpen } from '@/hooks/useCashSessionOpen'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'
import { reservationsApi } from '@/libs/reservationsApi'
import type { ReservationFolios } from '@/types/apps/reservationsTypes'

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
  const cashOpen = useCashSessionOpen(propertyId, open)
  const code = stay?.reservationCode ?? reservationCode
  const currentBalance = stay?.reservationBalance ?? balance ?? 0
  const [kind, setKind] = useState<Kind>('charge')
  const [target, setTarget] = useState('all')
  const [folios, setFolios] = useState<ReservationFolios | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('YAPE')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setKind(currentBalance >= 0 ? 'charge' : 'refund')
    setTarget('all')
    setFolios(null)
    setMethod('YAPE')
    setReference('')
    setNotes('')
  }, [currentBalance, open])

  useEffect(() => {
    if (!open || !uuid) return

    let cancelled = false

    reservationsApi
      .roomFolios(propertyId, uuid)
      .then(result => {
        if (!cancelled) setFolios(result)
      })
      .catch(() => {
        if (!cancelled) setFolios(null)
      })

    return () => {
      cancelled = true
    }
  }, [open, propertyId, uuid])

  useEffect(() => {
    if (!open) return

    const room = folios?.rooms.find(item => item.uuid === target)
    const several = (folios?.rooms.length ?? 0) > 1
    const whole = !several || target === 'all'
    const next =
      kind === 'refund'
        ? whole
          ? (folios?.unassignedPaid ?? 0)
          : (room?.paid ?? 0)
        : whole
          ? (folios?.totalDue ?? Math.max(currentBalance, 0))
          : (room?.balance ?? 0)

    setAmount(next > 0 ? String(next) : '')
  }, [currentBalance, folios, kind, open, target])

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

    if (cashOpen === false) {
      toast.error(CASH_REQUIRED_MESSAGE)

      return
    }

    setSaving(true)

    try {
      await frontDeskApi.pay(propertyId, uuid, {
        amount: signed,
        method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        reservationRoomUuid: (folios?.rooms.length ?? 0) > 1 && target !== 'all' ? target : null
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
        {cashOpen === false ? <Alert severity='warning'>{CASH_REQUIRED_MESSAGE}</Alert> : null}
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
        {(folios?.rooms.length ?? 0) > 1 ? (
          <FormControl fullWidth>
            <InputLabel id='payment-target'>{kind === 'refund' ? 'Qué se devuelve' : 'Qué se cobra'}</InputLabel>
            <Select
              labelId='payment-target'
              label={kind === 'refund' ? 'Qué se devuelve' : 'Qué se cobra'}
              value={target}
              onChange={event => setTarget(event.target.value)}
            >
              <MenuItem value='all'>Toda la reserva</MenuItem>
              {folios?.rooms.map(room => (
                <MenuItem key={room.uuid} value={room.uuid}>
                  {`Hab. ${room.roomNumber || 's/n'}${room.holderName ? ` · ${room.holderName}` : ''} · S/ ${(kind === 'refund' ? room.paid : room.balance).toFixed(2)}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
        <TextField
          label='Monto'
          value={amount}
          onChange={e => setAmount(e.target.value)}
          helperText='Los pagos no se editan ni se borran. Para corregir, registra una devolución.'
        />
        <FormControl fullWidth>
          <InputLabel id='payment-method'>Método de pago</InputLabel>
          <Select
            labelId='payment-method'
            label='Método de pago'
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
        <Button variant='contained' disabled={saving || !uuid || cashOpen === false} onClick={handleSubmit}>
          {saving ? <CircularProgress size={20} color='inherit' /> : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PaymentDialog
