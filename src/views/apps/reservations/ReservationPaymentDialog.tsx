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

import { formatRoomPrice } from '@/types/apps/roomsTypes'
import type { PaymentMethod, ReservationFolios } from '@/types/apps/reservationsTypes'
import { PAYMENT_LABELS, PAYMENT_METHODS } from '@/types/apps/reservationsTypes'
import { CASH_REQUIRED_MESSAGE, useCashSessionOpen } from '@/hooks/useCashSessionOpen'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'

type Kind = 'charge' | 'refund'

type Props = {
  open: boolean
  propertyId: number
  reservationUuid: string | null
  balance?: number
  paidAmount?: number
  cancelled?: boolean
  onClose: () => void
  onSuccess: () => void
}

const ReservationPaymentDialog = ({
  open,
  propertyId,
  reservationUuid,
  balance = 0,
  paidAmount = 0,
  cancelled = false,
  onClose,
  onSuccess
}: Props) => {
  const cashOpen = useCashSessionOpen(propertyId, open)
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

    const nextKind: Kind = cancelled || balance < 0 ? 'refund' : 'charge'

    setKind(nextKind)
    setTarget('all')
    setFolios(null)
    setMethod('YAPE')
    setReference('')
    setNotes('')
  }, [balance, cancelled, open, paidAmount])

  useEffect(() => {
    if (!open || !reservationUuid) return

    let cancelledRequest = false

    reservationsApi
      .roomFolios(propertyId, reservationUuid)
      .then(result => {
        if (!cancelledRequest) setFolios(result)
      })
      .catch(() => {
        if (!cancelledRequest) setFolios(null)
      })

    return () => {
      cancelledRequest = true
    }
  }, [open, propertyId, reservationUuid])

  useEffect(() => {
    if (!open) return

    const room = folios?.rooms.find(item => item.uuid === target)
    const several = (folios?.rooms.length ?? 0) > 1
    const whole = !several || target === 'all'
    const next =
      kind === 'refund'
        ? whole
          ? (folios?.unassignedPaid ?? paidAmount)
          : (room?.paid ?? 0)
        : whole
          ? (folios?.totalDue ?? Math.max(balance, 0))
          : (room?.balance ?? 0)

    setAmount(next > 0 ? String(next) : '')
  }, [balance, folios, kind, open, paidAmount, target])

  const handleKind = (next: Kind) => {
    setKind(next)
  }

  const handleSubmit = async () => {
    if (!reservationUuid) {
      return
    }

    const parsed = Math.abs(Number(amount))

    if (!Number.isFinite(parsed) || parsed === 0) {
      toast.error('El monto no puede ser 0.')

      return
    }

    if (cashOpen === false) {
      toast.error(CASH_REQUIRED_MESSAGE)

      return
    }

    const signed = kind === 'refund' ? -parsed : parsed

    setSaving(true)

    try {
      await reservationsApi.addPayment(propertyId, reservationUuid, {
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
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo registrar el pago.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='xs'>
      <DialogTitle>{kind === 'refund' ? 'Registrar devolución' : 'Registrar pago'}</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-4'>
        {cashOpen === false ? <Alert severity='warning'>{CASH_REQUIRED_MESSAGE}</Alert> : null}
        <Typography variant='body2' color='text.secondary'>
          Pagado {formatRoomPrice(paidAmount)} · saldo {formatRoomPrice(balance)}
        </Typography>
        {cancelled ? null : (
          <ToggleButtonGroup
            exclusive
            fullWidth
            size='small'
            value={kind}
            onChange={(_, next) => {
              if (next) handleKind(next)
            }}
          >
            <ToggleButton value='charge'>Cobro</ToggleButton>
            <ToggleButton value='refund'>Devolución</ToggleButton>
          </ToggleButtonGroup>
        )}
        {(folios?.rooms.length ?? 0) > 1 ? (
          <FormControl fullWidth>
            <InputLabel id='res-payment-target'>{kind === 'refund' ? 'Qué se devuelve' : 'Qué se cobra'}</InputLabel>
            <Select
              labelId='res-payment-target'
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
          onChange={e => setAmount(e.target.value.replace('-', ''))}
          helperText={
            kind === 'refund'
              ? `Puede devolver hasta ${formatRoomPrice(paidAmount)}.`
              : `Saldo por cobrar: ${formatRoomPrice(Math.max(balance, 0))}.`
          }
        />
        <FormControl fullWidth>
          <InputLabel id='res-payment-method'>Método de pago</InputLabel>
          <Select
            labelId='res-payment-method'
            label='Método de pago'
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
        <Button variant='contained' disabled={saving || cashOpen === false} onClick={handleSubmit}>
          {saving ? <CircularProgress size={20} color='inherit' /> : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ReservationPaymentDialog
