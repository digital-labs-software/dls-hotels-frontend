'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { FrontDeskPayment, PaymentMethod } from '@/types/apps/frontDeskTypes'
import { formatPaidAt, limaToday, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/types/apps/frontDeskTypes'
import type { PageMeta } from '@/types/apps/pagination'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import tableStyles from '@core/styles/table.module.css'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'
import CashMovementDialog from './CashMovementDialog'
import PaymentDetailDialog from './PaymentDetailDialog'

const emptyMeta = (): PageMeta => ({ page: 1, limit: 20, total: 0, totalPages: 0 })

const PaymentsCashTable = () => {
  const { data: session, status } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const today = limaToday()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [rows, setRows] = useState<FrontDeskPayment[]>([])
  const [meta, setMeta] = useState<PageMeta>(emptyMeta())
  const [totals, setTotals] = useState({ charges: 0, refunds: 0, net: 0 })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FrontDeskPayment | null>(null)
  const [movementOpen, setMovementOpen] = useState(false)
  const [movementUuid, setMovementUuid] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    frontDeskApi
      .overview(propertyId)
      .then(board => {
        setFrom(board.date)
        setTo(board.date)
      })
      .catch(() => undefined)
  }, [propertyId, status])

  const fetchTotals = useCallback(async () => {
    let currentPage = 1
    let charges = 0
    let refunds = 0
    let totalPages = 1

    do {
      const payload = await frontDeskApi.listPropertyPayments(propertyId, {
        from,
        to,
        method: method || undefined,
        page: currentPage,
        limit: 100
      })

      payload.data.forEach(item => {
        if (item.amount >= 0) {
          charges += item.amount
        } else {
          refunds += item.amount
        }
      })

      totalPages = payload.meta.totalPages || 1
      currentPage += 1
    } while (currentPage <= totalPages)

    setTotals({ charges, refunds, net: charges + refunds })
  }, [from, method, propertyId, to])

  const fetchPage = useCallback(async () => {
    setLoading(true)

    try {
      const payload = await frontDeskApi.listPropertyPayments(propertyId, {
        from,
        to,
        method: method || undefined,
        page: page + 1,
        limit: rowsPerPage
      })

      setRows(payload.data)
      setMeta(payload.meta)
      await fetchTotals()
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo cargar la caja.'))
    } finally {
      setLoading(false)
    }
  }, [fetchTotals, from, method, page, propertyId, rowsPerPage, to])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    fetchPage()
  }, [fetchPage, status])

  const summary = useMemo(
    () => [
      { label: 'Cobros', value: totals.charges, color: 'success' as const },
      { label: 'Devoluciones', value: totals.refunds, color: 'error' as const },
      { label: 'Neto', value: totals.net, color: 'primary' as const }
    ],
    [totals]
  )

  return (
    <>
      <div className='flex flex-col gap-6'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <Typography variant='h4'>Caja</Typography>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outlined' color='secondary' startIcon={<i className='ri-refresh-line' />} onClick={fetchPage} disabled={loading}>
              Actualizar
            </Button>
            <Button
              variant='contained'
              startIcon={<i className='ri-add-line' />}
              onClick={() => {
                setMovementUuid(null)
                setMovementOpen(true)
              }}
            >
              Registrar movimiento
            </Button>
          </div>
        </div>

        <div className='flex flex-wrap gap-3'>
          {summary.map(item => (
            <Card key={item.label} className='min-is-[180px] flex-1'>
              <CardContent>
                <Typography color='text.secondary'>{item.label}</Typography>
                <Typography variant='h5' color={`${item.color}.main`}>
                  {formatRoomPrice(item.value)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className='flex flex-wrap items-end gap-4'>
            <TextField
              type='date'
              label='Desde'
              value={from}
              onChange={e => {
                setPage(0)
                setFrom(e.target.value)
              }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type='date'
              label='Hasta'
              value={to}
              onChange={e => {
                setPage(0)
                setTo(e.target.value)
              }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl size='small' className='min-is-[180px]'>
              <InputLabel>Método</InputLabel>
              <Select
                label='Método'
                value={method}
                onChange={e => {
                  setPage(0)
                  setMethod(e.target.value as PaymentMethod | '')
                }}
              >
                <MenuItem value=''>Todos</MenuItem>
                {PAYMENT_METHODS.map(item => (
                  <MenuItem key={item} value={item}>
                    {PAYMENT_METHOD_LABELS[item]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
          {loading ? (
            <div className='flex justify-center p-10'>
              <CircularProgress />
            </div>
          ) : rows.length === 0 ? (
            <Typography color='text.secondary' className='text-center p-8'>
              No hay movimientos en este rango
            </Typography>
          ) : (
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Reserva</th>
                    <th>Tipo</th>
                    <th>Método</th>
                    <th>Operación</th>
                    <th align='right'>Monto</th>
                    <th align='center'>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.uuid}>
                      <td>{formatPaidAt(row.paidAt)}</td>
                      <td>{row.reservationCode}</td>
                      <td>
                        <Chip
                          size='small'
                          color={row.amount < 0 ? 'error' : 'success'}
                          label={row.amount < 0 ? 'Devolución' : 'Cobro'}
                        />
                      </td>
                      <td>{PAYMENT_METHOD_LABELS[row.method] ?? row.method}</td>
                      <td>{row.reference || '—'}</td>
                      <td align='right'>{formatRoomPrice(row.amount)}</td>
                      <td align='center'>
                        <IconButton size='small' title='Ver' onClick={() => setSelected(row)}>
                          <i className='ri-eye-line' />
                        </IconButton>
                        <IconButton
                          size='small'
                          title='Nuevo movimiento'
                          onClick={() => {
                            setMovementUuid(row.reservationUuid)
                            setMovementOpen(true)
                          }}
                        >
                          <i className='ri-wallet-3-line' />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination
            component='div'
            count={meta.total}
            page={page}
            onPageChange={(_event, next) => setPage(next)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={event => {
              setRowsPerPage(Number(event.target.value))
              setPage(0)
            }}
            rowsPerPageOptions={[10, 20, 50, 100]}
            labelRowsPerPage='Filas'
          />
        </Card>
      </div>

      <PaymentDetailDialog
        open={Boolean(selected)}
        propertyId={propertyId}
        payment={selected}
        onClose={() => setSelected(null)}
        onRegister={uuid => {
          setMovementUuid(uuid)
          setMovementOpen(true)
        }}
      />
      <CashMovementDialog
        open={movementOpen}
        propertyId={propertyId}
        reservationUuid={movementUuid}
        onClose={() => {
          setMovementOpen(false)
          setMovementUuid(null)
        }}
        onSuccess={() => {
          setMovementOpen(false)
          setMovementUuid(null)
          fetchPage()
        }}
      />
    </>
  )
}

export default PaymentsCashTable
