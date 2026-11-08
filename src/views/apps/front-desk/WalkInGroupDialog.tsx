'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
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
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import DateField from '@/components/date-picker/DateField'
import { CASH_REQUIRED_MESSAGE, useCashSessionOpen } from '@/hooks/useCashSessionOpen'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'
import CompanyPicker from '@views/apps/reservations/CompanyPicker'
import CreateCompanyDialog from '@views/apps/reservations/CreateCompanyDialog'
import PayerKindToggle, { type PayerKind } from './PayerKindToggle'
import WalkInPersonFields, {
  emptyWalkInPerson,
  type WalkInPersonDraft
} from './WalkInPersonFields'

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

type WalkInRoomOption = RackRoom & {
  floorId: number
  floorName: string
  floorOrder: number
}

type RoomTypeOption = {
  roomTypeId: number
  roomTypeName: string
  rooms: WalkInRoomOption[]
}

type RoomLine = {
  key: string
  roomTypeId: number | ''
  roomId: number | ''
  adults: string
  children: string
  pricePerNight: string
}

const emptyLine = (): RoomLine => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  roomTypeId: '',
  roomId: '',
  adults: '2',
  children: '0',
  pricePerNight: ''
})

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

type Props = {
  open: boolean
  propertyId: number
  date: string
  availableRooms: WalkInRoomOption[]
  onClose: () => void
  onSuccess: () => void
}

const WalkInGroupDialog = ({ open, propertyId, date, availableRooms, onClose, onSuccess }: Props) => {
  const cashOpen = useCashSessionOpen(propertyId, open)
  const [step, setStep] = useState(0)
  const [checkoutError, setCheckoutError] = useState('')
  const [roomsError, setRoomsError] = useState('')
  const [priceErrors, setPriceErrors] = useState<Record<string, string>>({})
  const [roomAttempted, setRoomAttempted] = useState(false)
  const [holderError, setHolderError] = useState('')
  const [payerKind, setPayerKind] = useState<PayerKind>('person')
  const [company, setCompany] = useState<Company | null>(null)
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false)
  const [createCompanyQuery, setCreateCompanyQuery] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [roomDrafts, setRoomDrafts] = useState<RoomLine[]>([])
  const [holder, setHolder] = useState<WalkInPersonDraft>(emptyWalkInPerson())
  const [discountAmount, setDiscountAmount] = useState('0')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('YAPE')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const nights = checkOutDate && date ? nightsBetween(date, checkOutDate) : 1
  const roomTypes = useMemo(() => {
    const groups = new Map<number, RoomTypeOption>()

    for (const room of availableRooms) {
      const current = groups.get(room.roomTypeId) ?? {
        roomTypeId: room.roomTypeId,
        roomTypeName: room.roomTypeName,
        rooms: []
      }

      current.rooms.push(room)
      groups.set(room.roomTypeId, current)
    }

    return [...groups.values()]
      .map(type => ({
        ...type,
        rooms: [...type.rooms].sort((a, b) => a.number.localeCompare(b.number, 'es', { numeric: true }))
      }))
      .sort((a, b) => a.roomTypeName.localeCompare(b.roomTypeName, 'es'))
  }, [availableRooms])
  const takenRoomIds = useMemo(
    () => new Set(roomDrafts.flatMap(line => (line.roomId === '' ? [] : [line.roomId]))),
    [roomDrafts]
  )
  const estimated = useMemo(
    () => roomDrafts.reduce((sum, item) => sum + Number(item.pricePerNight || 0) * nights, 0),
    [nights, roomDrafts]
  )
  const discountValue = Number(discountAmount) || 0
  const discountError = discountValue > estimated ? 'El descuento no puede superar el alojamiento.' : ''
  const totalDue = Math.max(estimated - discountValue, 0)
  const advanceValue = Number(amount) || 0
  const advanceError = advanceValue > totalDue ? 'El adelanto no puede superar el total.' : ''

  useEffect(() => {
    if (!open) {
      return
    }

    setStep(0)
    setCheckoutError('')
    setRoomsError('')
    setRoomAttempted(false)
    setPriceErrors({})
    setHolderError('')
    setPayerKind('person')
    setCheckOutDate(addDays(date, 1))
    setRoomDrafts([])
    setHolder(emptyWalkInPerson())
    setCompany(null)
    setDiscountAmount('0')
    setAmount('')
    setMethod('YAPE')
    setReference('')
    setNotes('')
  }, [date, open])

  const freeRoomsFor = (line: RoomLine) => {
    const type = roomTypes.find(item => item.roomTypeId === line.roomTypeId)

    if (!type) return []

    return type.rooms.filter(room => room.id === line.roomId || !takenRoomIds.has(room.id))
  }

  const updateLine = (key: string, patch: Partial<Omit<RoomLine, 'key'>>) => {
    setRoomDrafts(prev => prev.map(line => (line.key === key ? { ...line, ...patch } : line)))
  }

  const selectType = (line: RoomLine, type: RoomTypeOption) => {
    setRoomsError('')
    updateLine(line.key, { roomTypeId: type.roomTypeId, roomId: '', pricePerNight: '' })
  }

  const selectRoom = (line: RoomLine, roomId: number) => {
    const room = availableRooms.find(item => item.id === roomId)

    setRoomsError('')
    updateLine(line.key, { roomId, pricePerNight: room ? String(room.effectivePrice ?? '') : '' })
  }

  const validateStep0 = () => {
    const assigned = roomDrafts.filter(line => line.roomId !== '')
    const nextRooms = assigned.length < 2 ? 'Agregue al menos dos habitaciones.' : ''
    const nextCheckout =
      !checkOutDate || !date || checkOutDate <= date ? 'La salida tiene que ser después del ingreso.' : ''
    const nextPrices: Record<string, string> = {}
    const incomplete = roomDrafts.some(line => line.roomTypeId === '' || line.roomId === '')

    for (const line of roomDrafts) {
      if (line.roomId === '') continue

      if (!/^\d+(\.\d{1,2})?$/.test(line.pricePerNight.trim()) || Number(line.pricePerNight) < 0) {
        nextPrices[line.key] = 'Indique un precio por noche válido.'
      }
    }

    setRoomAttempted(true)
    setRoomsError(nextRooms)
    setCheckoutError(nextCheckout)
    setPriceErrors(nextPrices)

    return !nextRooms && !incomplete && !nextCheckout && Object.keys(nextPrices).length === 0
  }

  const hasPerson = Boolean(holder.guestId)
  const payerName = company?.businessName || `${holder.firstName} ${holder.lastName}`.trim()

  const validateStep1 = () => {
    if (hasPerson || company) {
      setHolderError('')

      return true
    }

    setHolderError('Elige una persona o una empresa.')

    return false
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
    if (!validateStep1()) {
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
      const reservation = await frontDeskApi.walkIn(propertyId, {
        checkOutDate,
        ...(company ? { companyId: company.id } : { holder: toWalkInGuest(holder) }),
        discountAmount: discountValue > 0 ? discountValue : undefined,
        notes: notes.trim() || null,
        rooms: roomDrafts.flatMap(line =>
          line.roomId === ''
            ? []
            : [
                {
                  roomId: line.roomId,
                  adults: Number(line.adults) || 1,
                  children: Number(line.children) || 0,
                  pricePerNight: Number(line.pricePerNight) || null
                }
              ]
        ),
        payment:
          Number.isFinite(paymentAmount) && paymentAmount > 0
            ? { amount: paymentAmount, method, reference: reference.trim() || null }
            : undefined
      })

      toast.success(`Ingreso de grupo · ${reservation.code} · ${roomDrafts.filter(line => line.roomId !== '').length} habitaciones`)
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo registrar el ingreso de grupo.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='md' disableAutoFocus>
      <DialogTitle>Ingreso de varias habitaciones</DialogTitle>
      <DialogContent className='flex flex-col gap-8 pt-3 pb-8'>
        <Stepper activeStep={step} alternativeLabel>
          <Step>
            <StepLabel>Habitaciones</StepLabel>
          </Step>
          <Step>
            <StepLabel>Quién paga</StepLabel>
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
            {availableRooms.length === 0 ? (
              <Typography color='text.secondary'>No hay habitaciones libres para ingresar ahora.</Typography>
            ) : (
              <div className='flex flex-col gap-3'>
                {roomDrafts.map(line => {
                  const selectedType = roomTypes.find(type => type.roomTypeId === line.roomTypeId) ?? null
                  const freeRooms = freeRoomsFor(line)
                  const missingType = roomAttempted && line.roomTypeId === ''
                  const missingRoom = roomAttempted && line.roomTypeId !== '' && line.roomId === ''

                  return (
                    <div
                      key={line.key}
                      className='grid grid-cols-2 items-start gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.6fr)_72px_72px_minmax(108px,140px)_36px]'
                    >
                      <Autocomplete
                        className='col-span-2 md:col-span-1'
                        size='small'
                        options={roomTypes}
                        value={selectedType}
                        onChange={(_, type) => type && selectType(line, type)}
                        getOptionLabel={type => type.roomTypeName}
                        isOptionEqualToValue={(option, value) => option.roomTypeId === value.roomTypeId}
                        getOptionDisabled={type => type.rooms.every(room => room.id !== line.roomId && takenRoomIds.has(room.id))}
                        noOptionsText='No hay tipos con ese nombre'
                        renderOption={(props, type) => {
                          const { key, ...optionProps } = props as typeof props & { key: string }
                          const remaining = type.rooms.filter(room => room.id === line.roomId || !takenRoomIds.has(room.id)).length

                          return (
                            <li key={key} {...optionProps}>
                              <div className='flex items-center justify-between gap-6 is-full'>
                                <Typography variant='body2' className='font-medium' noWrap>
                                  {type.roomTypeName}
                                </Typography>
                                <Typography variant='caption' color='text.secondary' className='whitespace-nowrap'>
                                  {remaining === 0 ? 'Sin disponibilidad' : `${remaining} libres`}
                                </Typography>
                              </div>
                            </li>
                          )
                        }}
                        renderInput={params => (
                          <TextField
                            {...params}
                            label='Tipo de habitación'
                            placeholder='Elige el tipo'
                            error={missingType}
                            helperText={missingType ? 'Elige un tipo de habitación.' : undefined}
                          />
                        )}
                      />
                      <FormControl
                        size='small'
                        fullWidth
                        className='col-span-2 md:col-span-1'
                        disabled={!selectedType}
                        error={missingRoom}
                      >
                        <InputLabel id={`room-${line.key}`}>Habitación</InputLabel>
                        <Select
                          labelId={`room-${line.key}`}
                          label='Habitación'
                          value={line.roomId === '' ? '' : line.roomId}
                          onChange={event => selectRoom(line, Number(event.target.value))}
                        >
                          {freeRooms.map(room => (
                            <MenuItem key={room.id} value={room.id}>
                              {room.number} · {room.floorName} · {formatRoomPrice(room.effectivePrice)}
                              {room.displayStatus === 'CLEANING' ? ' · Limpieza' : ''}
                            </MenuItem>
                          ))}
                        </Select>
                        {missingRoom ? (
                          <Typography variant='caption' color='error.main' className='mts-1 mis-3'>
                            Elige una habitación.
                          </Typography>
                        ) : null}
                      </FormControl>
                      <TextField
                        size='small'
                        label='Adultos'
                        value={line.adults}
                        onChange={event => updateLine(line.key, { adults: event.target.value })}
                      />
                      <TextField
                        size='small'
                        label='Niños'
                        value={line.children}
                        onChange={event => updateLine(line.key, { children: event.target.value })}
                      />
                      <TextField
                        size='small'
                        label='Precio/noche'
                        value={line.pricePerNight}
                        disabled={line.roomId === ''}
                        error={Boolean(priceErrors[line.key])}
                        helperText={priceErrors[line.key] || undefined}
                        onChange={event => {
                          updateLine(line.key, { pricePerNight: cleanSolesInput(event.target.value) })
                          setPriceErrors(prev => ({ ...prev, [line.key]: '' }))
                        }}
                        slotProps={{
                          input: { startAdornment: <InputAdornment position='start'>S/</InputAdornment> }
                        }}
                      />
                      <div className='flex min-bs-[40px] items-center justify-end'>
                        <IconButton
                          size='small'
                          aria-label='Quitar esta habitación'
                          onClick={() => setRoomDrafts(prev => prev.filter(item => item.key !== line.key))}
                        >
                          <i className='ri-delete-bin-line' />
                        </IconButton>
                      </div>
                    </div>
                  )
                })}
                <div>
                  <Button
                    size='small'
                    variant='text'
                    startIcon={<i className='ri-add-line' />}
                    onClick={() => {
                      setRoomsError('')
                      setRoomDrafts(prev => [...prev, emptyLine()])
                    }}
                  >
                    Agregar habitación
                  </Button>
                </div>
                {roomsError ? (
                  <Typography variant='caption' color='error.main'>
                    {roomsError}
                  </Typography>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {step === 1 ? (
          <div className='flex flex-col gap-6'>
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
                title='Persona'
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
          </div>
        ) : null}

        {step === 2 ? (
          <div className='flex flex-col gap-4'>
            <Typography variant='body2' color='text.secondary'>
              {roomDrafts
                .flatMap(line => {
                  const room = availableRooms.find(item => item.id === line.roomId)

                  return room ? [room.number] : []
                })
                .join(', ')}{' '}
              · {nights} noche{nights === 1 ? '' : 's'} · {payerName}
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
                <Select label='Método de pago' value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
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
      <CreateCompanyDialog
        open={createCompanyOpen}
        propertyId={propertyId}
        initialQuery={createCompanyQuery}
        onClose={() => setCreateCompanyOpen(false)}
        onCreated={next => {
          setCompany(next)
          setHolder(emptyWalkInPerson())
          setHolderError('')
        }}
      />
    </Dialog>
  )
}

export default WalkInGroupDialog
