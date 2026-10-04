'use client'

import { useEffect, useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import type { Guest } from '@/types/apps/clientsTypes'
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from '@/types/apps/clientsTypes'
import type { PaymentMethod, RackRoom, WalkInGuest } from '@/types/apps/frontDeskTypes'
import { addDays, nightsBetween, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/types/apps/frontDeskTypes'
import type { Rate } from '@/types/apps/rateTypes'
import type { RoomType } from '@/types/apps/roomTypeTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import GuestPicker from './GuestPicker'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'
import { listRates } from '@/libs/ratesApi'
import { listRoomTypes } from '@/libs/roomTypesApi'

type PersonDraft = {
  guestId?: number
  locked?: boolean
  documentType: string
  documentNumber: string
  firstName: string
  lastName: string
  phone: string
  email: string
}

const emptyPerson = (): PersonDraft => ({
  documentType: 'DNI',
  documentNumber: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: ''
})

const fromGuest = (guest: Guest): PersonDraft => ({
  guestId: guest.id,
  locked: true,
  documentType: guest.person.documentType || 'DNI',
  documentNumber: guest.person.documentNumber || '',
  firstName: guest.person.firstName,
  lastName: guest.person.lastName,
  phone: guest.person.phone || '',
  email: guest.person.email || ''
})

const toWalkInGuest = (person: PersonDraft): WalkInGuest => {
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
  room: RackRoom | null
  date: string
  onClose: () => void
  onSuccess: () => void
}

const WalkInDialog = ({ open, propertyId, room, date, onClose, onSuccess }: Props) => {
  const [checkOutDate, setCheckOutDate] = useState('')
  const [adults, setAdults] = useState('2')
  const [children, setChildren] = useState('0')
  const [pricePerNight, setPricePerNight] = useState('')
  const [rateId, setRateId] = useState<number | ''>('')
  const [holder, setHolder] = useState<PersonDraft>(emptyPerson())
  const [companions, setCompanions] = useState<PersonDraft[]>([])
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

  useEffect(() => {
    if (!open || !room) {
      return
    }

    setCheckOutDate(addDays(date, 1))
    setAdults('2')
    setChildren('0')
    setPricePerNight(String(room.effectivePrice ?? ''))
    setRateId('')
    setHolder(emptyPerson())
    setCompanions([])
    setAmount('')
    setMethod('YAPE')
    setReference('')
    setNotes('')

    const load = async () => {
      try {
        const [ratePage, typePage] = await Promise.all([
          listRates(propertyId, { roomTypeId: room.roomTypeId, isActive: true, limit: 100 }),
          listRoomTypes(propertyId, { limit: 100 })
        ])

        setRates(ratePage.data)
        setRoomType(typePage.data.find(type => type.id === room.roomTypeId) ?? null)
      } catch {
        setRates([])
        setRoomType(null)
      }
    }

    load()
  }, [date, open, propertyId, room])

  const personFields = (
    person: PersonDraft,
    onChange: (next: PersonDraft) => void,
    title: string,
    onRemove?: () => void
  ) => (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between'>
        <Typography className='font-medium'>{title}</Typography>
        {onRemove ? (
          <IconButton size='small' onClick={onRemove}>
            <i className='ri-delete-bin-7-line' />
          </IconButton>
        ) : null}
      </div>
      <GuestPicker
        propertyId={propertyId}
        disabled={saving}
        onSelect={guest => onChange(guest ? fromGuest(guest) : { ...emptyPerson() })}
      />
      <div className='flex gap-3'>
        <FormControl fullWidth>
          <InputLabel>Documento</InputLabel>
          <Select
            label='Documento'
            value={person.documentType}
            disabled={person.locked || saving}
            onChange={e => onChange({ ...person, documentType: e.target.value })}
          >
            {DOCUMENT_TYPES.map(type => (
              <MenuItem key={type} value={type}>
                {DOCUMENT_TYPE_LABELS[type]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          label='Número'
          value={person.documentNumber}
          disabled={person.locked || saving}
          onChange={e => onChange({ ...person, documentNumber: e.target.value })}
        />
      </div>
      <div className='flex gap-3'>
        <TextField
          fullWidth
          label='Nombres'
          value={person.firstName}
          disabled={person.locked || saving}
          onChange={e => onChange({ ...person, firstName: e.target.value })}
        />
        <TextField
          fullWidth
          label='Apellidos'
          value={person.lastName}
          disabled={person.locked || saving}
          onChange={e => onChange({ ...person, lastName: e.target.value })}
        />
      </div>
      <div className='flex gap-3'>
        <TextField
          fullWidth
          label='Teléfono'
          value={person.phone}
          disabled={person.locked || saving}
          onChange={e => onChange({ ...person, phone: e.target.value })}
        />
        <TextField
          fullWidth
          label='Correo'
          value={person.email}
          disabled={person.locked || saving}
          onChange={e => onChange({ ...person, email: e.target.value })}
        />
      </div>
    </div>
  )

  const handleSubmit = async () => {
    if (!room) {
      return
    }

    if (!holder.firstName.trim() || !holder.lastName.trim()) {
      toast.error('El titular necesita nombres y apellidos.')

      return
    }

    setSaving(true)

    try {
      const paymentAmount = Number(amount)
      const payload = {
        roomId: room.id,
        checkOutDate,
        adults: Number(adults) || 1,
        children: Number(children) || 0,
        rateId: rateId === '' ? null : Number(rateId),
        pricePerNight: Number(pricePerNight) || null,
        holder: toWalkInGuest(holder),
        companions: companions
          .filter(item => item.firstName.trim() || item.lastName.trim() || item.guestId)
          .map(toWalkInGuest),
        notes: notes.trim() || null,
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

  const occupancyHint = useMemo(() => {
    if (!roomType) {
      return ''
    }

    return `máx. ${roomType.maxAdults} adultos, ${roomType.maxChildren} niños`
  }, [roomType])

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth='sm'>
      <DialogTitle>Nuevo ingreso</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-3'>
        <Typography>
          Habitación {room?.number} · {room?.roomTypeName} · {formatRoomPrice(room?.effectivePrice)}/noche
          {occupancyHint ? ` (${occupancyHint})` : ''}
        </Typography>
        <div className='flex gap-3'>
          <TextField
            fullWidth
            type='date'
            label='Salida'
            value={checkOutDate}
            onChange={e => setCheckOutDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField fullWidth label='Noches' value={nights} disabled />
        </div>
        <Typography variant='body2'>Total estimado: {formatRoomPrice(estimated)}</Typography>
        <div className='flex gap-3'>
          <TextField fullWidth label='Adultos' value={adults} onChange={e => setAdults(e.target.value)} />
          <TextField fullWidth label='Niños' value={children} onChange={e => setChildren(e.target.value)} />
        </div>
        <div className='flex gap-3'>
          <TextField
            fullWidth
            label='Precio por noche'
            value={pricePerNight}
            onChange={e => setPricePerNight(e.target.value)}
          />
          <FormControl fullWidth>
            <InputLabel>Tarifa</InputLabel>
            <Select
              label='Tarifa'
              value={rateId}
              onChange={e => {
                const next = Number(e.target.value)

                setRateId(Number.isFinite(next) ? next : '')
              }}
            >
              <MenuItem value=''>Sin tarifa</MenuItem>
              {rates.map(rate => (
                <MenuItem key={rate.uuid} value={rate.id}>
                  {rate.name} · {formatRoomPrice(rate.price)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <Divider />
        {personFields(holder, setHolder, 'Titular')}
        <Divider />
        <div className='flex items-center justify-between'>
          <Typography className='font-medium'>Acompañantes</Typography>
          <Button size='small' startIcon={<i className='ri-add-line' />} onClick={() => setCompanions(prev => [...prev, emptyPerson()])}>
            Agregar acompañante
          </Button>
        </div>
        {companions.map((companion, index) => (
          <div key={index}>
            {personFields(
              companion,
              next => setCompanions(prev => prev.map((item, i) => (i === index ? next : item))),
              `Acompañante ${index + 1}`,
              () => setCompanions(prev => prev.filter((_, i) => i !== index))
            )}
          </div>
        ))}
        <Divider />
        <Typography className='font-medium'>Adelanto (opcional)</Typography>
        <div className='flex gap-3'>
          <TextField fullWidth label='Monto' value={amount} onChange={e => setAmount(e.target.value)} />
          <FormControl fullWidth>
            <InputLabel>Método</InputLabel>
            <Select label='Método' value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map(item => (
                <MenuItem key={item} value={item}>
                  {PAYMENT_METHOD_LABELS[item]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <TextField label='N.º operación' value={reference} onChange={e => setReference(e.target.value)} />
        <TextField label='Notas' value={notes} onChange={e => setNotes(e.target.value)} multiline minRows={2} />
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant='contained' disabled={saving} onClick={handleSubmit}>
          {saving ? <CircularProgress size={20} color='inherit' /> : 'Registrar ingreso'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default WalkInDialog
