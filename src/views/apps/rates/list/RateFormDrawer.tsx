'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'react-toastify'

import type { Rate, UpdateRatePayload } from '@/types/apps/rateTypes'
import type { RoomType } from '@/types/apps/roomTypeTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { createRate, getRatesApiErrorMessage, updateRate } from '@/libs/ratesApi'
import { listRoomTypes } from '@/libs/roomTypesApi'

export type RateDrawerMode = 'create' | 'edit' | 'view'

type FormValues = {
  roomTypeId: number | ''
  name: string
  price: string
  validFrom: string
  validTo: string
  isActive: boolean
}

type Props = {
  open: boolean
  mode: RateDrawerMode
  propertyId: number
  rate?: Rate | null
  onClose: () => void
  onSuccess: (rate: Rate) => void
}

const titles: Record<RateDrawerMode, string> = {
  create: 'Agregar tarifa',
  edit: 'Editar tarifa',
  view: 'Ver tarifa'
}

const emptyValues: FormValues = {
  roomTypeId: '',
  name: '',
  price: '',
  validFrom: '',
  validTo: '',
  isActive: true
}

const toFormValues = (rate: Rate): FormValues => ({
  roomTypeId: rate.roomTypeId,
  name: rate.name,
  price: String(rate.price ?? ''),
  validFrom: rate.validFrom ?? '',
  validTo: rate.validTo ?? '',
  isActive: rate.isActive
})

const emptyToNull = (value: string) => {
  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

const RateFormDrawer = (props: Props) => {
  const { open, mode, propertyId, rate, onClose, onSuccess } = props
  const isView = mode === 'view'
  const isEdit = mode === 'edit'
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: emptyValues
  })

  const validFrom = useWatch({ control, name: 'validFrom' })

  useEffect(() => {
    if (!open) {
      return
    }

    reset((isEdit || isView) && rate ? toFormValues(rate) : emptyValues)

    const loadTypes = async () => {
      try {
        const page = await listRoomTypes(propertyId, { limit: 100 })

        setRoomTypes(page.data)
      } catch (error) {
        toast.error(getRatesApiErrorMessage(error, 'No se pudieron cargar los tipos de habitación.'))
        setRoomTypes([])
      }
    }

    loadTypes()
  }, [open, mode, rate, isEdit, isView, propertyId, reset])

  const handleReset = () => {
    onClose()
    reset(emptyValues)
  }

  const onSubmit = async (data: FormValues) => {
    if (isView) {
      return
    }

    if (data.roomTypeId === '') {
      toast.error('Selecciona un tipo de habitación.')

      return
    }

    try {
      if (isEdit && rate) {
        const payload: UpdateRatePayload = {}

        if (data.name.trim() !== rate.name) payload.name = data.name.trim()
        if (Number(data.price) !== Number(rate.price)) payload.price = Number(data.price)
        if (emptyToNull(data.validFrom) !== (rate.validFrom ?? null)) payload.validFrom = emptyToNull(data.validFrom)
        if (emptyToNull(data.validTo) !== (rate.validTo ?? null)) payload.validTo = emptyToNull(data.validTo)
        if (data.isActive !== rate.isActive) payload.isActive = data.isActive

        if (Object.keys(payload).length === 0) {
          toast.info('No hay cambios para guardar.')

          return
        }

        const saved = await updateRate(propertyId, rate.uuid, payload)

        toast.success('Tarifa actualizada.')
        onSuccess(saved)
      } else {
        const saved = await createRate(propertyId, {
          roomTypeId: Number(data.roomTypeId),
          name: data.name.trim(),
          price: Number(data.price),
          validFrom: emptyToNull(data.validFrom),
          validTo: emptyToNull(data.validTo),
          isActive: data.isActive
        })

        toast.success('Tarifa creada.')
        onSuccess(saved)
      }

      handleReset()
    } catch (error) {
      toast.error(getRatesApiErrorMessage(error, 'No se pudo guardar la tarifa.'))
    }
  }

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleReset}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 440 } } }}
    >
      <div className='flex items-center justify-between pli-5 plb-4'>
        <Typography variant='h5'>{titles[mode]}</Typography>
        <IconButton size='small' onClick={handleReset}>
          <i className='ri-close-line text-2xl' />
        </IconButton>
      </div>
      <Divider />
      <div className='p-5'>
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5'>
          <FormControl fullWidth error={Boolean(errors.roomTypeId)}>
            <InputLabel id='rate-room-type'>Tipo de habitación</InputLabel>
            <Controller
              name='roomTypeId'
              control={control}
              rules={{ required: 'El tipo de habitación es obligatorio.' }}
              render={({ field }) => (
                <Select
                  {...field}
                  label='Tipo de habitación'
                  labelId='rate-room-type'
                  disabled={isView || isEdit || isSubmitting}
                >
                  {roomTypes.map(type => (
                    <MenuItem key={type.uuid} value={type.id}>
                      {type.name} · {formatRoomPrice(type.basePrice)}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
            {errors.roomTypeId ? <FormHelperText>{errors.roomTypeId.message}</FormHelperText> : null}
          </FormControl>

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
                placeholder='Temporada alta'
                disabled={isView || isSubmitting}
                {...(errors.name && { error: true, helperText: errors.name.message })}
              />
            )}
          />

          <Controller
            name='price'
            control={control}
            rules={{
              required: 'El precio es obligatorio.',
              validate: value => {
                if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) {
                  return 'Usa un número con máximo 2 decimales.'
                }

                return Number(value) >= 0 || 'El precio no puede ser negativo.'
              }
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Precio (S/ por noche)'
                placeholder='120'
                disabled={isView || isSubmitting}
                {...(errors.price && { error: true, helperText: errors.price.message })}
              />
            )}
          />

          <Controller
            name='validFrom'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type='date'
                label='Vigente desde'
                disabled={isView || isSubmitting}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}
          />

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
              <TextField
                {...field}
                fullWidth
                type='date'
                label='Vigente hasta'
                disabled={isView || isSubmitting}
                slotProps={{ inputLabel: { shrink: true } }}
                {...(errors.validTo && { error: true, helperText: errors.validTo.message })}
              />
            )}
          />

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

          {isView && rate ? (
            <div className='flex flex-col gap-2'>
              <Typography variant='body2' color='text.secondary'>
                Tipo: {rate.roomTypeName}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Precio: {formatRoomPrice(rate.price)}
              </Typography>
              {rate.createdAt ? (
                <Typography variant='body2' color='text.secondary'>
                  Creada: {new Date(rate.createdAt).toLocaleString()}
                </Typography>
              ) : null}
            </div>
          ) : null}

          <div className='flex items-center gap-4'>
            {!isView ? (
              <Button variant='contained' type='submit' disabled={isSubmitting || !propertyId}>
                {isSubmitting ? <CircularProgress size={20} color='inherit' /> : isEdit ? 'Guardar' : 'Agregar'}
              </Button>
            ) : null}
            <Button variant='outlined' color='secondary' type='button' onClick={handleReset} disabled={isSubmitting}>
              {isView ? 'Cerrar' : 'Descartar'}
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  )
}

export default RateFormDrawer
