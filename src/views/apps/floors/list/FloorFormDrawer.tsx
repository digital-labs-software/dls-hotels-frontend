'use client'

// React Imports
import { useEffect } from 'react'

// MUI Imports
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// Third-party Imports
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'

// Type Imports
import type { Floor } from '@/types/apps/floorTypes'

// API Imports
import { createFloor, getFloorsApiErrorMessage, updateFloor } from '@/libs/floorsApi'

export type FloorDrawerMode = 'create' | 'edit' | 'view'

type FormValues = {
  name: string
  displayOrder: number
}

type Props = {
  open: boolean
  mode: FloorDrawerMode
  propertyId: number
  floor?: Floor | null
  onClose: () => void
  onSuccess: (floor: Floor) => void
}

const titles: Record<FloorDrawerMode, string> = {
  create: 'Agregar nivel',
  edit: 'Editar nivel',
  view: 'Ver nivel'
}

const FloorFormDrawer = (props: Props) => {
  const { open, mode, propertyId, floor, onClose, onSuccess } = props
  const isView = mode === 'view'
  const isEdit = mode === 'edit'

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      displayOrder: 1
    }
  })

  useEffect(() => {
    if (!open) {
      return
    }

    if ((isEdit || isView) && floor) {
      reset({
        name: floor.name,
        displayOrder: floor.displayOrder
      })
    } else {
      reset({
        name: '',
        displayOrder: 1
      })
    }
  }, [open, mode, floor, isEdit, isView, reset])

  const handleReset = () => {
    onClose()
    reset({ name: '', displayOrder: 1 })
  }

  const onSubmit = async (data: FormValues) => {
    if (isView) {
      return
    }

    try {
      const payload = {
        name: data.name.trim(),
        displayOrder: Number(data.displayOrder)
      }

      const saved =
        isEdit && floor
          ? await updateFloor(propertyId, floor.uuid, payload)
          : await createFloor(propertyId, payload)

      toast.success(isEdit ? 'Nivel actualizado correctamente.' : 'Nivel creado correctamente.')
      onSuccess(saved)
      handleReset()
    } catch (error) {
      toast.error(getFloorsApiErrorMessage(error, 'No se pudo guardar el nivel.'))
    }
  }

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleReset}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 400 } } }}
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
              maxLength: { value: 50, message: 'Máximo 50 caracteres.' }
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Nombre'
                placeholder='Piso 1'
                disabled={isView || isSubmitting}
                {...(errors.name && { error: true, helperText: errors.name.message })}
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

          {isView && floor ? (
            <div className='flex flex-col gap-2'>
              <Typography variant='body2' color='text.secondary'>
                UUID: {floor.uuid}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Alojamiento: #{floor.propertyId}
              </Typography>
              {floor.createdAt ? (
                <Typography variant='body2' color='text.secondary'>
                  Creado: {new Date(floor.createdAt).toLocaleString()}
                </Typography>
              ) : null}
              {floor.updatedAt ? (
                <Typography variant='body2' color='text.secondary'>
                  Actualizado: {new Date(floor.updatedAt).toLocaleString()}
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

export default FloorFormDrawer
