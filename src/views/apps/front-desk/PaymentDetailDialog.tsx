'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import type { FrontDeskPayment, Reservation } from '@/types/apps/frontDeskTypes'
import { formatPaidAt, PAYMENT_METHOD_LABELS } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'
import BalanceChip from './BalanceChip'

type Props = {
  open: boolean
  propertyId: number
  payment: FrontDeskPayment | null
  onClose: () => void
  onRegister: (reservationUuid: string) => void
}

const PaymentDetailDialog = ({ open, propertyId, payment, onClose, onRegister }: Props) => {
  const [detail, setDetail] = useState<FrontDeskPayment | null>(payment)
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [history, setHistory] = useState<FrontDeskPayment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !payment) {
      return
    }

    const load = async () => {
      setLoading(true)

      try {
        const [item, reservationDetail, rows] = await Promise.all([
          frontDeskApi.getPayment(propertyId, payment.uuid),
          frontDeskApi.reservation(propertyId, payment.reservationUuid),
          frontDeskApi.payments(propertyId, payment.reservationUuid)
        ])

        setDetail(item)
        setReservation(reservationDetail)
        setHistory(rows)
      } catch (error) {
        toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo cargar el pago.'))
        setDetail(payment)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [open, payment, propertyId])

  const current = detail ?? payment

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>Movimiento {current?.reservationCode ?? ''}</DialogTitle>
      <DialogContent className='flex flex-col gap-3 pt-4'>
        {loading ? (
          <div className='flex justify-center p-8'>
            <CircularProgress size={28} />
          </div>
        ) : current ? (
          <>
            <div className='flex flex-wrap items-center gap-2'>
              <Chip
                size='small'
                color={current.amount < 0 ? 'error' : 'success'}
                label={current.amount < 0 ? 'Devolución' : 'Cobro'}
              />
              <Chip size='small' variant='tonal' label={PAYMENT_METHOD_LABELS[current.method] ?? current.method} />
            </div>
            <Typography variant='h5'>{formatRoomPrice(current.amount)}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {formatPaidAt(current.paidAt)}
            </Typography>
            {current.reference ? <Typography variant='body2'>Operación {current.reference}</Typography> : null}
            {current.notes ? (
              <Typography variant='body2' color='text.secondary'>
                {current.notes}
              </Typography>
            ) : null}
            {reservation ? (
              <>
                <Divider />
                <div className='flex flex-wrap items-center gap-2'>
                  <Typography className='font-medium'>Reserva {reservation.code}</Typography>
                  <BalanceChip balance={reservation.balance} />
                </div>
                <Typography variant='body2'>
                  Total {formatRoomPrice(reservation.totalAmount)} · Pagado {formatRoomPrice(reservation.paidAmount)}
                </Typography>
              </>
            ) : null}
            <Divider />
            <Typography className='font-medium'>Historial</Typography>
            {history.length === 0 ? (
              <Typography variant='body2' color='text.secondary'>
                Sin otros movimientos
              </Typography>
            ) : (
              history.map(item => (
                <div key={item.uuid} className='flex justify-between gap-2'>
                  <Typography variant='body2'>
                    {formatPaidAt(item.paidAt)} · {PAYMENT_METHOD_LABELS[item.method] ?? item.method}
                  </Typography>
                  <Typography variant='body2' color={item.amount < 0 ? 'error' : 'inherit'}>
                    {formatRoomPrice(item.amount)}
                  </Typography>
                </div>
              ))
            )}
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' onClick={onClose}>
          Cerrar
        </Button>
        {current ? (
          <Button
            variant='contained'
            onClick={() => {
              onRegister(current.reservationUuid)
              onClose()
            }}
          >
            Nuevo movimiento
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}

export default PaymentDetailDialog
