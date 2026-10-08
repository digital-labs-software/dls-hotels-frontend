'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import type { Stay } from '@/types/apps/frontDeskTypes'
import { formatFrontDeskDate } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import BalanceChip from './BalanceChip'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'

type Props = {
  open: boolean
  propertyId: number
  stay: Stay | null
  onClose: () => void
  onSuccess: () => void
  onPay: (stay: Stay) => void
}

const CheckOutDialog = ({ open, propertyId, stay, onClose, onSuccess, onPay }: Props) => {
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    if (!stay) {
      return
    }

    setSaving(true)

    try {
      await frontDeskApi.checkOut(propertyId, stay.reservationUuid, stay.reservationRoomUuid)
      toast.success(`Check-out (salida) registrado · ${stay.reservationCode}`)
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo registrar la salida (check-out).'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='xs'>
      <DialogTitle>Check-out (salida)</DialogTitle>
      <DialogContent className='flex flex-col gap-3 pt-3'>
        {stay ? (
          <>
            <Typography>
              {stay.guestName || stay.reservationCode} · {stay.roomNumber || 'Sin habitación'}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {formatFrontDeskDate(stay.checkInDate)} – {formatFrontDeskDate(stay.checkOutDate)} · {stay.nights} noche
              {stay.nights === 1 ? '' : 's'} · {formatRoomPrice(stay.pricePerNight)} / noche
            </Typography>
            <div className='flex flex-wrap items-center gap-2'>
              <Typography variant='body2'>Saldo:</Typography>
              <BalanceChip balance={stay.reservationBalance} />
            </div>
            {stay.reservationBalance > 0 ? (
              <Alert
                severity='warning'
                action={
                  <Button color='inherit' size='small' onClick={() => onPay(stay)}>
                    Registrar pago
                  </Button>
                }
              >
                Saldo pendiente {formatRoomPrice(stay.reservationBalance)}. El check-out (salida) no está bloqueado.
              </Alert>
            ) : null}
            <Typography variant='body2' color='text.secondary'>
              Al confirmar, la habitación pasa a limpieza.
            </Typography>
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant='contained' color='warning' disabled={saving || !stay} onClick={handleConfirm}>
          {saving ? <CircularProgress size={20} color='inherit' /> : 'Confirmar check-out (salida)'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CheckOutDialog
