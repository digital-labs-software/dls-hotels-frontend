'use client'

import { useEffect, useState } from 'react'

import { useParams, useRouter, useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { Controller, useForm, useWatch } from 'react-hook-form'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { Locale } from '@configs/i18n'
import DateField from '@/components/date-picker/DateField'
import { createSeason, getRatesApiErrorMessage, getSeason, updateSeason } from '@/libs/ratesApi'
import { listRoomTypes } from '@/libs/roomTypesApi'
import type { RoomType } from '@/types/apps/roomTypeTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { getLocalizedUrl } from '@/utils/i18n'

type FormValues = {
  name: string
  validFrom: string
  validTo: string
  isActive: boolean
}

type Props = {
  uuid?: string
}

const emptyValues: FormValues = {
  name: '',
  validFrom: '',
  validTo: '',
  isActive: true
}

const emptyToNull = (value: string) => {
  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

const parsePrice = (value: string) => {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return undefined
  }

  return Number(trimmed)
}

const RateForm = ({ uuid }: Props) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const { data: session, status: sessionStatus } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const isView = searchParams.get('mode') === 'view'
  const isEdit = Boolean(uuid) && !isView
  const listUrl = getLocalizedUrl('/apps/rooms?tab=rates', locale as Locale)

  const [loading, setLoading] = useState(true)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [amounts, setAmounts] = useState<Record<number, string>>({})
  const [priceErrors, setPriceErrors] = useState<Record<number, string>>({})
  const [pricesError, setPricesError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: emptyValues
  })

  const validFrom = useWatch({ control, name: 'validFrom' })

  const goBack = () => {
    router.push(listUrl)
  }

  useEffect(() => {
    if (sessionStatus === 'loading') {
      return
    }

    const load = async () => {
      setLoading(true)

      try {
        const [typesPage, season] = await Promise.all([
          listRoomTypes(propertyId, { limit: 100 }),
          uuid ? getSeason(propertyId, uuid) : Promise.resolve(null)
        ])

        setRoomTypes(typesPage.data)

        if (!season) {
          reset(emptyValues)
          setAmounts({})

          return
        }

        reset({
          name: season.name,
          validFrom: season.validFrom ?? '',
          validTo: season.validTo ?? '',
          isActive: season.isActive
        })

        const preset: Record<number, string> = {}

        season.prices.forEach(price => {
          preset[price.roomTypeId] = String(price.price)
        })
        setAmounts(preset)
      } catch (error) {
        toast.error(getRatesApiErrorMessage(error, 'No se pudo abrir la tarifa.'))
        router.replace(listUrl)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [listUrl, propertyId, reset, router, sessionStatus, uuid])

  const visibleTypes = roomTypes.filter(type => type.isActive || amounts[type.id])

  const changeAmount = (roomTypeId: number, raw: string) => {
    const normalized = raw.replace(',', '.').trim()

    if (normalized.includes('-')) {
      setPriceErrors(current => ({ ...current, [roomTypeId]: 'El precio no puede ser negativo.' }))
      setAmounts(current => ({ ...current, [roomTypeId]: normalized.replace(/-/g, '') }))

      return
    }

    if (normalized !== '' && !/^\d*\.?\d{0,2}$/.test(normalized)) {
      return
    }

    setPriceErrors(current => {
      if (!current[roomTypeId]) {
        return current
      }

      const next = { ...current }

      delete next[roomTypeId]

      return next
    })
    setPricesError(null)
    setAmounts(current => ({ ...current, [roomTypeId]: normalized }))
  }

  const onSubmit = async (data: FormValues) => {
    if (isView) {
      return
    }

    const prices: { roomTypeId: number; price: number }[] = []
    const nextErrors: Record<number, string> = {}

    for (const type of visibleTypes) {
      const parsed = parsePrice(amounts[type.id] ?? '')

      if (parsed === undefined) {
        nextErrors[type.id] = 'Escriba un precio en soles, sin signo menos.'
      } else if (parsed !== null) {
        prices.push({ roomTypeId: type.id, price: parsed })
      }
    }

    if (Object.keys(nextErrors).length) {
      setPriceErrors(nextErrors)

      return
    }

    if (prices.length === 0) {
      setPricesError('Indique el precio de al menos un tipo. El que deje vacío se cobra al precio normal.')

      return
    }

    const payload = {
      name: data.name.trim(),
      validFrom: emptyToNull(data.validFrom),
      validTo: emptyToNull(data.validTo),
      isActive: data.isActive,
      prices
    }

    try {
      if (isEdit && uuid) {
        await updateSeason(propertyId, uuid, payload)
        toast.success('Tarifa actualizada.')
      } else {
        const created = await createSeason(propertyId, payload)
        toast.success(
          created.restored
            ? 'Esta tarifa estaba eliminada. Se recuperó con los datos que acaba de guardar.'
            : 'Tarifa creada.'
        )
      }

      goBack()
    } catch (error) {
      toast.error(getRatesApiErrorMessage(error, 'No se pudo guardar la tarifa.'))
    }
  }

  const title = isView ? 'Ver tarifa' : isEdit ? 'Editar tarifa' : 'Nueva tarifa'

  const actions = (
    <div className='flex flex-wrap max-sm:flex-col gap-4'>
      <Button variant='outlined' color='secondary' type='button' onClick={goBack} disabled={isSubmitting}>
        {isView ? 'Volver' : 'Descartar'}
      </Button>
      {!isView ? (
        <Button variant='contained' type='submit' disabled={isSubmitting || !propertyId}>
          {isSubmitting ? <CircularProgress size={20} color='inherit' /> : 'Guardar'}
        </Button>
      ) : null}
    </div>
  )

  if (loading || sessionStatus === 'loading') {
    return (
      <div className='flex justify-center items-center p-10'>
        <CircularProgress size={32} />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-6'>
            <Typography variant='h4'>{title}</Typography>
            {actions}
          </div>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title='Temporada' subheader='Nombre y fechas en las que rige esta tarifa.' />
            <CardContent>
              <Grid container spacing={5}>
                <Grid size={{ xs: 12 }}>
                  <Controller
                    name='name'
                    control={control}
                    rules={{
                      required: 'El nombre es obligatorio.',
                      maxLength: { value: 100, message: 'Máximo 100 caracteres.' }
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Nombre'
                        placeholder='Fiestas Patrias'
                        disabled={isView || isSubmitting}
                        {...(errors.name && { error: true, helperText: errors.name.message })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='validFrom'
                    control={control}
                    render={({ field }) => (
                      <DateField
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        fullWidth
                        clearable
                        label='Desde'
                        disabled={isView || isSubmitting}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='validTo'
                    control={control}
                    rules={{
                      validate: value => {
                        if (!value || !validFrom) {
                          return true
                        }

                        return value >= validFrom || 'La fecha de fin no puede ser anterior al inicio.'
                      }
                    }}
                    render={({ field }) => (
                      <DateField
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        fullWidth
                        clearable
                        label='Hasta'
                        minDate={validFrom || undefined}
                        disabled={isView || isSubmitting}
                        error={Boolean(errors.validTo)}
                        helperText={errors.validTo?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Controller
                    name='isActive'
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={field.value}
                            onChange={(_, checked) => field.onChange(checked)}
                            disabled={isView || isSubmitting}
                          />
                        }
                        label={field.value ? 'Activa' : 'Inactiva'}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title='Precios por tipos de habitación' />
            {visibleTypes.length === 0 ? (
              <CardContent>
                <Typography color='text.secondary'>No hay tipos de habitación activos.</Typography>
              </CardContent>
            ) : (
              <div>
                <div className='hidden sm:grid sm:grid-cols-2 gap-4 px-6 pb-2'>
                  <Typography variant='body2' color='text.secondary' className='font-medium'>
                    Tipo de habitación
                  </Typography>
                  <Typography variant='body2' color='text.secondary' className='font-medium'>
                    Precio de esta tarifa
                  </Typography>
                </div>
                {visibleTypes.map(type => {
                  const amount = amounts[type.id] ?? ''
                  const error = priceErrors[type.id]

                  return (
                    <div
                      key={type.uuid}
                      className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-center px-6 py-4 border-bs'
                    >
                      <div>
                        <Typography color='text.primary' className='font-medium'>
                          {type.name}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          Precio normal {formatRoomPrice(type.basePrice)}
                        </Typography>
                      </div>
                      {isView ? (
                        <Typography color={amount ? 'text.primary' : 'text.secondary'} className='font-medium'>
                          {amount ? formatRoomPrice(Number(amount)) : 'Precio normal'}
                        </Typography>
                      ) : (
                        <TextField
                          value={amount}
                          onChange={event => changeAmount(type.id, event.target.value)}
                          onKeyDown={event => {
                            if (event.key === '-' || event.key === '+' || event.key === 'e' || event.key === 'E') {
                              event.preventDefault()
                              setPriceErrors(current => ({
                                ...current,
                                [type.id]: 'El precio no puede ser negativo.'
                              }))
                            }
                          }}
                          disabled={isSubmitting}
                          placeholder='Vacío = precio normal'
                          error={Boolean(error)}
                          helperText={error || ' '}
                          slotProps={{
                            input: {
                              startAdornment: <InputAdornment position='start'>S/</InputAdornment>
                            },
                            htmlInput: { inputMode: 'decimal' }
                          }}
                          className='max-is-[280px]'
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <CardContent className='flex flex-col gap-4 border-bs'>
              {pricesError ? <Alert severity='warning'>{pricesError}</Alert> : null}
              {actions}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </form>
  )
}

export default RateForm
