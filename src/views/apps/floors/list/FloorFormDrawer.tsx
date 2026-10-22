'use client'

// React Imports
import { useEffect } from 'react'

// MUI Imports
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
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
import { numberedFloorName } from '@/types/apps/floorTypes'

// API Imports
import { createFloor, getFloorsApiErrorMessage, updateFloor } from '@/libs/floorsApi'

// Util Imports
import { sameCatalogName, toCatalogName } from '@/utils/string'

export type FloorDrawerMode = 'create' | 'edit' | 'view'

type FormValues = {
  name: string
}

type Props = {
  open: boolean
  mode: FloorDrawerMode
  propertyId: number
  floor?: Floor | null
  floors: Floor[]
  onClose: () => void
  onSuccess: (floor: Floor) => void
}

const titles: Record<FloorDrawerMode, string> = {
  create: 'Nuevo piso',
  edit: 'Editar piso',
  view: 'Ver piso'
}

const commonFloorNames = ['Planta baja', 'Sótano', 'Azotea']

const FloorFormDrawer = (props: Props) => {
  const { open, mode, propertyId, floor, floors, onClose, onSuccess } = props
  const isView = mode === 'view'
  const isEdit = mode === 'edit'

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      name: ''
    }
  })

  const otherFloors = floors.filter(item => !isEdit || item.uuid !== floor?.uuid)
  const isTaken = (name: string) => otherFloors.some(item => sameCatalogName(item.name, name))

  let nextNumber = 1

  while (isTaken(numberedFloorName(nextNumber))) {
    nextNumber += 1
  }

  const suggestions = [numberedFloorName(nextNumber), ...commonFloorNames.filter(name => !isTaken(name))]

  useEffect(() => {
    if (!open) {
      return
    }

    reset({ name: (isEdit || isView) && floor ? floor.name : '' })
  }, [open, mode, floor, isEdit, isView, reset])

  const handleReset = () => {
    onClose()
    reset({ name: '' })
  }

  const onSubmit = async (data: FormValues) => {
    if (isView) {
      return
    }

    try {
      const payload = { name: toCatalogName(data.name) }

      const saved =
        isEdit && floor
          ? await updateFloor(propertyId, floor.uuid, payload)
          : await createFloor(propertyId, payload)

      toast.success(
        isEdit
          ? 'Piso actualizado correctamente.'
          : saved.restored
            ? 'Este piso estaba eliminado. Se recuperó con los datos que acaba de guardar.'
            : 'Piso creado correctamente.'
      )
      onSuccess(saved)
      handleReset()
    } catch (error) {
      toast.error(getFloorsApiErrorMessage(error, 'No se pudo guardar el piso.'))
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
              validate: value => {
                if (!value.trim()) {
                  return 'El nombre es obligatorio.'
                }

                if (toCatalogName(value).length > 50) {
                  return 'Máximo 50 caracteres.'
                }

                const duplicate = otherFloors.find(item => sameCatalogName(item.name, value))

                return !duplicate || `Ya existe el piso "${duplicate.name}".`
              }
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Nombre'
                placeholder='Piso 1'
                disabled={isView || isSubmitting}
                onBlur={() => {
                  field.onChange(toCatalogName(field.value))
                  field.onBlur()
                }}
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
              />
            )}
          />

          {mode === 'create' ? (
            <div className='flex flex-wrap items-center gap-2'>
              <Typography variant='body2' color='text.secondary'>
                Sugerencias:
              </Typography>
              {suggestions.map(name => (
                <Chip
                  key={name}
                  label={name}
                  size='small'
                  variant='outlined'
                  clickable
                  disabled={isSubmitting}
                  onClick={() => setValue('name', name, { shouldValidate: true, shouldDirty: true })}
                />
              ))}
            </div>
          ) : null}

          <div className='flex flex-wrap items-center justify-end gap-4'>
            <Button variant='outlined' color='secondary' type='button' onClick={handleReset} disabled={isSubmitting}>
              {isView ? 'Cerrar' : 'Volver'}
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

export default FloorFormDrawer
