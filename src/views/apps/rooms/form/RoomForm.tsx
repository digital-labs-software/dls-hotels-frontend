'use client'

import { useEffect, useRef, useState } from 'react'

import { useParams, useRouter, useSearchParams } from 'next/navigation'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { Controller, useForm, useWatch } from 'react-hook-form'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { Locale } from '@configs/i18n'
import type { Floor } from '@/types/apps/floorTypes'
import type { RoomType } from '@/types/apps/roomTypeTypes'
import type { RoomDisplayStatus, RoomStatus } from '@/types/apps/roomsTypes'
import { formatRoomPrice, MANUAL_ROOM_STATUSES, ROOM_STATUS_LABELS } from '@/types/apps/roomsTypes'
import { listFloors } from '@/libs/floorsApi'
import { listRates } from '@/libs/ratesApi'
import { listRoomTypes } from '@/libs/roomTypesApi'
import type { HotelRate } from '@/types/apps/rateTypes'
import { formatRateDate } from '@/types/apps/rateTypes'
import { createRoom, getRoom, getRoomsApiErrorMessage, updateRoom } from '@/libs/roomsApi'
import { getUploadsApiErrorMessage, uploadRoomPhoto } from '@/libs/uploadsApi'
import { getLocalizedUrl } from '@/utils/i18n'
import { scrollToFirstInvalid } from '@/utils/scrollToFirstInvalid'
import RoomPhotoField from './RoomPhotoField'

type FormValues = {
  number: string
  floorId: number | ''
  roomTypeId: number | ''
  status: RoomStatus
  priceOverride: string
  notes: string
}

type Props = {
  uuid?: string
}

const parseRatePrice = (value: string) => {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return undefined
  }

  return Number(trimmed)
}

const RoomForm = ({ uuid }: Props) => {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const { data: session, status: sessionStatus } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const isView = searchParams.get('mode') === 'view'
  const isEdit = Boolean(uuid) && !isView

  const [loading, setLoading] = useState(true)
  const [floors, setFloors] = useState<Floor[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [effectivePrice, setEffectivePrice] = useState<number | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [displayStatus, setDisplayStatus] = useState<RoomDisplayStatus>('AVAILABLE')
  const [hotelRates, setHotelRates] = useState<HotelRate[]>([])
  const [rateAmounts, setRateAmounts] = useState<Record<number, string>>({})
  const [rateOn, setRateOn] = useState<Record<number, boolean>>({})
  const [rateErrors, setRateErrors] = useState<Record<number, string>>({})

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      number: '',
      floorId: '',
      roomTypeId: '',
      status: 'AVAILABLE',
      priceOverride: '',
      notes: ''
    }
  })

  const roomTypeId = useWatch({ control, name: 'roomTypeId' })
  const status = useWatch({ control, name: 'status' })
  const statusOptions: RoomStatus[] = status === 'OCCUPIED' ? ['OCCUPIED'] : [...MANUAL_ROOM_STATUSES]
  const statusLocked = isView || status === 'OCCUPIED' || displayStatus === 'MAINTENANCE'
  const selectableTypes = roomTypes.filter(type => type.isActive || type.id === Number(roomTypeId))

  useEffect(() => {
    if (sessionStatus === 'loading') {
      return
    }

    const load = async () => {
      try {
        const [floorsRes, typesRes, ratesRes] = await Promise.all([
          listFloors(propertyId, { limit: 100 }),
          listRoomTypes(propertyId, { limit: 100 }),
          listRates(propertyId, { limit: 100 })
        ])

        setFloors(floorsRes.data)
        setRoomTypes(typesRes.data)
        setHotelRates(ratesRes.data)

        if (!uuid) {
          const activeTypes = typesRes.data.filter(type => type.isActive)

          reset({
            number: '',
            floorId: floorsRes.data.length === 1 ? floorsRes.data[0].id : '',
            roomTypeId: activeTypes.length === 1 ? activeTypes[0].id : '',
            status: 'AVAILABLE',
            priceOverride: '',
            notes: ''
          })

          return
        }

        const room = await getRoom(propertyId, uuid)

        setEffectivePrice(room.effectivePrice)
        setPhotoUrl(room.photoUrl ?? null)
        setPendingPhoto(null)
        setRemovePhoto(false)
        setDisplayStatus(room.displayStatus)
        reset({
          number: room.number,
          floorId: room.floorId,
          roomTypeId: room.roomTypeId,
          status: room.status,
          priceOverride: room.priceOverride == null ? '' : String(room.priceOverride),
          notes: room.notes ?? ''
        })

        const preset: Record<number, string> = {}

        const enabled: Record<number, boolean> = {}

        ;(room.ratePrices ?? []).forEach(price => {
          if (price.price != null) {
            preset[price.rateId] = String(price.price)
            enabled[price.rateId] = true
          }
        })
        setRateAmounts(preset)
        setRateOn(enabled)
      } catch (error) {
        toast.error(getRoomsApiErrorMessage(error, 'No se encontró la habitación solicitada.'))
        router.replace(getLocalizedUrl('/apps/rooms', locale as Locale))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [locale, propertyId, reset, router, sessionStatus, uuid])

  const changeRateAmount = (rateId: number, raw: string) => {
    const normalized = raw.replace(',', '.').trim()

    if (normalized.includes('-')) {
      setRateErrors(current => ({ ...current, [rateId]: 'El precio no puede ser negativo.' }))
      setRateAmounts(current => ({ ...current, [rateId]: normalized.replace(/-/g, '') }))

      return
    }

    if (normalized !== '' && !/^\d*\.?\d{0,2}$/.test(normalized)) {
      return
    }

    setRateErrors(current => {
      if (!current[rateId]) {
        return current
      }

      const next = { ...current }

      delete next[rateId]

      return next
    })
    setRateAmounts(current => ({ ...current, [rateId]: normalized }))
  }

  const toggleRate = (rateId: number, on: boolean) => {
    setRateOn(current => ({ ...current, [rateId]: on }))
    setRateErrors(current => {
      if (!current[rateId]) {
        return current
      }

      const next = { ...current }

      delete next[rateId]

      return next
    })
  }

  const goBack = () => {
    router.push(getLocalizedUrl('/apps/rooms', locale as Locale))
  }

  const onSubmit = async (data: FormValues) => {
    if (isView) {
      return
    }

    if (data.floorId === '' || data.roomTypeId === '') {
      toast.error('Selecciona piso y tipo de habitación.')
      scrollToFirstInvalid(formRef.current)

      return
    }

    const priceOverride = Number(data.priceOverride)
    const ratePrices: { rateId: number; price: number | null }[] = []
    const nextRateErrors: Record<number, string> = {}

    for (const rate of hotelRates) {
      if (!rate.isActive || rate.expired) {
        continue
      }

      if (!rateOn[rate.id]) {
        ratePrices.push({ rateId: rate.id, price: null })
        continue
      }

      const parsed = parseRatePrice(rateAmounts[rate.id] ?? '')

      if (parsed === undefined) {
        nextRateErrors[rate.id] = 'Escriba un precio en soles, sin signo menos.'
      } else if (parsed === null) {
        nextRateErrors[rate.id] = 'Escriba el precio.'
      } else {
        ratePrices.push({ rateId: rate.id, price: parsed })
      }
    }

    if (Object.keys(nextRateErrors).length) {
      setRateErrors(nextRateErrors)
      scrollToFirstInvalid(formRef.current)

      return
    }

    const savePhoto = async (roomUuid: string) => {
      if (pendingPhoto) {
        const secureUrl = await uploadRoomPhoto(propertyId, roomUuid, pendingPhoto)

        return updateRoom(propertyId, roomUuid, { photoUrl: secureUrl })
      }

      if (removePhoto) {
        return updateRoom(propertyId, roomUuid, { photoUrl: null })
      }

      return null
    }

    try {
      if (isEdit && uuid) {
        await updateRoom(propertyId, uuid, {
          floorId: Number(data.floorId),
          roomTypeId: Number(data.roomTypeId),
          number: data.number.trim(),
          status: data.status,
          priceOverride,
          notes: data.notes.trim() ? data.notes.trim() : null,
          ratePrices
        })

        try {
          await savePhoto(uuid)
        } catch (error) {
          toast.error(getUploadsApiErrorMessage(error, 'No se pudo subir la foto.'))
          toast.success('Habitación actualizada. La foto no se guardó.')
          goBack()

          return
        }

        toast.success('Habitación actualizada.')
      } else {
        const created = await createRoom(propertyId, {
          floorId: Number(data.floorId),
          roomTypeId: Number(data.roomTypeId),
          number: data.number.trim(),
          status: data.status,
          priceOverride,
          notes: data.notes.trim() ? data.notes.trim() : null,
          ratePrices
        })

        const createdMessage = created.restored
          ? 'Esta habitación estaba eliminada. Se recuperó con los datos que acaba de guardar.'
          : 'Habitación creada.'

        if (pendingPhoto) {
          try {
            await savePhoto(created.uuid)
          } catch (error) {
            toast.success(createdMessage)
            toast.error(getUploadsApiErrorMessage(error, 'No se pudo subir la foto. Puedes cargarla al editar.'))
            router.push(getLocalizedUrl(`/apps/rooms/edit/${created.uuid}`, locale as Locale))

            return
          }
        }

        toast.success(createdMessage)
      }

      goBack()
    } catch (error) {
      toast.error(getRoomsApiErrorMessage(error, 'No se pudo guardar la habitación.'))
    }
  }

  const title = isView ? 'Ver habitación' : isEdit ? 'Editar habitación' : 'Nueva habitación'
  const usableRates = hotelRates.filter(rate => rate.isActive && !rate.expired)
  const pastRates = hotelRates.filter(rate => rate.expired)
  const pausedRates = hotelRates.filter(rate => !rate.isActive && !rate.expired)

  const actions = (
    <div className='flex flex-wrap justify-end gap-4 border-bs px-6 py-5'>
      <Button variant='outlined' color='secondary' type='button' onClick={goBack}>
        Volver
      </Button>
      {!isView ? (
        <Button variant='contained' type='submit' disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={20} color='inherit' /> : isEdit ? 'Guardar' : 'Guardar habitación'}
        </Button>
      ) : null}
    </div>
  )

  if (loading) {
    return (
      <div className='flex justify-center items-center p-10'>
        <CircularProgress size={32} />
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit, () => scrollToFirstInvalid(formRef.current))}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Typography variant='h4'>{title}</Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card className='bs-full'>
            <CardHeader title='Clasificación' />
            <CardContent className='flex flex-col gap-5'>
              <FormControl fullWidth error={Boolean(errors.floorId)}>
                <InputLabel id='room-floor' shrink>
                  Piso
                </InputLabel>
                <Controller
                  name='floorId'
                  control={control}
                  rules={{ required: 'El piso es obligatorio.' }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      autoFocus={!uuid && !isView}
                      displayEmpty
                      label='Piso'
                      labelId='room-floor'
                      disabled={isView || isSubmitting}
                      renderValue={selected => {
                        if (selected === '') {
                          return (
                            <Typography component='span' color='text.disabled'>
                              Elige el piso
                            </Typography>
                          )
                        }

                        return floors.find(floor => floor.id === selected)?.name ?? ''
                      }}
                    >
                      <MenuItem value='' disabled>
                        Elige el piso
                      </MenuItem>
                      {floors.map(floor => (
                        <MenuItem key={floor.uuid} value={floor.id}>
                          {floor.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                {errors.floorId?.message ? (
                  <FormHelperText>{errors.floorId.message}</FormHelperText>
                ) : floors.length === 0 ? (
                  <FormHelperText sx={{ color: 'warning.main' }}>
                    Primero cree un piso en la pestaña «Pisos».
                  </FormHelperText>
                ) : null}
              </FormControl>

              <FormControl fullWidth error={Boolean(errors.roomTypeId)}>
                <InputLabel id='room-type' shrink>
                  Tipo de habitación
                </InputLabel>
                <Controller
                  name='roomTypeId'
                  control={control}
                  rules={{ required: 'El tipo de habitación es obligatorio.' }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      displayEmpty
                      label='Tipo de habitación'
                      labelId='room-type'
                      disabled={isView || isSubmitting}
                      renderValue={selected => {
                        if (selected === '') {
                          return (
                            <Typography component='span' color='text.disabled'>
                              Elige el tipo
                            </Typography>
                          )
                        }

                        return selectableTypes.find(type => type.id === selected)?.name ?? ''
                      }}
                    >
                      <MenuItem value='' disabled>
                        Elige el tipo
                      </MenuItem>
                      {selectableTypes.map(type => (
                        <MenuItem key={type.uuid} value={type.id}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                {errors.roomTypeId?.message ? (
                  <FormHelperText>{errors.roomTypeId.message}</FormHelperText>
                ) : selectableTypes.length === 0 ? (
                  <FormHelperText sx={{ color: 'warning.main' }}>
                    Primero cree un tipo en la pestaña «Tipos de habitación».
                  </FormHelperText>
                ) : null}
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id='room-status'>Estado</InputLabel>
                <Controller
                  name='status'
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select {...field} label='Estado' labelId='room-status' disabled={statusLocked || isSubmitting}>
                      {statusOptions.map(item => (
                        <MenuItem key={item} value={item}>
                          {ROOM_STATUS_LABELS[item]}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                {displayStatus === 'MAINTENANCE' ? (
                  <FormHelperText>
                    Esta noche está en mantenimiento. Las fechas se cambian desde la lista de habitaciones.
                  </FormHelperText>
                ) : status === 'OCCUPIED' ? (
                  <FormHelperText>Ocupada la asigna el ingreso del huésped.</FormHelperText>
                ) : null}
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card className='bs-full'>
            <CardHeader title='Información de la habitación' />
            <CardContent className='flex flex-col gap-5'>
              <Controller
                name='number'
                control={control}
                rules={{
                  required: 'El número es obligatorio.',
                  maxLength: { value: 20, message: 'Máximo 20 caracteres.' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label='Número'
                    placeholder='101'
                    disabled={isView || isSubmitting}
                    error={Boolean(errors.number)}
                    helperText={errors.number?.message}
                  />
                )}
              />

              <Controller
                name='priceOverride'
                control={control}
                rules={{
                  required: 'El precio normal es obligatorio.',
                  validate: value => {
                    if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) {
                      return 'Usa un número con máximo 2 decimales.'
                    }

                    return Number(value) >= 0 || 'El precio no puede ser negativo.'
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label='Precio normal (S/ por noche)'
                    placeholder='80'
                    disabled={isView || isSubmitting}
                    helperText={errors.priceOverride?.message || 'Es el precio de esta habitación cuando no hay tarifa.'}
                    {...(errors.priceOverride && { error: true })}
                  />
                )}
              />

              {isView && effectivePrice != null ? (
                <TextField fullWidth label='Precio efectivo' value={formatRoomPrice(effectivePrice)} disabled />
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader
              title='Tarifas de esta habitación'
              subheader='Apagado: precio normal. Enciéndalo para escribir el precio de esa tarifa.'
            />
            {hotelRates.length === 0 ? (
              <CardContent>
                <Typography color='text.secondary'>
                  Todavía no hay tarifas. Puede crearlas en la pestaña Tarifas y volver a poner el precio aquí.
                </Typography>
              </CardContent>
            ) : (
              <>
                {usableRates.length ? (
                  <div className='hidden sm:grid sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(260px,320px)] sm:gap-4 sm:items-center px-6 py-2 border-bs'>
                    <Typography variant='body2' color='text.secondary'>
                      Tarifa
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Fechas
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Precio
                    </Typography>
                  </div>
                ) : null}
                {usableRates.map(rate => {
                  const on = Boolean(rateOn[rate.id])
                  const amount = rateAmounts[rate.id] ?? ''
                  const error = rateErrors[rate.id]
                  const dates = `${formatRateDate(rate.validFrom)} – ${formatRateDate(rate.validTo)}`

                  return (
                    <div
                      key={rate.uuid}
                      className='grid grid-cols-1 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(260px,320px)] gap-2 sm:gap-4 items-center px-6 py-3 border-bs'
                    >
                      <Typography color='text.primary' className='font-medium'>
                        {rate.name}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {dates}
                      </Typography>
                      <div className='flex items-center gap-2'>
                        <Switch
                          checked={on}
                          onChange={(_, checked) => toggleRate(rate.id, checked)}
                          disabled={isView || isSubmitting}
                          slotProps={{ input: { 'aria-label': `Poner otro precio en ${rate.name}` } }}
                        />
                        {on && !isView ? (
                          <TextField
                            size='small'
                            fullWidth
                            value={amount}
                            onChange={event => changeRateAmount(rate.id, event.target.value)}
                            disabled={isSubmitting}
                            error={Boolean(error)}
                            helperText={error || undefined}
                            slotProps={{
                              input: {
                                startAdornment: <InputAdornment position='start'>S/</InputAdornment>
                              },
                              htmlInput: { inputMode: 'decimal', 'aria-label': `Precio de ${rate.name}` }
                            }}
                          />
                        ) : (
                          <Chip
                            variant='tonal'
                            size='small'
                            color={on ? 'primary' : 'secondary'}
                            label={on ? formatRoomPrice(Number(amount)) : 'Precio normal'}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
                {pastRates.length ? (
                  <div className='flex flex-col gap-3 px-6 py-4 border-bs'>
                    <Typography className='font-medium' color='text.primary'>
                      Ya pasaron
                    </Typography>
                    {pastRates.map(rate => {
                      const amount = rateAmounts[rate.id] ?? ''

                      return (
                        <div key={rate.uuid}>
                          <Typography color='text.primary'>{rate.name}</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {formatRateDate(rate.validFrom)} – {formatRateDate(rate.validTo)}.
                            {amount ? ` Quedó en ${formatRoomPrice(Number(amount))}.` : ''} Ya no se cobra.
                          </Typography>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
                {pausedRates.length ? (
                  <div className='flex flex-col gap-3 px-6 py-4 border-bs'>
                    <Typography className='font-medium' color='text.primary'>
                      Apagadas en el hotel
                    </Typography>
                    {pausedRates.map(rate => {
                      const amount = rateAmounts[rate.id] ?? ''

                      return (
                        <div key={rate.uuid}>
                          <Typography color='text.primary'>{rate.name}</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {formatRateDate(rate.validFrom)} – {formatRateDate(rate.validTo)}. Apagada para todo el
                            hotel.
                            {amount ? ` Tiene ${formatRoomPrice(Number(amount))}, pero no se cobra.` : ' No se cobra.'}
                          </Typography>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title='Foto y notas' />
            <CardContent>
              <Grid container spacing={5}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <RoomPhotoField
                    photoUrl={removePhoto ? null : photoUrl}
                    disabled={isView || isSubmitting}
                    onFileChange={file => {
                      setPendingPhoto(file)
                      setRemovePhoto(false)
                    }}
                    onRemove={() => {
                      setPendingPhoto(null)
                      setRemovePhoto(true)
                      setPhotoUrl(null)
                    }}
                    onInvalidFile={message => toast.error(message)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }} className='flex flex-col gap-3'>
                  <Typography variant='body2' color='text.secondary'>
                    Notas de la habitación
                  </Typography>
                  <Controller
                    name='notes'
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        multiline
                        minRows={6}
                        placeholder='Vista al mar, balcón privado.'
                        disabled={isView || isSubmitting}
                        slotProps={{ htmlInput: { 'aria-label': 'Notas de la habitación' } }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
            {actions}
          </Card>
        </Grid>
      </Grid>
    </form>
  )
}

export default RoomForm
