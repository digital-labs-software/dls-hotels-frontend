'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import OutlinedInput from '@mui/material/OutlinedInput'
import Select from '@mui/material/Select'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import type { Company } from '@/types/apps/clientsTypes'
import type { PaymentMethod, RackRoom, WalkInGuest } from '@/types/apps/frontDeskTypes'
import { addDays, nightsBetween, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/types/apps/frontDeskTypes'
import type { Rate } from '@/types/apps/rateTypes'
import { formatRateDate, pickRateForDate, rateEndsDuringStay, ratesValidOn } from '@/types/apps/rateTypes'
import type { RoomType } from '@/types/apps/roomTypeTypes'
import { capacityLabel } from '@/types/apps/roomTypeTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import DateField from '@/components/date-picker/DateField'
import { CASH_REQUIRED_MESSAGE, useCashSessionOpen } from '@/hooks/useCashSessionOpen'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'
import { listRoomRates } from '@/libs/ratesApi'
import { listRoomTypes } from '@/libs/roomTypesApi'
import CompanyPicker from '@views/apps/reservations/CompanyPicker'
import CreateCompanyDialog from '@views/apps/reservations/CreateCompanyDialog'
import PayerKindToggle, { type PayerKind } from './PayerKindToggle'
import WalkInPersonFields, {
  emptyWalkInPerson,
  type WalkInPersonDraft
} from './WalkInPersonFields'

const toWalkInGuest = (person: WalkInPersonDraft): WalkInGuest => {
  if (person.guestId) {
    return { guestId: person.guestId }
  }

  if (person.documentNumber.trim()) {
    return {
      documentType: person.documentType || 'DNI',
      documentNumber: person.documentNumber.trim(),
      firstName: person.firstName.trim(),
      lastName: person.lastName.trim(),
      phone: person.phone.trim() || null,
      email: person.email.trim() || null
    }
  }

  return {
    firstName: person.firstName.trim(),
    lastName: person.lastName.trim()
  }
}

const cleanSolesInput = (raw: string) => {
  const normalized = raw.replace(',', '.').replace(/[^\d.]/g, '')
  const dot = normalized.indexOf('.')
  const whole = (dot === -1 ? normalized : normalized.slice(0, dot)).replace(/^0+(?=\d)/, '')
  const decimals = dot === -1 ? '' : normalized.slice(dot + 1).replace(/\./g, '').slice(0, 2)

  if (dot === -1) return whole

  return `${whole || '0'}.${decimals}`
}

const selectIfZero = (event: { target: { value: string; select: () => void } }) => {
  if (Number(event.target.value) === 0) event.target.select()
}

type Props = {
  open: boolean
  propertyId: number
  room: RackRoom | null
  date: string
  onClose: () => void
  onSuccess: () => void
}

const WalkInDialog = ({ open, propertyId, room, date, onClose, onSuccess }: Props) => {
  const cashOpen = useCashSessionOpen(propertyId, open)
  const [step, setStep] = useState(0)
  const [checkoutError, setCheckoutError] = useState('')
  const [priceError, setPriceError] = useState('')
  const [holderError, setHolderError] = useState('')
  const [titularError, setTitularError] = useState('')
  const [payerKind, setPayerKind] = useState<PayerKind>('person')
  const [company, setCompany] = useState<Company | null>(null)
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false)
  const [createCompanyQuery, setCreateCompanyQuery] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [adults, setAdults] = useState('2')
  const [children, setChildren] = useState('0')
  const [pricePerNight, setPricePerNight] = useState('')
  const [rateId, setRateId] = useState<number | ''>('')
  const [holder, setHolder] = useState<WalkInPersonDraft>(emptyWalkInPerson())
  const [roomHolder, setRoomHolder] = useState<WalkInPersonDraft>(emptyWalkInPerson())
  const [companions, setCompanions] = useState<WalkInPersonDraft[]>([])
  const [discountAmount, setDiscountAmount] = useState('0')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('YAPE')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [rates, setRates] = useState<Rate[]>([])
  const [roomType, setRoomType] = useState<RoomType | null>(null)
  const [saving, setSaving] = useState(false)

  const nights = checkOutDate && date ? nightsBetween(date, checkOutDate) : 1
  const unitPrice = Number(pricePerNight || room?.effectivePrice || 0)
  const estimated = unitPrice * nights
  const discountValue = Number(discountAmount) || 0
  const discountError = discountValue > estimated ? 'El descuento no puede superar el alojamiento.' : ''
  const totalDue = Math.max(estimated - discountValue, 0)
  const advanceValue = Number(amount) || 0
  const advanceError = advanceValue > totalDue ? 'El adelanto no puede superar el total.' : ''
  const validRates = useMemo(() => ratesValidOn(rates, date), [rates, date])
  const selectedRate = validRates.find(rate => rate.id === rateId)

  useEffect(() => {
    if (!open || !room) {
      return
    }

    setStep(0)
    setCheckoutError('')
    setPriceError('')
    setHolderError('')
    setTitularError('')
    setPayerKind('person')
    setCompany(null)
    setCheckOutDate(addDays(date, 1))
    setAdults('2')
    setChildren('0')
    setPricePerNight(String(room.effectivePrice ?? ''))
    setRateId('')
    setHolder(emptyWalkInPerson())
    setRoomHolder(emptyWalkInPerson())
    setCompanions([])
    setDiscountAmount('0')
    setAmount('')
    setMethod('YAPE')
    setReference('')
    setNotes('')

    const load = async () => {
      try {
        const [ratePage, typePage] = await Promise.all([
          listRoomRates(propertyId, { roomId: room.id, limit: 100 }),
          listRoomTypes(propertyId, { limit: 100 })
        ])

        setRates(ratePage.data)
        setRoomType(typePage.data.find(type => type.id === room.roomTypeId) ?? null)

        const best = pickRateForDate(ratePage.data, date)

        if (best) {
          setRateId(best.id)
          setPricePerNight(String(best.price))
        }
      } catch {
        setRates([])
        setRoomType(null)
      }
    }

    load()
  }, [date, open, propertyId, room])

  const occupancyHint = useMemo(() => {
    if (!roomType) {
      return ''
    }

    return capacityLabel(roomType).toLowerCase()
  }, [roomType])

  const roomHeadline = room
    ? `Hab. ${room.number}${room.roomTypeName ? ` · ${room.roomTypeName}` : ''}`
    : 'Habitación'

  const priceHelper = (() => {
    if (selectedRate && Number(pricePerNight) === Number(selectedRate.price)) {
      return `Tarifa «${selectedRate.name}»`
    }

    if (room?.effectivePrice != null && Number(pricePerNight) !== Number(room.effectivePrice)) {
      return 'Precio escrito a mano'
    }

    return undefined
  })()

  const validateStep0 = () => {
    const nextCheckout =
      !checkOutDate || !date || checkOutDate <= date ? 'La salida tiene que ser después del ingreso.' : ''

    const nextPrice =
      !/^\d+(\.\d{1,2})?$/.test(pricePerNight.trim()) || Number(pricePerNight) < 0
        ? 'Indique un precio por noche válido.'
        : ''

    setCheckoutError(nextCheckout)
    setPriceError(nextPrice)

    return !nextCheckout && !nextPrice
  }

  const hasPerson = Boolean(holder.guestId)

  const validateStep1 = () => {
    if (!hasPerson && !company) {
      setHolderError('Elige una persona o una empresa.')
      setTitularError('')

      return false
    }

    if (company && (!roomHolder.guestId || !roomHolder.firstName.trim() || !roomHolder.lastName.trim())) {
      setHolderError('')
      setTitularError('Indique nombres y apellidos del titular.')

      return false
    }

    setHolderError('')
    setTitularError('')

    return true
  }

  const handleNext = () => {
    if (step === 0 && !validateStep0()) {
      return
    }

    if (step === 1 && !validateStep1()) {
      return
    }

    setStep(current => current + 1)
  }

  const handleSubmit = async () => {
    if (!room || !validateStep1()) {
      setStep(1)

      return
    }

    if (discountError || advanceError) return

    const paymentAmount = Number(amount)

    if (Number.isFinite(paymentAmount) && paymentAmount > 0 && cashOpen === false) {
      return
    }

    setSaving(true)

    try {
      const payload = {
        roomId: room.id,
        checkOutDate,
        adults: Number(adults) || 1,
        children: Number(children) || 0,
        rateId: rateId === '' ? null : Number(rateId),
        pricePerNight: Number(pricePerNight) || null,
        holder: toWalkInGuest(company ? roomHolder : holder),
        companyId: company?.id,
        companions: companions
          .filter(item => item.firstName.trim() || item.lastName.trim() || item.guestId)
          .map(toWalkInGuest),
        notes: notes.trim() || null,
        discountAmount: discountValue > 0 ? discountValue : undefined,
        payment:
          Number.isFinite(paymentAmount) && paymentAmount > 0
            ? { amount: paymentAmount, method, reference: reference.trim() || null }
            : undefined
      }

      const reservation = await frontDeskApi.walkIn(propertyId, payload)

      toast.success(`Ingreso registrado · ${reservation.code}`)
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo registrar el ingreso.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='sm' disableAutoFocus>
      <DialogTitle>
        Nuevo ingreso · {roomHeadline}
        {occupancyHint ? (
          <Typography variant='body2' color='text.secondary' component='div' className='font-normal'>
            Capacidad: {occupancyHint}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent className='flex flex-col gap-8 pt-3 pb-8'>
        <Stepper activeStep={step} alternativeLabel>
          <Step>
            <StepLabel>Estadía</StepLabel>
          </Step>
          <Step>
            <StepLabel>Huéspedes</StepLabel>
          </Step>
          <Step>
            <StepLabel>Cobro</StepLabel>
          </Step>
        </Stepper>

        {step === 0 ? (
          <div className='flex flex-col gap-4'>
            <div className='flex gap-3'>
              <DateField
                fullWidth
                label='Salida (check-out)'
                value={checkOutDate}
                minDate={date ? addDays(date, 1) : undefined}
                error={Boolean(checkoutError)}
                helperText={checkoutError || undefined}
                onChange={value => {
                  setCheckOutDate(value)
                  setCheckoutError('')
                }}
              />
              <TextField fullWidth label='Noches' value={nights} disabled />
            </div>
            <div className='flex gap-3'>
              <TextField fullWidth label='Adultos' value={adults} onChange={e => setAdults(e.target.value)} />
              <TextField fullWidth label='Niños' value={children} onChange={e => setChildren(e.target.value)} />
            </div>
            <div className='flex gap-3'>
              <TextField
                fullWidth
                label='Precio por noche'
                value={pricePerNight}
                error={Boolean(priceError)}
                onChange={e => {
                  setPricePerNight(e.target.value)
                  setPriceError('')
                }}
                helperText={priceError || priceHelper}
              />
              {validRates.length > 0 ? (
                <FormControl fullWidth>
                  <InputLabel shrink>Tarifa</InputLabel>
                  <Select
                    displayEmpty
                    input={<OutlinedInput notched label='Tarifa' />}
                    value={selectedRate ? rateId : ''}
                    onChange={e => {
                      const value = e.target.value as number | ''
                      const rate = validRates.find(item => item.id === value)

                      setRateId(rate ? rate.id : '')
                      setPricePerNight(String(rate?.price ?? room?.effectivePrice ?? ''))
                      setPriceError('')
                    }}
                  >
                    <MenuItem value=''>Precio normal</MenuItem>
                    {validRates.map(rate => (
                      <MenuItem key={rate.uuid} value={rate.id}>
                        {rate.name} · {formatRoomPrice(rate.price)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : null}
            </div>
            {selectedRate && rateEndsDuringStay(selectedRate, checkOutDate) ? (
              <Typography variant='body2' color='warning.main'>
                «{selectedRate.name}» vale hasta el {formatRateDate(selectedRate.validTo)}. La estadía sigue después, pero
                todas las noches se cobran a {formatRoomPrice(selectedRate.price)}. Si no corresponde, cambie el precio
                por noche.
              </Typography>
            ) : null}
            {rates.some(rate => rate.expired) ? (
              <Typography variant='body2' color='warning.main'>
                {rates
                  .filter(rate => rate.expired)
                  .map(rate => `«${rate.name}» venció el ${formatRateDate(rate.validTo)}`)
                  .join('. ')}
                . Actualice las fechas de esa tarifa si este ingreso debería usarla. Si no, se cobra el precio normal.
              </Typography>
            ) : null}
            <Typography variant='subtitle2' className='font-medium'>
              Total estimado · {nights} noche{nights === 1 ? '' : 's'}: {formatRoomPrice(estimated)}
            </Typography>
          </div>
        ) : null}

        {step === 1 ? (
          <div className='flex flex-col gap-4'>
            <PayerKindToggle
              value={payerKind}
              disabled={saving}
              onChange={kind => {
                setPayerKind(kind)
                setHolderError('')
                if (kind === 'person') setCompany(null)
                else setHolder(emptyWalkInPerson())
              }}
            />
            {payerKind === 'person' ? (
              <WalkInPersonFields
                propertyId={propertyId}
                person={holder}
                onChange={next => {
                  setHolderError('')
                  setHolder(next)
                }}
                title='Titular'
                disabled={saving}
                autoFocusSearch
                fieldError={Boolean(holderError) && !hasPerson}
              />
            ) : (
              <CompanyPicker
                propertyId={propertyId}
                label='Empresa'
                autoFocus
                disabled={saving}
                error={Boolean(holderError) && !company}
                selected={company}
                onSelect={next => {
                  setHolderError('')
                  setCompany(next)
                }}
                onCreate={query => {
                  setCreateCompanyQuery(query)
                  setCreateCompanyOpen(true)
                }}
              />
            )}
            {holderError ? (
              <Typography variant='caption' color='error.main'>
                {holderError}
              </Typography>
            ) : null}
            {hasPerson || company ? (
              <>
                <Divider />
                {company ? (
                  <WalkInPersonFields
                    propertyId={propertyId}
                    person={roomHolder}
                    onChange={next => {
                      setTitularError('')
                      setRoomHolder(next)
                    }}
                    title='Titular'
                    disabled={saving}
                    autoFocusSearch
                    nameError={titularError || undefined}
                  />
                ) : null}
                <div className='flex justify-end'>
                  <Button
                    size='small'
                    startIcon={<i className='ri-add-line' />}
                    onClick={() => setCompanions(prev => [...prev, emptyWalkInPerson()])}
                  >
                    Agregar acompañante
                  </Button>
                </div>
                {companions.map((companion, index) => (
                  <WalkInPersonFields
                    key={index}
                    propertyId={propertyId}
                    person={companion}
                    onChange={next => setCompanions(prev => prev.map((item, i) => (i === index ? next : item)))}
                    title={`Acompañante ${index + 1}`}
                    disabled={saving}
                    onRemove={() => setCompanions(prev => prev.filter((_, i) => i !== index))}
                  />
                ))}
              </>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className='flex flex-col gap-4'>
            <Typography variant='body2' color='text.secondary'>
              {company
                ? `${company.businessName} · ${roomHolder.firstName} ${roomHolder.lastName}`.trim()
                : `${holder.firstName} ${holder.lastName}`.trim()}{' '}
              · {nights} noche{nights === 1 ? '' : 's'}
            </Typography>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
              <TextField
                label='Alojamiento'
                value={formatRoomPrice(estimated)}
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label='Descuento'
                value={discountAmount}
                error={Boolean(discountError)}
                helperText={discountError || undefined}
                onFocus={selectIfZero}
                onMouseUp={event => {
                  if (Number(discountAmount) === 0) event.preventDefault()
                }}
                onChange={e => setDiscountAmount(cleanSolesInput(e.target.value))}
                slotProps={{ input: { startAdornment: <Typography variant='body2' className='mie-1'>S/</Typography> } }}
              />
              <TextField
                label='Total'
                value={formatRoomPrice(totalDue)}
                slotProps={{ input: { readOnly: true, sx: { fontWeight: 700 } } }}
              />
            </div>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
              <TextField
                label='Adelanto (opcional)'
                value={amount}
                error={Boolean(advanceError)}
                helperText={advanceError || undefined}
                onFocus={selectIfZero}
                onMouseUp={event => {
                  if (Number(amount) === 0) event.preventDefault()
                }}
                onChange={e => setAmount(cleanSolesInput(e.target.value))}
                slotProps={{ input: { startAdornment: <Typography variant='body2' className='mie-1'>S/</Typography> } }}
              />
              <FormControl fullWidth>
                <InputLabel>Método de pago</InputLabel>
                <Select
                  label='Método de pago'
                  value={method}
                  onChange={e => setMethod(e.target.value as PaymentMethod)}
                >
                  {PAYMENT_METHODS.map(item => (
                    <MenuItem key={item} value={item}>
                      {PAYMENT_METHOD_LABELS[item]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField label='N.º operación' value={reference} onChange={e => setReference(e.target.value)} />
            </div>
            {advanceValue > 0 && cashOpen === false ? <Alert severity='warning'>{CASH_REQUIRED_MESSAGE}</Alert> : null}
            <TextField label='Notas' value={notes} onChange={e => setNotes(e.target.value)} multiline minRows={2} />
          </div>
        ) : null}
      </DialogContent>
      <DialogActions className='flex-wrap gap-2'>
        <Button variant='outlined' color='secondary' disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        {step > 0 ? (
          <Button
            disabled={saving}
            onClick={() => setStep(current => current - 1)}
          >
            Atrás
          </Button>
        ) : null}
        {step < 2 ? (
          <Button variant='contained' disabled={saving} onClick={handleNext}>
            Siguiente
          </Button>
        ) : (
          <Button variant='contained' disabled={saving} onClick={() => void handleSubmit()}>
            {saving ? <CircularProgress size={20} color='inherit' /> : 'Registrar ingreso'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
    <CreateCompanyDialog
      open={createCompanyOpen}
      propertyId={propertyId}
      initialQuery={createCompanyQuery}
      onClose={() => setCreateCompanyOpen(false)}
      onCreated={next => {
        setCompany(next)
        setHolder(emptyWalkInPerson())
        setHolderError('')
        setCreateCompanyOpen(false)
      }}
    />
    </>
  )
}

export default WalkInDialog
