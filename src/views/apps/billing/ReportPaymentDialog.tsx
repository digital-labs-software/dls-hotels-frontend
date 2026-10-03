'use client'

import { useEffect, useState } from 'react'

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
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import type { BoxProps } from '@mui/material/Box'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-toastify'

import AppReactDropzone from '@/libs/styles/AppReactDropzone'
import { billingApi, getBillingApiErrorMessage, uploadVoucherToCloudinary, validateVoucherFile } from '@/libs/billingApi'
import type { BillingPaymentSummary, PaymentOptions, VoucherMethod } from '@/types/apps/billingTypes'
import {
  DEFAULT_VOUCHER_METHODS,
  PAYMENT_PROOF_HELP,
  PAYMENT_PROOF_LABEL,
  VOUCHER_METHOD_LABELS,
  formatBillingMoney
} from '@/types/apps/billingTypes'

const Dropzone = styled(AppReactDropzone)<BoxProps>(({ theme }) => ({
  '& .dropzone': {
    minHeight: 'unset',
    padding: theme.spacing(6)
  }
}))

type Props = {
  open: boolean
  propertyId: number
  payment: BillingPaymentSummary | null
  today: string
  paymentOptions: PaymentOptions | null
  onClose: () => void
  onSuccess: () => void
}

const ReportPaymentDialog = ({ open, propertyId, payment, today, paymentOptions, onClose, onSuccess }: Props) => {
  const methods = paymentOptions?.voucherMethods?.length ? paymentOptions.voucherMethods : DEFAULT_VOUCHER_METHODS
  const [method, setMethod] = useState<VoucherMethod>('TRANSFER')
  const [amount, setAmount] = useState('')
  const [operationDate, setOperationDate] = useState(today)
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !payment) {
      return
    }

    setMethod((paymentOptions?.voucherMethods?.[0] as VoucherMethod) || 'TRANSFER')
    setAmount(String(payment.total ?? ''))
    setOperationDate(today)
    setReference('')
    setNotes('')
    setFile(null)
  }, [open, payment, paymentOptions, today])

  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    disabled: saving,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf']
    },
    onDrop: acceptedFiles => {
      const next = acceptedFiles[0]

      if (!next) {
        return
      }

      const error = validateVoucherFile(next)

      if (error) {
        toast.error(error)

        return
      }

      setFile(next)
    }
  })

  const handleSubmit = async () => {
    if (!payment || !file) {
      toast.error('Adjunta la constancia de pago.')

      return
    }

    const parsed = Number(amount)

    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error('El monto debe ser mayor que 0.')

      return
    }

    if (!operationDate) {
      toast.error('Indica la fecha de la operación.')

      return
    }

    setSaving(true)

    try {
      const signature = await billingApi.uploadSignature(propertyId, payment.uuid)
      const fileError = validateVoucherFile(file, signature)

      if (fileError) {
        throw new Error(fileError)
      }

      const fileUrl = await uploadVoucherToCloudinary(signature, file)

      await billingApi.createVoucher(propertyId, payment.uuid, {
        method,
        amount: Number(parsed.toFixed(2)),
        operationDate,
        reference: reference.trim() || null,
        fileUrl,
        notes: notes.trim() || null
      })

      toast.success('Constancia de pago enviada. DLS la revisará en breve.')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(getBillingApiErrorMessage(error, 'No se pudo reportar el pago.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='sm'>
      <DialogTitle>Reportar pago</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-4'>
        {payment ? (
          <Typography variant='body2'>
            Cobro {formatBillingMoney(payment.total, payment.currency)} · vence {payment.dueDate || '—'}
          </Typography>
        ) : null}
        <Typography variant='body2' color='text.disabled'>
          {PAYMENT_PROOF_HELP}
        </Typography>
        <FormControl fullWidth>
          <InputLabel id='voucher-method'>Medio</InputLabel>
          <Select
            labelId='voucher-method'
            label='Medio'
            value={method}
            onChange={e => setMethod(e.target.value as VoucherMethod)}
          >
            {methods.map(item => (
              <MenuItem key={item} value={item}>
                {VOUCHER_METHOD_LABELS[item] || item}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label='Monto' value={amount} onChange={e => setAmount(e.target.value)} />
        <TextField
          type='date'
          label='Fecha de operación'
          value={operationDate}
          onChange={e => setOperationDate(e.target.value)}
          inputProps={{ max: today }}
        />
        <TextField
          label='N.º de operación'
          value={reference}
          onChange={e => setReference(e.target.value)}
          inputProps={{ maxLength: 100 }}
        />
        <TextField
          label='Comentario para DLS'
          value={notes}
          onChange={e => setNotes(e.target.value)}
          multiline
          minRows={2}
          inputProps={{ maxLength: 1000 }}
        />
        <Dropzone>
          <div {...getRootProps({ className: 'dropzone' })}>
            <input {...getInputProps()} />
            <div className='flex flex-col items-center gap-2'>
              <i className='ri-upload-cloud-2-line text-[28px]' />
              <Typography>
                {file ? file.name : `Arrastra la ${PAYMENT_PROOF_LABEL.toLowerCase()} o haz clic para elegir`}
              </Typography>
              <Typography variant='body2' color='text.disabled'>
                JPG, PNG, WEBP o PDF · máx. 5 MB
              </Typography>
            </div>
          </div>
        </Dropzone>
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant='contained' disabled={saving} onClick={handleSubmit}>
          {saving ? <CircularProgress size={20} color='inherit' /> : 'Enviar constancia'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ReportPaymentDialog
