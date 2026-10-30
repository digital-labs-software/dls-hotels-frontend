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
import { nightsBetween } from '@/types/apps/reservationsTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'

type Props = {
  open: boolean
  propertyId: number
  stay: Stay | null
  today: string
  onClose: () => void
  onSuccess: () => void
  onRefund: (amount: number, hint: string) => void
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

const creditAfter = (stay: Stay, removedAmount: number) =>
  roundMoney(Math.max(0, removedAmount - stay.reservationBalance))

export const EarlyDepartureDialog = ({ open, propertyId, stay, today, onClose, onSuccess, onRefund }: Props) => {
  const [saving, setSaving] = useState(false)
  const keptNights = stay && today ? nightsBetween(stay.checkInDate, today) : 0
  const removedNights = stay ? Math.max(0, stay.nights - keptNights) : 0
  const removedAmount = stay ? roundMoney(stay.pricePerNight * removedNights) : 0
  const credit = stay ? creditAfter(stay, removedAmount) : 0

  const handleConfirm = async () => {
    if (!stay) return

    setSaving(true)

    try {
      await frontDeskApi.earlyCheckOut(propertyId, stay.reservationUuid, stay.reservationRoomUuid)
      toast.success(`Check-out (ya se fue) · ${stay.reservationCode}`)
      onSuccess()
      onClose()

      if (credit > 0) {
        onRefund(credit, `Queda a favor ${formatRoomPrice(credit)} de las noches que no va a usar.`)
      }
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo registrar el check-out.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='xs'>
      <DialogTitle>Check-out (ya se fue)</DialogTitle>
      <DialogContent className='flex flex-col gap-3 pt-3'>
        {stay ? (
          <>
            <Typography>
              {stay.guestName || stay.reservationCode} · {stay.roomNumber || 'Sin habitación'}
            </Typography>
            <Typography variant='body2'>
              Durmió {keptNights} noche{keptNights === 1 ? '' : 's'}. No va a usar {removedNights} noche
              {removedNights === 1 ? '' : 's'}.
            </Typography>
            <Typography variant='body2'>Se quita {formatRoomPrice(removedAmount)} de la cuenta.</Typography>
            <Typography variant='body2' color='text.secondary'>
              La habitación pasa a limpieza.
            </Typography>
            {credit > 0 ? (
              <Alert severity='info'>
                Queda {formatRoomPrice(credit)} a favor. Después de confirmar puede devolverlo.
              </Alert>
            ) : null}
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant='contained' color='warning' disabled={saving || !stay || removedNights < 1} onClick={handleConfirm}>
          {saving ? <CircularProgress size={20} color='inherit' /> : 'Check-out (ya se fue)'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export const UndoCheckInDialog = ({ open, propertyId, stay, onClose, onSuccess, onRefund }: Omit<Props, 'today'>) => {
  const [saving, setSaving] = useState(false)
  const removedAmount = stay ? roundMoney(stay.pricePerNight * stay.nights) : 0
  const credit = stay ? creditAfter(stay, removedAmount) : 0

  const handleConfirm = async () => {
    if (!stay) return

    setSaving(true)

    try {
      await frontDeskApi.undoCheckIn(propertyId, stay.reservationUuid, stay.reservationRoomUuid)
      toast.success(`No se presentó · ${stay.reservationCode}`)
      onSuccess()
      onClose()

      if (credit > 0) {
        onRefund(credit, `Queda a favor ${formatRoomPrice(credit)}. Esta habitación no se cobra.`)
      }
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo marcar como no se presentó.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='xs'>
      <DialogTitle>No se presentó</DialogTitle>
      <DialogContent className='flex flex-col gap-3 pt-3'>
        {stay ? (
          <>
            <Typography>
              {stay.guestName || stay.reservationCode} · {stay.roomNumber || 'Sin habitación'}
            </Typography>
            <Typography variant='body2'>
              Se deshace el ingreso y queda como no se presentó. No se cobra {formatRoomPrice(removedAmount)} y la
              habitación queda libre.
            </Typography>
            {credit > 0 ? (
              <Alert severity='info'>
                Si ya pagó, queda {formatRoomPrice(credit)} a favor. Después de confirmar puede devolverlo.
              </Alert>
            ) : null}
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant='contained' color='secondary' disabled={saving || !stay} onClick={handleConfirm}>
          {saving ? <CircularProgress size={20} color='inherit' /> : 'No se presentó'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
