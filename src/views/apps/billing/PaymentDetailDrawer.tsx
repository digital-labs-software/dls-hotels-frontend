'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { toast } from 'react-toastify'

import { billingApi, getBillingApiErrorMessage } from '@/libs/billingApi'
import type { BillingPaymentDetail, BillingPaymentSummary, BillingVoucher } from '@/types/apps/billingTypes'
import {
  PAYMENT_PROOF_HELP,
  PAYMENT_STATUS_LABELS,
  VOUCHER_METHOD_LABELS,
  VOUCHER_STATUS_LABELS,
  formatBillingMoney,
  isPdfUrl
} from '@/types/apps/billingTypes'
import { formatPlanningDate } from '@/types/apps/reservationsTypes'

type Props = {
  open: boolean
  propertyId: number
  payment: BillingPaymentSummary | null
  canPay: boolean
  onlineEnabled: boolean
  onClose: () => void
  onReport: (payment: BillingPaymentSummary) => void
  onCardPay: (payment: BillingPaymentSummary) => void
  onChanged: () => void
}

const PaymentDetailDrawer = ({
  open,
  propertyId,
  payment,
  canPay,
  onlineEnabled,
  onClose,
  onReport,
  onCardPay,
  onChanged
}: Props) => {
  const [detail, setDetail] = useState<BillingPaymentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !payment) {
      setDetail(null)

      return
    }

    let active = true

    setLoading(true)

    billingApi
      .payment(propertyId, payment.uuid)
      .then(next => {
        if (active) {
          setDetail(next)
        }
      })
      .catch(error => {
        toast.error(getBillingApiErrorMessage(error, 'No se pudo cargar el cobro.'))
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [open, payment, propertyId])

  const handleWithdraw = async (voucher: BillingVoucher) => {
    if (!payment) {
      return
    }

    setWithdrawing(voucher.uuid)

    try {
      await billingApi.withdrawVoucher(propertyId, payment.uuid, voucher.uuid)
      toast.success('Constancia retirada. Puedes reportar el pago de nuevo.')
      const next = await billingApi.payment(propertyId, payment.uuid)

      setDetail(next)
      onChanged()
    } catch (error) {
      toast.error(getBillingApiErrorMessage(error, 'No se pudo retirar la constancia de pago.'))
    } finally {
      setWithdrawing(null)
    }
  }

  const current = detail || payment

  return (
    <Drawer anchor='right' open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 440 } } }}>
      <div className='flex items-center justify-between p-5'>
        <Typography variant='h5'>Detalle del cobro</Typography>
        <IconButton onClick={onClose}>
          <i className='ri-close-line' />
        </IconButton>
      </div>
      <Divider />
      <div className='flex flex-col gap-4 p-5'>
        {loading && !detail ? (
          <div className='flex justify-center p-6'>
            <CircularProgress size={28} />
          </div>
        ) : current ? (
          <>
            <div>
              <Typography className='font-medium' color='text.primary'>
                {current.plan?.name || 'Suscripción'}
              </Typography>
              <Typography>
                {formatPlanningDate(current.periodStart)} – {formatPlanningDate(current.periodEnd)}
              </Typography>
            </div>
            <Chip
              size='small'
              variant='tonal'
              label={PAYMENT_STATUS_LABELS[current.status] || current.status}
              className='self-start'
            />
            <Typography>Total {formatBillingMoney(current.total, current.currency)}</Typography>
            <Typography variant='body2'>Vence {formatPlanningDate(current.dueDate)}</Typography>
            {current.paidAt ? (
              <Typography variant='body2'>Pagado el {formatPlanningDate(current.paidAt)}</Typography>
            ) : null}
            <div className='flex flex-wrap gap-2'>
              {canPay && current.canPay ? (
                <Button variant='contained' onClick={() => onReport(current)}>
                  Reportar pago
                </Button>
              ) : null}
              {canPay && current.canPay && onlineEnabled ? (
                <Button variant='outlined' onClick={() => onCardPay(current)}>
                  Pagar con tarjeta
                </Button>
              ) : null}
            </div>
            <Divider />
            <Typography className='font-medium' color='text.primary'>
              Constancias de pago
            </Typography>
            <Typography variant='body2' color='text.disabled'>
              {PAYMENT_PROOF_HELP}
            </Typography>
            {detail?.vouchers?.length ? (
              detail.vouchers.map(voucher => (
                <div key={voucher.uuid} className='flex flex-col gap-2 rounded border p-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <Chip size='small' variant='tonal' label={VOUCHER_STATUS_LABELS[voucher.status] || voucher.status} />
                    <Typography variant='body2'>
                      {VOUCHER_METHOD_LABELS[voucher.method || 'OTHER'] || voucher.method} ·{' '}
                      {formatBillingMoney(voucher.amount, current.currency)}
                    </Typography>
                  </div>
                  <Typography variant='body2'>
                    {formatPlanningDate(voucher.operationDate)}
                    {voucher.reference ? ` · ${voucher.reference}` : ''}
                  </Typography>
                  {voucher.reviewNotes ? (
                    <Typography variant='body2' color='error'>
                      {voucher.reviewNotes}
                    </Typography>
                  ) : null}
                  {isPdfUrl(voucher.fileUrl) ? (
                    <Button size='small' href={voucher.fileUrl} target='_blank' rel='noreferrer'>
                      Ver PDF
                    </Button>
                  ) : (
                    <img src={voucher.fileUrl} alt='Constancia de pago' className='max-w-full rounded' />
                  )}
                  {canPay && voucher.status === 'PENDING' ? (
                    <Button
                      size='small'
                      color='error'
                      variant='outlined'
                      disabled={withdrawing === voucher.uuid}
                      onClick={() => handleWithdraw(voucher)}
                    >
                      {withdrawing === voucher.uuid ? <CircularProgress size={16} /> : 'Retirar constancia'}
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <Typography variant='body2'>Aún no hay constancias de pago en este cobro.</Typography>
            )}
          </>
        ) : null}
      </div>
    </Drawer>
  )
}

export default PaymentDetailDrawer
