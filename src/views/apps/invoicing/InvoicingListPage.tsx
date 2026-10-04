'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
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
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { Locale } from '@configs/i18n'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { einvoiceApi, getEinvoiceApiErrorMessage } from '@/libs/einvoiceApi'
import { getLocalizedUrl } from '@/utils/i18n'
import type { Einvoice } from '@/types/apps/einvoiceTypes'
import { EINVOICE_ISSUE_TYPES, EINVOICE_STATUSES } from '@/types/apps/einvoiceTypes'
import {
  documentTypeLabel,
  seriesPurposeLabel,
  EINVOICE_STATUS_COLORS,
  formatEinvoiceDate,
  formatEinvoiceMoney,
  formatEinvoiceNumber,
  statusLabel
} from './einvoiceLabels'

const InvoicingListPage = () => {
  const router = useRouter()
  const { lang: locale } = useParams()
  const { data: session, status } = useSession()
  const { canViewInvoices, canIssueInvoices, canSettingsInvoices, loaded } = useSubscriptionAccess()
  const propertyId = session?.user?.propertyId ?? 1

  const [rows, setRows] = useState<Einvoice[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [documentType, setDocumentType] = useState('')
  const [invoiceStatus, setInvoiceStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const result = await einvoiceApi.list(propertyId, {
        page,
        limit: 20,
        documentType: documentType || undefined,
        status: invoiceStatus || undefined,
        from: from || undefined,
        to: to || undefined,
        search: search.trim() || undefined
      })

      setRows(result.data)
      setTotalPages(result.meta.totalPages || 1)
      setTotal(result.meta.total)
    } catch (error) {
      toast.error(getEinvoiceApiErrorMessage(error, 'No se pudo cargar los comprobantes.'))
    } finally {
      setLoading(false)
    }
  }, [documentType, from, invoiceStatus, page, propertyId, search, to])

  useEffect(() => {
    if (status === 'loading' || !loaded) {
      return
    }

    if (!canViewInvoices) {
      router.replace(getLocalizedUrl('/apps/dashboard', locale as Locale))

      return
    }

    load()
  }, [canViewInvoices, load, loaded, locale, router, status])

  if (!loaded || !canViewInvoices) {
    return null
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <div className='flex items-center gap-1'>
            <Typography variant='h4'>Comprobantes</Typography>
            {canSettingsInvoices ? (
              <Tooltip title='Series y SUNAT'>
                <IconButton
                  size='small'
                  component={Link}
                  href={getLocalizedUrl('/apps/hotel/einvoice', locale as Locale)}
                  aria-label='Series y SUNAT'
                >
                  <i className='ri-settings-3-line' />
                </IconButton>
              </Tooltip>
            ) : null}
          </div>
          <Typography color='text.secondary'>Boletas, facturas y notas electrónicas SUNAT</Typography>
        </div>
        {canIssueInvoices ? (
          <Button
            variant='contained'
            startIcon={<i className='ri-add-line' />}
            component={Link}
            href={getLocalizedUrl('/apps/invoicing/issue', locale as Locale)}
          >
            Nuevo comprobante
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className='flex flex-col gap-4'>
          <div className='flex flex-wrap gap-3'>
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel id='invoice-type'>Tipo</InputLabel>
              <Select
                labelId='invoice-type'
                label='Tipo'
                value={documentType}
                onChange={event => {
                  setPage(1)
                  setDocumentType(event.target.value)
                }}
              >
                <MenuItem value=''>Todos</MenuItem>
                {EINVOICE_ISSUE_TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    {documentTypeLabel(type)}
                  </MenuItem>
                ))}
                <MenuItem value='CREDIT_NOTE'>Nota de crédito</MenuItem>
                <MenuItem value='DEBIT_NOTE'>Nota de débito</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel id='invoice-status'>Estado</InputLabel>
              <Select
                labelId='invoice-status'
                label='Estado'
                value={invoiceStatus}
                onChange={event => {
                  setPage(1)
                  setInvoiceStatus(event.target.value)
                }}
              >
                <MenuItem value=''>Todos</MenuItem>
                {EINVOICE_STATUSES.map(item => (
                  <MenuItem key={item} value={item}>
                    {statusLabel(item)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type='date'
              label='Desde'
              value={from}
              onChange={event => {
                setPage(1)
                setFrom(event.target.value)
              }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type='date'
              label='Hasta'
              value={to}
              onChange={event => {
                setPage(1)
                setTo(event.target.value)
              }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='Buscar'
              placeholder='Número, cliente o RUC'
              value={search}
              onChange={event => {
                setPage(1)
                setSearch(event.target.value)
              }}
            />
            <Button variant='outlined' color='secondary' startIcon={<i className='ri-refresh-line' />} onClick={() => void load()}>
              Actualizar
            </Button>
          </div>

          {loading ? (
            <div className='flex justify-center p-10'>
              <CircularProgress size={32} />
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Número</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align='right'>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography color='text.secondary'>No hay comprobantes con esos filtros.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map(row => (
                      <TableRow
                        key={row.uuid}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => router.push(getLocalizedUrl(`/apps/invoicing/${row.uuid}`, locale as Locale))}
                      >
                        <TableCell>
                          <Typography color='primary.main'>{formatEinvoiceNumber(row)}</Typography>
                        </TableCell>
                        <TableCell>{seriesPurposeLabel(row.series, row.documentType)}</TableCell>
                        <TableCell>
                          <Typography>{row.customerName || '—'}</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {row.customerDocument || ''}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatEinvoiceDate(row.issueDate)}</TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={EINVOICE_STATUS_COLORS[row.status] || 'secondary'}
                            label={statusLabel(row.status)}
                          />
                        </TableCell>
                        <TableCell align='right'>{formatEinvoiceMoney(row.total, row.currency || 'PEN')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className='flex flex-wrap items-center justify-between gap-3'>
            <Typography color='text.secondary'>{total} comprobantes</Typography>
            <Pagination color='primary' count={totalPages} page={page} onChange={(_, value) => setPage(value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default InvoicingListPage
