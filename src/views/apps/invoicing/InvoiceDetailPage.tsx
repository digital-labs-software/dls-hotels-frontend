'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { Locale } from '@configs/i18n'
import Logo from '@components/layout/shared/Logo'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { einvoiceApi, getEinvoiceApiErrorMessage } from '@/libs/einvoiceApi'
import { getLocalizedUrl } from '@/utils/i18n'
import type { Einvoice, EinvoiceCatalogs } from '@/types/apps/einvoiceTypes'
import {
  seriesPurposeLabel,
  EINVOICE_PAYMENT_CONDITION_LABELS,
  EINVOICE_STATUS_COLORS,
  formatEinvoiceDate,
  formatEinvoiceMoney,
  formatEinvoiceNumber,
  hasInvoiceAction,
  isPendingSunat,
  statusLabel
} from './einvoiceLabels'

const InvoiceDetailPage = ({ invoiceUuid }: { invoiceUuid: string }) => {
  const router = useRouter()
  const { lang: locale } = useParams()
  const { data: session, status } = useSession()
  const { canViewInvoices, canIssueInvoices, canVoidInvoices, loaded } = useSubscriptionAccess()
  const propertyId = session?.user?.propertyId ?? 1

  const [invoice, setInvoice] = useState<Einvoice | null>(null)
  const [catalogs, setCatalogs] = useState<EinvoiceCatalogs | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteType, setNoteType] = useState<'CREDIT_NOTE' | 'DEBIT_NOTE'>('CREDIT_NOTE')
  const [noteCode, setNoteCode] = useState('')
  const [noteReason, setNoteReason] = useState('')

  const load = useCallback(async () => {
    try {
      const [nextInvoice, nextCatalogs] = await Promise.all([
        einvoiceApi.get(propertyId, invoiceUuid),
        einvoiceApi.catalogs(propertyId).catch(() => null)
      ])

      setInvoice(nextInvoice)
      setCatalogs(current => nextCatalogs || current)
    } catch (error) {
      toast.error(getEinvoiceApiErrorMessage(error, 'No se pudo cargar el comprobante.'))
    } finally {
      setLoading(false)
    }
  }, [invoiceUuid, propertyId])

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

  useEffect(() => {
    if (!invoice || !isPendingSunat(invoice.status)) {
      return
    }

    const timer = window.setInterval(() => {
      void load()
    }, 4000)

    return () => window.clearInterval(timer)
  }, [invoice, load])

  const runAction = async (task: () => Promise<unknown>, success: string) => {
    setWorking(true)

    try {
      await task()
      toast.success(success)
      await load()
    } catch (error) {
      toast.error(getEinvoiceApiErrorMessage(error, 'No se pudo completar la acción.'))
    } finally {
      setWorking(false)
    }
  }

  if (!loaded || !canViewInvoices) {
    return null
  }

  if (loading && !invoice) {
    return (
      <div className='flex justify-center p-10'>
        <CircularProgress size={32} />
      </div>
    )
  }

  if (!invoice) {
    return <Alert severity='warning'>No se encontró el comprobante.</Alert>
  }

  const currency = invoice.currency || 'PEN'
  const noteReasons = noteType === 'CREDIT_NOTE' ? catalogs?.creditNoteReasons || [] : catalogs?.debitNoteReasons || []

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <Typography variant='h4'>{seriesPurposeLabel(invoice.series, invoice.documentType)}</Typography>
            <Typography color='text.secondary'>{formatEinvoiceNumber(invoice)}</Typography>
          </div>
          <Button
            variant='outlined'
            color='secondary'
            component={Link}
            href={getLocalizedUrl('/apps/invoicing', locale as Locale)}
          >
            Volver a comprobantes
          </Button>
        </div>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card className='previewCard'>
          <CardContent className='sm:!p-12'>
            <div className='p-6 bg-actionHover rounded mbe-6'>
              <div className='flex justify-between gap-y-4 flex-col sm:flex-row'>
                <div className='flex flex-col gap-4'>
                  <Logo />
                  <div>
                    <Typography color='text.primary'>{invoice.customer?.businessName || invoice.customerName || 'Cliente'}</Typography>
                    <Typography color='text.secondary'>{invoice.customerDocument || invoice.customer?.documentNumber || ''}</Typography>
                    <Typography color='text.secondary'>{invoice.customer?.address || ''}</Typography>
                    <Typography color='text.secondary'>{invoice.customer?.email || ''}</Typography>
                  </div>
                </div>
                <div className='flex flex-col gap-2 items-start sm:items-end'>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={EINVOICE_STATUS_COLORS[invoice.status] || 'secondary'}
                    label={statusLabel(invoice.status)}
                  />
                  <Typography>Emisión: {formatEinvoiceDate(invoice.issueDate)}</Typography>
                  {invoice.dueDate ? <Typography>Vence: {formatEinvoiceDate(invoice.dueDate)}</Typography> : null}
                  <Typography>
                    Condición: {EINVOICE_PAYMENT_CONDITION_LABELS[invoice.paymentCondition || 'CASH'] || invoice.paymentCondition}
                  </Typography>
                </div>
              </div>
            </div>

            <div className='overflow-x-auto'>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Descripción</TableCell>
                    <TableCell align='right'>Cantidad</TableCell>
                    <TableCell align='right'>P. unitario</TableCell>
                    <TableCell align='right'>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(invoice.items || []).map((item, index) => (
                    <TableRow key={item.uuid || `${item.description}-${index}`}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell align='right'>{item.quantity}</TableCell>
                      <TableCell align='right'>{formatEinvoiceMoney(item.unitPrice, currency)}</TableCell>
                      <TableCell align='right'>
                        {formatEinvoiceMoney(item.total ?? item.quantity * item.unitPrice, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Divider className='mlb-6' />

            <div className='flex flex-col items-end gap-1'>
              <Typography>Subtotal: {formatEinvoiceMoney(invoice.subtotal, currency)}</Typography>
              <Typography>IGV: {formatEinvoiceMoney(invoice.igv, currency)}</Typography>
              <Typography variant='h6'>Total: {formatEinvoiceMoney(invoice.total, currency)}</Typography>
            </div>

            {invoice.observations ? (
              <Typography className='mbs-6' color='text.secondary'>
                Observaciones: {invoice.observations}
              </Typography>
            ) : null}

            {invoice.sunatMessage ? (
              <Alert severity={invoice.status === 'ERROR' || invoice.status === 'REJECTED' ? 'error' : 'info'} className='mbs-6'>
                {invoice.sunatMessage}
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent className='flex flex-col gap-3'>
            <Button
              fullWidth
              variant='outlined'
              color='secondary'
              startIcon={<i className='ri-refresh-line' />}
              disabled={working}
              onClick={() => void load()}
            >
              Actualizar
            </Button>
            {canIssueInvoices && hasInvoiceAction(invoice, 'issue') ? (
              <Button
                fullWidth
                variant='contained'
                disabled={working}
                onClick={() => void runAction(() => einvoiceApi.issueDraft(propertyId, invoice.uuid), 'Comprobante enviado a cola.')}
              >
                Emitir borrador
              </Button>
            ) : null}
            {canIssueInvoices && hasInvoiceAction(invoice, 'retry') ? (
              <Button
                fullWidth
                variant='contained'
                color='warning'
                disabled={working}
                onClick={() => void runAction(() => einvoiceApi.retry(propertyId, invoice.uuid), 'Reintento enviado.')}
              >
                Reintentar
              </Button>
            ) : null}
            {invoice.pdfUrl ? (
              <Button fullWidth variant='outlined' href={invoice.pdfUrl} target='_blank' rel='noreferrer'>
                Ver PDF
              </Button>
            ) : null}
            {invoice.xmlUrl ? (
              <Button fullWidth variant='outlined' color='secondary' href={invoice.xmlUrl} target='_blank' rel='noreferrer'>
                XML
              </Button>
            ) : null}
            {invoice.cdrUrl ? (
              <Button fullWidth variant='outlined' color='secondary' href={invoice.cdrUrl} target='_blank' rel='noreferrer'>
                CDR
              </Button>
            ) : null}
            {canIssueInvoices && hasInvoiceAction(invoice, 'note') ? (
              <Button fullWidth variant='outlined' onClick={() => setNoteOpen(true)}>
                Emitir nota
              </Button>
            ) : null}
            {canVoidInvoices && hasInvoiceAction(invoice, 'void') ? (
              <Button fullWidth color='error' variant='outlined' onClick={() => setVoidOpen(true)}>
                Anular
              </Button>
            ) : null}
            {canIssueInvoices && hasInvoiceAction(invoice, 'delete') ? (
              <Button
                fullWidth
                color='error'
                disabled={working}
                onClick={() =>
                  void runAction(async () => {
                    await einvoiceApi.removeDraft(propertyId, invoice.uuid)
                    router.replace(getLocalizedUrl('/apps/invoicing', locale as Locale))
                  }, 'Borrador eliminado.')
                }
              >
                Eliminar borrador
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={voidOpen} onClose={() => setVoidOpen(false)} fullWidth maxWidth='sm'>
        <DialogTitle>Anular comprobante</DialogTitle>
        <DialogContent className='flex flex-col gap-4 pt-4'>
          <TextField
            label='Motivo'
            value={voidReason}
            onChange={event => setVoidReason(event.target.value)}
            placeholder='ERROR EN LOS DATOS DEL CLIENTE'
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setVoidOpen(false)}>
            Cancelar
          </Button>
          <Button
            color='error'
            variant='contained'
            disabled={!voidReason.trim() || working}
            onClick={() =>
              void runAction(async () => {
                await einvoiceApi.voidInvoice(propertyId, invoice.uuid, voidReason.trim())
                setVoidOpen(false)
                setVoidReason('')
              }, 'Anulación enviada.')
            }
          >
            Anular
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} fullWidth maxWidth='sm'>
        <DialogTitle>Nota de crédito o débito</DialogTitle>
        <DialogContent className='flex flex-col gap-4 pt-4'>
          <FormControl fullWidth>
            <InputLabel id='note-type'>Tipo</InputLabel>
            <Select
              labelId='note-type'
              label='Tipo'
              value={noteType}
              onChange={event => {
                setNoteType(event.target.value as 'CREDIT_NOTE' | 'DEBIT_NOTE')
                setNoteCode('')
              }}
            >
              <MenuItem value='CREDIT_NOTE'>Nota de crédito</MenuItem>
              <MenuItem value='DEBIT_NOTE'>Nota de débito</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id='note-code'>Motivo SUNAT</InputLabel>
            <Select labelId='note-code' label='Motivo SUNAT' value={noteCode} onChange={event => setNoteCode(event.target.value)}>
              {noteReasons.map(reason => (
                <MenuItem key={reason.code} value={reason.code}>
                  {reason.code} · {reason.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label='Descripción' value={noteReason} onChange={event => setNoteReason(event.target.value)} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setNoteOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            disabled={!noteCode || !noteReason.trim() || working}
            onClick={() =>
              void runAction(async () => {
                await einvoiceApi.createNote(propertyId, invoice.uuid, {
                  documentType: noteType,
                  noteCode,
                  reason: noteReason.trim()
                })
                setNoteOpen(false)
                setNoteReason('')
              }, 'Nota emitida.')
            }
          >
            Emitir nota
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default InvoiceDetailPage
