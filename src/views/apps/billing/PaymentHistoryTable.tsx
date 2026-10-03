'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { toast } from 'react-toastify'

import type { ThemeColor } from '@core/types'
import { billingApi, getBillingApiErrorMessage } from '@/libs/billingApi'
import type { BillingPaymentStatus, BillingPaymentSummary } from '@/types/apps/billingTypes'
import {
  PAYMENT_PROOF_HELP,
  PAYMENT_STATUS_LABELS,
  VOUCHER_METHOD_LABELS,
  formatBillingMoney
} from '@/types/apps/billingTypes'
import { formatPlanningDate } from '@/types/apps/reservationsTypes'

type Props = {
  propertyId: number
  refreshKey: number
  canPay: boolean
  onlineEnabled: boolean
  onOpen: (payment: BillingPaymentSummary) => void
  onReport: (payment: BillingPaymentSummary) => void
  onCardPay: (payment: BillingPaymentSummary) => void
}

const STATUS_OPTIONS: BillingPaymentStatus[] = ['PENDING', 'OVERDUE', 'PAID', 'VOID']

const statusColor: Record<BillingPaymentStatus, ThemeColor> = {
  PENDING: 'warning',
  OVERDUE: 'error',
  PAID: 'success',
  VOID: 'secondary'
}

const PaymentHistoryTable = ({
  propertyId,
  refreshKey,
  canPay,
  onlineEnabled,
  onOpen,
  onReport,
  onCardPay
}: Props) => {
  const [rows, setRows] = useState<BillingPaymentSummary[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<BillingPaymentStatus | ''>('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const result = await billingApi.payments(propertyId, { page, limit: 20, status })

      setRows(result.data)
      setTotalPages(result.meta.totalPages || 1)
      setTotal(result.meta.total)
    } catch (error) {
      toast.error(getBillingApiErrorMessage(error, 'No se pudo cargar el historial de pagos.'))
    } finally {
      setLoading(false)
    }
  }, [page, propertyId, status])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel id='billing-status'>Estado</InputLabel>
          <Select
            labelId='billing-status'
            label='Estado'
            value={status}
            onChange={e => {
              setPage(1)
              setStatus(e.target.value as BillingPaymentStatus | '')
            }}
          >
            <MenuItem value=''>Todos</MenuItem>
            {STATUS_OPTIONS.map(item => (
              <MenuItem key={item} value={item}>
                {PAYMENT_STATUS_LABELS[item]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant='body2'>{total} cobro(s)</Typography>
      </div>
      <Typography variant='body2' color='text.disabled'>
        {PAYMENT_PROOF_HELP}
      </Typography>

      {loading ? (
        <div className='flex justify-center p-8'>
          <CircularProgress size={28} />
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Período</TableCell>
                <TableCell>Vence</TableCell>
                <TableCell align='right'>Total</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Medio</TableCell>
                <TableCell>Pagado</TableCell>
                <TableCell align='right'>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography>No hay cobros para este filtro.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(row => (
                  <TableRow key={row.uuid} hover>
                    <TableCell>
                      <Typography
                        color='primary.main'
                        className='cursor-pointer'
                        onClick={() => onOpen(row)}
                      >
                        {formatPlanningDate(row.periodStart)} – {formatPlanningDate(row.periodEnd)}
                      </Typography>
                      <Typography variant='body2'>{row.plan?.name || '—'}</Typography>
                    </TableCell>
                    <TableCell>{formatPlanningDate(row.dueDate)}</TableCell>
                    <TableCell align='right'>{formatBillingMoney(row.total, row.currency)}</TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={statusColor[row.status] || 'secondary'}
                        label={PAYMENT_STATUS_LABELS[row.status] || row.status}
                      />
                    </TableCell>
                    <TableCell>
                      {row.method
                        ? VOUCHER_METHOD_LABELS[row.method as keyof typeof VOUCHER_METHOD_LABELS] || row.method
                        : '—'}
                    </TableCell>
                    <TableCell>{formatPlanningDate(row.paidAt)}</TableCell>
                    <TableCell align='right'>
                      <div className='flex flex-col items-end gap-2'>
                        {row.latestVoucher?.status === 'PENDING' ? (
                          <Chip size='small' variant='tonal' color='warning' label='Constancia en revisión' />
                        ) : null}
                        {row.latestVoucher?.status === 'REJECTED' ? (
                          <Typography variant='caption' color='error'>
                            Constancia rechazada
                            {row.latestVoucher.reviewNotes ? `: ${row.latestVoucher.reviewNotes}` : ''}
                          </Typography>
                        ) : null}
                        <div className='flex flex-wrap justify-end gap-2'>
                          <Button size='small' variant='outlined' onClick={() => onOpen(row)}>
                            Ver
                          </Button>
                          {canPay && row.canPay ? (
                            <Button size='small' variant='contained' onClick={() => onReport(row)}>
                              Reportar pago
                            </Button>
                          ) : null}
                          {canPay && row.canPay && onlineEnabled ? (
                            <Button size='small' variant='outlined' color='primary' onClick={() => onCardPay(row)}>
                              Pagar con tarjeta
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 ? (
        <Pagination className='self-end' page={page} count={totalPages} onChange={(_e, next) => setPage(next)} />
      ) : null}
    </div>
  )
}

export default PaymentHistoryTable
