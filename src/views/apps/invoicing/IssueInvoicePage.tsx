'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { Locale } from '@configs/i18n'
import GuestPicker from '@views/apps/front-desk/GuestPicker'
import CompanyPicker from '@views/apps/reservations/CompanyPicker'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { einvoiceApi, getEinvoiceApiErrorMessage } from '@/libs/einvoiceApi'
import { getLocalizedUrl } from '@/utils/i18n'
import DateField, { todayIso } from '@/components/date-picker/DateField'
import type { EinvoiceIssueType, EinvoicePaymentCondition, ReservationBilling } from '@/types/apps/einvoiceTypes'
import { formatEinvoiceMoney } from './einvoiceLabels'

type LineItem = {
  key: string
  reservationRoomUuid?: string
  extras?: boolean
  description: string
  quantity: string
  unitPrice: string
  selected: boolean
}

type PaymentRow = {
  paymentUuid: string
  available: number
  method?: string | null
  selected: boolean
  amount: string
}

const emptyItem = (): LineItem => ({
  key: `${Date.now()}-${Math.random()}`,
  description: '',
  quantity: '1',
  unitPrice: '',
  selected: true
})

const IssueInvoicePage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const { data: session, status } = useSession()
  const { canIssueInvoices, loaded } = useSubscriptionAccess()
  const propertyId = session?.user?.propertyId ?? 1
  const reservationUuid = searchParams.get('reservation') || ''

  const [billing, setBilling] = useState<ReservationBilling | null>(null)
  const [loading, setLoading] = useState(Boolean(reservationUuid))
  const [saving, setSaving] = useState(false)
  const [documentType, setDocumentType] = useState<EinvoiceIssueType>('RECEIPT')
  const [paymentCondition, setPaymentCondition] = useState<EinvoicePaymentCondition>('CASH')
  const [currency, setCurrency] = useState('PEN')
  const [dueDate, setDueDate] = useState('')
  const [exchangeRate, setExchangeRate] = useState('')
  const [observations, setObservations] = useState('')
  const [customerKind, setCustomerKind] = useState<'company' | 'guest' | 'manual'>('guest')
  const [companyUuid, setCompanyUuid] = useState('')
  const [guestUuid, setGuestUuid] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualDocument, setManualDocument] = useState('')
  const [items, setItems] = useState<LineItem[]>([emptyItem()])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [billAll, setBillAll] = useState(true)
  const [pickedRoomIds, setPickedRoomIds] = useState<string[]>([])

  const loadBilling = useCallback(async () => {
    if (!reservationUuid) {
      return
    }

    setLoading(true)

    try {
      const next = await einvoiceApi.reservationBilling(propertyId, reservationUuid)

      setBilling(next)

      const company = next.customers.find(item => item.kind === 'company')
      const guest = next.customers.find(item => item.kind === 'guest')
      const pendingRooms = next.rooms.filter(room => room.pending > 0 || room.extrasPending > 0)
      const onlyHolder = pendingRooms.length === 1 ? pendingRooms[0].holder : null

      setBillAll(true)
      setPickedRoomIds([])

      if (onlyHolder) {
        setCustomerKind('guest')
        setGuestUuid(onlyHolder.uuid)
        setCustomerEmail(onlyHolder.email || '')
      } else if (guest) {
        setCustomerKind('guest')
        setGuestUuid(guest.uuid)
        setCustomerEmail(guest.email || '')
      } else if (company) {
        setCustomerKind('company')
        setCompanyUuid(company.uuid)
        setCustomerEmail(company.email || '')
      }

      setItems(
        next.rooms.flatMap(room => {
          const selected = room.pending > 0 || room.extrasPending > 0
          const lines: LineItem[] = [
            {
              key: room.reservationRoomUuid,
              reservationRoomUuid: room.reservationRoomUuid,
              description: room.description,
              quantity: String(room.quantity || 1),
              unitPrice: String(room.pending || room.unitPrice || 0),
              selected
            }
          ]

          if (room.extrasPending > 0) {
            lines.push({
              key: `${room.reservationRoomUuid}-extras`,
              reservationRoomUuid: room.reservationRoomUuid,
              extras: true,
              description: `Consumos hab. ${room.roomNumber || 's/n'}`,
              quantity: '1',
              unitPrice: String(room.extrasPending),
              selected
            })
          }

          return lines
        })
      )
      setPayments(
        next.payments
          .filter(payment => payment.available > 0)
          .map(payment => ({
            paymentUuid: payment.paymentUuid,
            available: payment.available,
            method: payment.method,
            selected: false,
            amount: String(payment.available)
          }))
      )
    } catch (error) {
      toast.error(getEinvoiceApiErrorMessage(error, 'No se pudo cargar la reserva para facturar.'))
    } finally {
      setLoading(false)
    }
  }, [propertyId, reservationUuid])

  useEffect(() => {
    if (status === 'loading' || !loaded) {
      return
    }

    if (!canIssueInvoices) {
      router.replace(getLocalizedUrl('/apps/invoicing', locale as Locale))

      return
    }

    if (reservationUuid) {
      loadBilling()
    }
  }, [canIssueInvoices, loadBilling, loaded, locale, reservationUuid, router, status])

  const booker = billing?.customers.find(item => item.kind === 'guest') ?? null

  const useBooker = () => {
    if (!booker) return

    setCustomerKind('guest')
    setGuestUuid(booker.uuid)
    setCustomerEmail(booker.email || '')
  }

  const useHolder = (uuid: string) => {
    const holder = billing?.rooms.find(room => room.reservationRoomUuid === uuid)?.holder

    if (!holder) {
      useBooker()

      return
    }

    setCustomerKind('guest')
    setGuestUuid(holder.uuid)
    setCustomerEmail(holder.email || '')
  }

  const pendingRoomIds = billing
    ? billing.rooms.filter(room => room.pending > 0 || room.extrasPending > 0).map(room => room.reservationRoomUuid)
    : []

  const selectRooms = (ids: string[]) => {
    if (!billing) return

    const unique = ids.filter((id, index) => ids.indexOf(id) === index)
    const all = pendingRoomIds.length > 0 && pendingRoomIds.every(id => unique.includes(id)) && unique.every(id => pendingRoomIds.includes(id))

    setBillAll(all)
    setPickedRoomIds(all ? [] : unique)
    setItems(current =>
      current.map(item =>
        item.reservationRoomUuid ? { ...item, selected: all || unique.includes(item.reservationRoomUuid) } : item
      )
    )

    if (customerKind === 'company' || customerKind === 'manual') return

    if (all || unique.length === 0) useBooker()
    else useHolder(unique[0])
  }

  const toggleRoom = (uuid: string) => {
    if (!billing) return

    if (billAll) {
      if (!pendingRoomIds.includes(uuid)) {
        selectRooms([...pendingRoomIds, uuid])

        return
      }

      selectRooms(pendingRoomIds.filter(id => id !== uuid))

      return
    }

    const next = pickedRoomIds.includes(uuid) ? pickedRoomIds.filter(id => id !== uuid) : [...pickedRoomIds, uuid]

    selectRooms(next)
  }

  const guestChoices = useMemo(() => {
    if (!billing) return []

    const chosen = billAll ? billing.rooms : billing.rooms.filter(room => pickedRoomIds.includes(room.reservationRoomUuid))
    const options: { uuid: string; label: string }[] = []
    const seen = new Set<string>()
    const add = (uuid: string, label: string) => {
      if (!uuid || seen.has(uuid)) return

      seen.add(uuid)
      options.push({ uuid, label })
    }

    if (booker && (billAll || !chosen.some(room => room.holder?.uuid === booker.uuid))) {
      add(booker.uuid, `${booker.name} · quien reservó`)
    }

    chosen.forEach(room => {
      if (room.holder) add(room.holder.uuid, `${room.holder.name} · hab. ${room.roomNumber || 's/n'}`)
    })

    billing.rooms.forEach(room => {
      if (room.holder) add(room.holder.uuid, `${room.holder.name} · hab. ${room.roomNumber || 's/n'}`)
    })

    return options
  }, [billAll, billing, booker, pickedRoomIds])

  const selectedItems = useMemo(() => items.filter(item => item.selected && item.description.trim()), [items])
  const selectedTotal = selectedItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  )

  const buildPayload = (draft: boolean) => ({
    documentType,
    reservationUuid: reservationUuid || undefined,
    companyUuid: customerKind === 'company' ? companyUuid || undefined : undefined,
    guestUuid: customerKind === 'guest' ? guestUuid || undefined : undefined,
    customer:
      customerKind === 'manual'
        ? {
            name: manualName.trim() || undefined,
            documentNumber: manualDocument.trim() || undefined,
            email: customerEmail.trim() || undefined
          }
        : customerEmail.trim()
          ? { email: customerEmail.trim() }
          : undefined,
    paymentCondition,
    currency,
    exchangeRate: currency === 'USD' ? Number(exchangeRate) || undefined : undefined,
    dueDate: paymentCondition === 'CREDIT' ? dueDate || undefined : undefined,
    observations: observations.trim() || undefined,
    items: selectedItems.map(item => ({
      reservationRoomUuid: item.reservationRoomUuid,
      description: item.description.trim(),
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0)
    })),
    payments: payments
      .filter(payment => payment.selected && Number(payment.amount) > 0)
      .map(payment => ({ paymentUuid: payment.paymentUuid, amount: Number(payment.amount) })),
    draft
  })

  const submit = async (draft: boolean) => {
    if (selectedItems.length === 0) {
      toast.error('Agrega al menos un ítem.')

      return
    }

    if (documentType === 'INVOICE' && customerKind !== 'company') {
      toast.error('La factura requiere una empresa con RUC.')

      return
    }

    if (paymentCondition === 'CREDIT' && !dueDate) {
      toast.error('El crédito requiere fecha de vencimiento.')

      return
    }

    if (currency === 'USD' && !Number(exchangeRate)) {
      toast.error('En dólares indica el tipo de cambio.')

      return
    }

    setSaving(true)

    try {
      const invoice = await einvoiceApi.create(propertyId, buildPayload(draft))

      toast.success(draft ? 'Borrador guardado.' : 'Comprobante enviado a cola.')
      router.replace(getLocalizedUrl(`/apps/invoicing/${invoice.uuid}`, locale as Locale))
    } catch (error) {
      toast.error(getEinvoiceApiErrorMessage(error, 'No se pudo registrar el comprobante.'))
    } finally {
      setSaving(false)
    }
  }

  if (!loaded || !canIssueInvoices) {
    return null
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <Typography variant='h4' className={reservationUuid ? 'mbe-1' : undefined}>
            {reservationUuid ? 'Facturar reserva' : 'Nuevo comprobante'}
          </Typography>
          {reservationUuid ? (
            <Typography color='text.secondary'>Reserva {billing?.reservationCode || reservationUuid}</Typography>
          ) : null}
        </div>
        <Button variant='outlined' color='secondary' component={Link} href={getLocalizedUrl('/apps/invoicing', locale as Locale)}>
          Cancelar
        </Button>
      </div>

      {loading ? (
        <div className='flex justify-center p-10'>
          <CircularProgress size={32} />
        </div>
      ) : (
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card className='mbe-6'>
              <CardHeader title='Cliente' />
              <CardContent className='flex flex-col gap-4'>
                {pendingRoomIds.length > 1 ? (
                  <div className='flex flex-col gap-2'>
                    <Typography variant='subtitle2'>Qué se factura</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Toda la reserva sale a nombre de quien reservó. Si marca habitaciones, sale a nombre del titular de la
                      primera que marque. Puede cambiarlo a otro titular, a una empresa o a otro nombre.
                    </Typography>
                    <div className='flex flex-wrap gap-2'>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={billAll}
                            onChange={() => selectRooms(billAll ? [] : pendingRoomIds)}
                          />
                        }
                        label='Toda la reserva'
                      />
                      {billing?.rooms
                        .filter(room => pendingRoomIds.includes(room.reservationRoomUuid))
                        .map(room => (
                          <FormControlLabel
                            key={room.reservationRoomUuid}
                            control={
                              <Checkbox
                                checked={billAll || pickedRoomIds.includes(room.reservationRoomUuid)}
                                onChange={() => toggleRoom(room.reservationRoomUuid)}
                              />
                            }
                            label={`Hab. ${room.roomNumber || 's/n'}${room.holder?.name ? ` · ${room.holder.name}` : ''}`}
                          />
                        ))}
                    </div>
                  </div>
                ) : null}
                <RadioGroup
                  row
                  value={customerKind}
                  onChange={event => setCustomerKind(event.target.value as typeof customerKind)}
                >
                  <FormControlLabel value='company' control={<Radio />} label='Empresa' />
                  <FormControlLabel value='guest' control={<Radio />} label='Huésped' />
                  <FormControlLabel value='manual' control={<Radio />} label='Datos manuales' />
                </RadioGroup>
                {customerKind === 'company' ? (
                  billing?.customers.some(item => item.kind === 'company') ? (
                    <FormControl fullWidth>
                      <InputLabel id='company-uuid'>Empresa</InputLabel>
                      <Select
                        labelId='company-uuid'
                        label='Empresa'
                        value={companyUuid}
                        onChange={event => setCompanyUuid(event.target.value)}
                      >
                        {billing.customers
                          .filter(item => item.kind === 'company')
                          .map(item => (
                            <MenuItem key={item.uuid} value={item.uuid}>
                              {item.name} {item.documentNumber ? `· ${item.documentNumber}` : ''}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <CompanyPicker propertyId={propertyId} onSelect={company => setCompanyUuid(company?.uuid || '')} />
                  )
                ) : null}
                {customerKind === 'guest' ? (
                  billing?.customers.some(item => item.kind === 'guest') ? (
                    <FormControl fullWidth>
                      <InputLabel id='guest-uuid'>Huésped</InputLabel>
                      <Select
                        labelId='guest-uuid'
                        label='Huésped'
                        value={guestUuid}
                        onChange={event => {
                          const uuid = event.target.value
                          const match =
                            billing.customers.find(item => item.uuid === uuid) ||
                            billing.rooms.find(room => room.holder?.uuid === uuid)?.holder

                          setGuestUuid(uuid)
                          setCustomerEmail(match?.email || '')
                        }}
                      >
                        {(guestChoices.length > 0 ? guestChoices : billing.customers.filter(item => item.kind === 'guest').map(item => ({
                          uuid: item.uuid,
                          label: `${item.name}${item.documentNumber ? ` · ${item.documentNumber}` : ''}`
                        }))).map(item => (
                            <MenuItem key={item.uuid} value={item.uuid}>
                              {item.label}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <GuestPicker propertyId={propertyId} onSelect={guest => setGuestUuid(guest?.uuid || '')} />
                  )
                ) : null}
                {customerKind === 'manual' ? (
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <TextField label='Nombre o razón social' value={manualName} onChange={event => setManualName(event.target.value)} />
                    <TextField label='Documento' value={manualDocument} onChange={event => setManualDocument(event.target.value)} />
                  </div>
                ) : null}
                <TextField
                  label='Correo para envío'
                  value={customerEmail}
                  onChange={event => setCustomerEmail(event.target.value)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                title='Ítems'
                action={
                  !reservationUuid ? (
                    <Button size='small' startIcon={<i className='ri-add-line' />} onClick={() => setItems(current => [...current, emptyItem()])}>
                      Agregar ítem
                    </Button>
                  ) : null
                }
              />
              <CardContent className='flex flex-col gap-4'>
                {reservationUuid && items.length === 0 ? (
                  <Alert severity='info'>Esta reserva no tiene hospedaje por facturar.</Alert>
                ) : null}
                {items.map((item, index) => (
                  <div key={item.key} className='flex flex-col gap-3 p-4 rounded border border-divider'>
                    <div className='flex items-center justify-between gap-3'>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={item.selected}
                            disabled={Boolean(item.extras)}
                            onChange={() => {
                              if (item.reservationRoomUuid && billing) {
                                toggleRoom(item.reservationRoomUuid)

                                return
                              }

                              setItems(current =>
                                current.map(row => (row.key === item.key ? { ...row, selected: !row.selected } : row))
                              )
                            }}
                          />
                        }
                        label={
                          item.extras
                            ? 'Consumos de esa habitación'
                            : item.reservationRoomUuid
                              ? `Habitación ${billing?.rooms.find(room => room.reservationRoomUuid === item.reservationRoomUuid)?.roomNumber || index + 1}`
                              : `Ítem ${index + 1}`
                        }
                      />
                      {!reservationUuid ? (
                        <IconButton
                          size='small'
                          onClick={() => setItems(current => (current.length === 1 ? current : current.filter(row => row.key !== item.key)))}
                        >
                          <i className='ri-delete-bin-line' />
                        </IconButton>
                      ) : null}
                    </div>
                    <TextField
                      label='Descripción'
                      value={item.description}
                      onChange={event =>
                        setItems(current => current.map(row => (row.key === item.key ? { ...row, description: event.target.value } : row)))
                      }
                    />
                    <div className='grid grid-cols-2 gap-3'>
                      <TextField
                        type='number'
                        label='Cantidad'
                        value={item.quantity}
                        onChange={event =>
                          setItems(current => current.map(row => (row.key === item.key ? { ...row, quantity: event.target.value } : row)))
                        }
                      />
                      <TextField
                        type='number'
                        label='Precio unitario'
                        value={item.unitPrice}
                        onChange={event =>
                          setItems(current => current.map(row => (row.key === item.key ? { ...row, unitPrice: event.target.value } : row)))
                        }
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card className='mbe-6'>
              <CardHeader title='Emisión' />
              <CardContent className='flex flex-col gap-4'>
                <FormControl fullWidth>
                  <InputLabel id='document-type'>Tipo</InputLabel>
                  <Select
                    labelId='document-type'
                    label='Tipo'
                    value={documentType}
                    onChange={event => setDocumentType(event.target.value as EinvoiceIssueType)}
                  >
                    <MenuItem value='RECEIPT'>Boleta</MenuItem>
                    <MenuItem value='INVOICE'>Factura</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel id='payment-condition'>Condición</InputLabel>
                  <Select
                    labelId='payment-condition'
                    label='Condición'
                    value={paymentCondition}
                    onChange={event => setPaymentCondition(event.target.value as EinvoicePaymentCondition)}
                  >
                    <MenuItem value='CASH'>Contado</MenuItem>
                    <MenuItem value='CREDIT'>Crédito</MenuItem>
                  </Select>
                </FormControl>
                {paymentCondition === 'CREDIT' ? (
                  <DateField label='Fecha de vencimiento' value={dueDate} onChange={setDueDate} minDate={todayIso()} fullWidth />
                ) : null}
                <FormControl fullWidth>
                  <InputLabel id='currency'>Moneda</InputLabel>
                  <Select labelId='currency' label='Moneda' value={currency} onChange={event => setCurrency(event.target.value)}>
                    <MenuItem value='PEN'>Soles</MenuItem>
                    <MenuItem value='USD'>Dólares</MenuItem>
                  </Select>
                </FormControl>
                {currency === 'USD' ? (
                  <TextField label='Tipo de cambio' value={exchangeRate} onChange={event => setExchangeRate(event.target.value)} />
                ) : null}
                <TextField
                  label='Observaciones'
                  value={observations}
                  onChange={event => setObservations(event.target.value)}
                  multiline
                  minRows={2}
                />
                <Typography variant='h6'>Total: {formatEinvoiceMoney(selectedTotal, currency)}</Typography>
              </CardContent>
            </Card>

            {payments.length ? (
              <Card className='mbe-6'>
                <CardHeader title='Aplicar pagos' />
                <CardContent className='flex flex-col gap-3'>
                  {payments.map(payment => (
                    <div key={payment.paymentUuid} className='flex flex-col gap-2'>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={payment.selected}
                            onChange={event =>
                              setPayments(current =>
                                current.map(row =>
                                  row.paymentUuid === payment.paymentUuid ? { ...row, selected: event.target.checked } : row
                                )
                              )
                            }
                          />
                        }
                        label={`${payment.method || 'Pago'} · disponible ${formatEinvoiceMoney(payment.available, currency)}`}
                      />
                      {payment.selected ? (
                        <TextField
                          type='number'
                          label='Monto a aplicar'
                          value={payment.amount}
                          onChange={event =>
                            setPayments(current =>
                              current.map(row =>
                                row.paymentUuid === payment.paymentUuid ? { ...row, amount: event.target.value } : row
                              )
                            )
                          }
                        />
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {billing?.invoices.length ? (
              <Alert severity='info' className='mbe-6'>
                Esta reserva ya tiene {billing.invoices.length} comprobante(s).
              </Alert>
            ) : null}

            <div className='flex flex-col gap-3'>
              <Button
                variant='outlined'
                disabled={saving || (Boolean(reservationUuid) && items.length === 0)}
                onClick={() => void submit(true)}
              >
                Guardar borrador
              </Button>
              <Button
                variant='contained'
                disabled={saving || (Boolean(reservationUuid) && items.length === 0)}
                onClick={() => void submit(false)}
              >
                {saving ? <CircularProgress size={20} color='inherit' /> : 'Emitir comprobante'}
              </Button>
            </div>
          </Grid>
        </Grid>
      )}
    </div>
  )
}

export default IssueInvoicePage
