'use client'

import { useEffect, useState } from 'react'

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
import {
  ROOM_TYPE_CODE_PATTERN,
  capacitySummary,
  defaultGuestLimits,
  formatPeople,
  hasGuestLimits,
  roomCapacity,
  suggestRoomTypeCode,
  toRoomTypeCode
} from '@/types/apps/roomTypeTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { createRoomType, getRoomTypesApiErrorMessage, updateRoomType } from '@/libs/roomTypesApi'
import { sameCatalogName, toCatalogName } from '@/utils/string'

export type RoomTypeDrawerMode = 'create' | 'edit' | 'view'

type FormValues = {
  name: string
  code: string
  description: string
  basePrice: string
  maxOccupancy: number
  maxAdults: number
  maxChildren: number
}

type Props = {
  open: boolean
  mode: RoomTypeDrawerMode
  propertyId: number
  roomType?: RoomType | null
  roomTypes: RoomType[]
  onClose: () => void
  onSuccess: (roomType: RoomType) => void
}

const titles: Record<RoomTypeDrawerMode, string> = {
  create: 'Nuevo tipo de habitación',
  edit: 'Editar tipo de habitación',
  view: 'Ver tipo de habitación'
}

const emptyValues: FormValues = {
  name: '',
  code: '',
  description: '',
  basePrice: '',
  maxOccupancy: 2,
  ...defaultGuestLimits(2)
}

const toFormValues = (roomType: RoomType): FormValues => ({
  name: roomType.name,
  code: roomType.code,
  description: roomType.description ?? '',
  basePrice: String(roomType.basePrice ?? ''),
  maxOccupancy: roomCapacity(roomType),
  maxAdults: roomType.maxAdults,
  maxChildren: roomType.maxChildren
})

const RoomTypeFormDrawer = (props: Props) => {
  const { open, mode, propertyId, roomType, roomTypes, onClose, onSuccess } = props
  const isView = mode === 'view'
  const isEdit = mode === 'edit'

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    trigger,
    formState: { errors, isSubmitting, isSubmitted }
  } = useForm<FormValues>({
    defaultValues: emptyValues
  })

  const [showLimits, setShowLimits] = useState(false)
  const [codeEdited, setCodeEdited] = useState(false)
  const otherTypes = roomTypes.filter(item => !isEdit || item.uuid !== roomType?.uuid)
  const [capacity, maxAdults, maxChildren] = useWatch({ control, name: ['maxOccupancy', 'maxAdults', 'maxChildren'] })

  useEffect(() => {
    if (!open) {
      return
    }

    const values = (isEdit || isView) && roomType ? toFormValues(roomType) : emptyValues

    setShowLimits(hasGuestLimits(values))
    setCodeEdited(Boolean(values.code))
    reset(values)
  }, [open, mode, roomType, isEdit, isView, reset])

  const applyDefaultLimits = (people: number) => {
    const limits = defaultGuestLimits(people)

    setValue('maxAdults', limits.maxAdults, { shouldValidate: true, shouldDirty: true })
    setValue('maxChildren', limits.maxChildren, { shouldValidate: true, shouldDirty: true })
  }

  const handleToggleLimits = () => {
    if (showLimits) {
      applyDefaultLimits(Number(getValues('maxOccupancy')) || 1)
    }

    setShowLimits(!showLimits)
  }

  const handleReset = () => {
    onClose()
    setShowLimits(false)
    reset(emptyValues)
  }

  const people = Number(capacity)
  const limitsOk = !errors.maxOccupancy && !errors.maxAdults && !errors.maxChildren

  const summary =
    limitsOk && Number.isInteger(people) && people >= 1
      ? capacitySummary({ maxOccupancy: people, maxAdults, maxChildren })
      : ''

  const onSubmit = async (data: FormValues) => {
    if (isView) {
      return
    }

    try {
      const payload = {
        name: toCatalogName(data.name),
        code: data.code,
        description: data.description.trim() ? data.description.trim() : null,
        basePrice: Number(data.basePrice),
        maxAdults: Number(data.maxAdults),
        maxChildren: Number(data.maxChildren),
        maxOccupancy: Number(data.maxOccupancy)
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
              validate: value => {
                if (!value.trim()) {
                  return 'El nombre es obligatorio.'
                }

                if (toCatalogName(value).length > 100) {
                  return 'Máximo 100 caracteres.'
                }

                const duplicate = otherTypes.find(item => sameCatalogName(item.name, value))

                return !duplicate || `Ya existe el tipo "${duplicate.name}".`
              }
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Nombre'
                placeholder='Matrimonial'
                disabled={isView || isSubmitting}
                onChange={e => {
                  field.onChange(e.target.value)

                  if (!codeEdited) {
                    setValue('code', suggestRoomTypeCode(e.target.value), { shouldValidate: isSubmitted })
                  }
                }}
                onBlur={() => {
                  field.onChange(toCatalogName(field.value))
                  field.onBlur()
                }}
                error={Boolean(errors.name)}
                helperText={
                  errors.name?.message || 'La categoría. Por ejemplo: Matrimonial, Doble o Triple.'
                }
              />
            )}
          />

          <Controller
            name='code'
            control={control}
            rules={{
              validate: value => {
                if (!value) {
                  return true
                }

                if (!ROOM_TYPE_CODE_PATTERN.test(value)) {
                  return 'De 2 a 6 letras o números.'
                }

                const duplicate = otherTypes.find(item => item.code === value)

                return !duplicate || `Ya la usa el tipo "${duplicate.name}".`
              }
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Abreviatura (opcional)'
                placeholder='MAT'
                disabled={isView || isSubmitting}
                slotProps={{ htmlInput: { maxLength: 6, autoCapitalize: 'characters' } }}
                onChange={e => {
                  const code = toRoomTypeCode(e.target.value)

                  setCodeEdited(code !== '')
                  field.onChange(code)
                }}
                error={Boolean(errors.code)}
                helperText={
                  errors.code?.message || 'Se llena sola. Puede cambiarla si quiere, por ejemplo MAT, DBL o TPL.'
                }
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
            name='maxOccupancy'
            control={control}
            rules={{
              required: 'Indica cuántas personas duermen aquí.',
              min: { value: 1, message: 'Mínimo 1 persona.' },
              max: { value: 50, message: 'Máximo 50 personas.' },
              validate: value => Number.isInteger(Number(value)) || 'Debe ser un número entero.'
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type='number'
                label='Personas en la habitación'
                disabled={isView || isSubmitting}
                slotProps={{ htmlInput: { min: 1, max: 50, step: 1 } }}
                onChange={e => {
                  const value = Number(e.target.value)

                  field.onChange(value)

                  if (showLimits) {
                    trigger(['maxAdults', 'maxChildren'])
                  } else {
                    applyDefaultLimits(value)
                  }
                }}
                error={Boolean(errors.maxOccupancy)}
                helperText={
                  errors.maxOccupancy?.message || 'Cuántas personas duermen aquí. Por ejemplo: Doble 2, Triple 3.'
                }
              />
            )}
          />

          {summary ? (
            <div className='flex items-start gap-2'>
              <i className='ri-group-line text-xl text-textSecondary' />
              <Typography variant='body2' color='text.primary'>
                {summary}
              </Typography>
            </div>
          ) : null}

          {!isView ? (
            <Button
              variant='text'
              size='small'
              className='self-start'
              onClick={handleToggleLimits}
              disabled={isSubmitting}
              startIcon={<i className={showLimits ? 'ri-close-line' : 'ri-equalizer-line'} />}
            >
              {showLimits ? 'Quitar límite de adultos y niños' : 'Limitar adultos o niños (opcional)'}
            </Button>
          ) : null}

          {showLimits ? (
            <div className='flex flex-col gap-4'>
              <Typography variant='body2' color='text.secondary'>
                Solo si quiere una regla especial. Las personas de arriba siguen siendo el tope.
              </Typography>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <Controller
                  name='maxAdults'
                  control={control}
                  rules={{
                    validate: value => {
                      if (!showLimits) {
                        return true
                      }

                      const adults = Number(value)
                      const total = Number(getValues('maxOccupancy'))

                      if (!Number.isInteger(adults) || adults < 1) {
                        return 'Mínimo 1 adulto.'
                      }

                      return adults <= total || `No puede pasar de ${formatPeople(total)}.`
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type='number'
                      label='De ellas, adultos'
                      disabled={isView || isSubmitting}
                      slotProps={{ htmlInput: { min: 1, max: 50, step: 1 } }}
                      onChange={e => {
                        field.onChange(Number(e.target.value))
                        trigger(['maxAdults', 'maxChildren'])
                      }}
                      {...(errors.maxAdults && { error: true, helperText: errors.maxAdults.message })}
                    />
                  )}
                />
                <Controller
                  name='maxChildren'
                  control={control}
                  rules={{
                    validate: value => {
                      if (!showLimits) {
                        return true
                      }

                      const children = Number(value || 0)
                      const adults = Number(getValues('maxAdults'))
                      const total = Number(getValues('maxOccupancy'))

                      if (!Number.isInteger(children) || children < 0) {
                        return 'Debe ser 0 o más.'
                      }

                      if (children > total - 1) {
                        return total <= 1
                          ? 'Con 1 persona no entran niños: siempre va un adulto.'
                          : `Hasta ${total - 1} niños: siempre va un adulto.`
                      }

                      if (adults + children < total) {
                        return `Así solo entran ${formatPeople(adults + children)}. Suba adultos o niños.`
                      }

                      return true
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type='number'
                      label='De ellas, niños'
                      disabled={isView || isSubmitting}
                      slotProps={{ htmlInput: { min: 0, max: 50, step: 1 } }}
                      onChange={e => {
                        field.onChange(Number(e.target.value))
                        trigger(['maxAdults', 'maxChildren'])
                      }}
                      {...(errors.maxChildren && { error: true, helperText: errors.maxChildren.message })}
                    />
                  )}
                />
              </div>
            </div>
          ) : null}

          {mode === 'create' ? (
            <Typography variant='body2' color='text.secondary'>
              El tipo nuevo queda al final de la lista. Para cambiar el orden, arrástrelo en la lista.
            </Typography>
          ) : null}

          {isView && roomType ? (
            <div className='flex flex-col gap-2'>
              <Typography variant='body2' color='text.secondary'>
                Precio base: {formatRoomPrice(roomType.basePrice)}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Posición en la lista: {roomType.displayOrder}
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
            <Button variant='outlined' color='secondary' type='button' onClick={handleReset} disabled={isSubmitting}>
              {isView ? 'Cerrar' : 'Descartar'}
            </Button>
            {!isView ? (
              <Button variant='contained' type='submit' disabled={isSubmitting || !propertyId}>
                {isSubmitting ? <CircularProgress size={20} color='inherit' /> : 'Guardar'}
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </Drawer>
  )
}

export default RoomTypeFormDrawer
