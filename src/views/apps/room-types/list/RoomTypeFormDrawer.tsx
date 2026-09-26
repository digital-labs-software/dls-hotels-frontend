'use client'

import { useEffect } from 'react'

import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'react-toastify'

import type { RoomType } from '@/types/apps/roomTypeTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { createRoomType, getRoomTypesApiErrorMessage, updateRoomType } from '@/libs/roomTypesApi'

export type RoomTypeDrawerMode = 'create' | 'edit' | 'view'

type FormValues = {
  name: string
  description: string
  basePrice: string
  maxAdults: number
  maxChildren: number
  maxOccupancy: string
  displayOrder: number
}

type Props = {
  open: boolean
  mode: RoomTypeDrawerMode
  propertyId: number
  roomType?: RoomType | null
  onClose: () => void
  onSuccess: (roomType: RoomType) => void
}

const titles: Record<RoomTypeDrawerMode, string> = {
  create: 'Agregar tipo de habitación',
  edit: 'Editar tipo de habitación',
  view: 'Ver tipo de habitación'
}

const emptyValues: FormValues = {
  name: '',
  description: '',
  basePrice: '',
  maxAdults: 2,
  maxChildren: 0,
  maxOccupancy: '',
  displayOrder: 1
}

const toFormValues = (roomType: RoomType): FormValues => ({
  name: roomType.name,
  description: roomType.description ?? '',
  basePrice: String(roomType.basePrice ?? ''),
  maxAdults: roomType.maxAdults,
  maxChildren: roomType.maxChildren,
  maxOccupancy: roomType.maxOccupancy == null ? '' : String(roomType.maxOccupancy),
  displayOrder: roomType.displayOrder
})

const RoomTypeFormDrawer = (props: Props) => {
  const { open, mode, propertyId, roomType, onClose, onSuccess } = props
  const isView = mode === 'view'
  const isEdit = mode === 'edit'

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: emptyValues
  })

  const maxAdults = useWatch({ control, name: 'maxAdults' })
  const maxChildren = useWatch({ control, name: 'maxChildren' })

  useEffect(() => {
    if (!open) {
      return
    }

    reset((isEdit || isView) && roomType ? toFormValues(roomType) : emptyValues)
  }, [open, mode, roomType, isEdit, isView, reset])

  const handleReset = () => {
    onClose()
    reset(emptyValues)
  }

  const onSubmit = async (data: FormValues) => {
    if (isView) {
      return
    }

    try {
      const payload = {
        name: data.name.trim(),
        description: data.description.trim() ? data.description.trim() : null,
        basePrice: Number(data.basePrice),
        maxAdults: Number(data.maxAdults),
        maxChildren: Number(data.maxChildren),
        maxOccupancy: data.maxOccupancy === '' ? null : Number(data.maxOccupancy),
        displayOrder: Number(data.displayOrder)
      }

      const saved =
        isEdit && roomType
          ? await updateRoomType(propertyId, roomType.uuid, payload)
          : await createRoomType(propertyId, payload)

      toast.success(isEdit ? 'Tipo de habitación actualizado.' : 'Tipo de habitación creado.')
      onSuccess(saved)
      handleReset()
    } catch (error) {
      toast.error(getRoomTypesApiErrorMessage(error, 'No se pudo guardar el tipo de habitación.'))
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
                placeholder='Matrimonial'
                disabled={isView || isSubmitting}
                {...(errors.name && { error: true, helperText: errors.name.message })}
              />
            )}
          />

          <Controller
            name='description'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                minRows={3}
                label='Descripción'
                placeholder='Habitación con cama queen size y vista al mar.'
                disabled={isView || isSubmitting}
              />
            )}
          />

          <Controller
            name='basePrice'
            control={control}
            rules={{
              required: 'El precio base es obligatorio.',
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
                label='Precio base (S/ por noche)'
                placeholder='90'
                disabled={isView || isSubmitting}
                {...(errors.basePrice && { error: true, helperText: errors.basePrice.message })}
              />
            )}
          />

          <Controller
            name='maxAdults'
            control={control}
            rules={{
              required: 'La cantidad de adultos es obligatoria.',
              min: { value: 1, message: 'Mínimo 1 adulto.' },
              max: { value: 50, message: 'Máximo 50 adultos.' },
              validate: value => Number.isInteger(Number(value)) || 'Debe ser un número entero.'
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type='number'
                label='Máximo de adultos'
                disabled={isView || isSubmitting}
                slotProps={{ htmlInput: { min: 1, max: 50, step: 1 } }}
                onChange={e => field.onChange(Number(e.target.value))}
                {...(errors.maxAdults && { error: true, helperText: errors.maxAdults.message })}
              />
            )}
          />

          <Controller
            name='maxChildren'
            control={control}
            rules={{
              min: { value: 0, message: 'Mínimo 0.' },
              max: { value: 50, message: 'Máximo 50 niños.' },
              validate: value => Number.isInteger(Number(value)) || 'Debe ser un número entero.'
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type='number'
                label='Máximo de niños'
                disabled={isView || isSubmitting}
                slotProps={{ htmlInput: { min: 0, max: 50, step: 1 } }}
                onChange={e => field.onChange(Number(e.target.value))}
                {...(errors.maxChildren && { error: true, helperText: errors.maxChildren.message })}
              />
            )}
          />

          <Controller
            name='maxOccupancy'
            control={control}
            rules={{
              validate: value => {
                if (value === '') {
                  return true
                }

                const occupancy = Number(value)
                const adults = Number(maxAdults)
                const children = Number(maxChildren || 0)

                if (!Number.isInteger(occupancy)) {
                  return 'Debe ser un número entero.'
                }

                if (occupancy < adults) {
                  return 'Debe ser al menos la cantidad de adultos.'
                }

                if (occupancy > adults + children) {
                  return 'No puede superar adultos + niños.'
                }

                return true
              }
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Ocupación máxima combinada'
                placeholder='Vacío = sin tope combinado'
                disabled={isView || isSubmitting}
                {...(errors.maxOccupancy && { error: true, helperText: errors.maxOccupancy.message })}
              />
            )}
          />

          <Controller
            name='displayOrder'
            control={control}
            rules={{
              required: 'El orden es obligatorio.',
              min: { value: 1, message: 'El orden mínimo es 1.' },
              validate: value => Number.isInteger(Number(value)) || 'Debe ser un número entero.'
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type='number'
                label='Orden de visualización'
                placeholder='1'
                disabled={isView || isSubmitting}
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
                onChange={e => field.onChange(Number(e.target.value))}
                {...(errors.displayOrder && { error: true, helperText: errors.displayOrder.message })}
              />
            )}
          />

          {isView && roomType ? (
            <div className='flex flex-col gap-2'>
              <Typography variant='body2' color='text.secondary'>
                Precio base: {formatRoomPrice(roomType.basePrice)}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                UUID: {roomType.uuid}
              </Typography>
              {roomType.createdAt ? (
                <Typography variant='body2' color='text.secondary'>
                  Creado: {new Date(roomType.createdAt).toLocaleString()}
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

export default RoomTypeFormDrawer
