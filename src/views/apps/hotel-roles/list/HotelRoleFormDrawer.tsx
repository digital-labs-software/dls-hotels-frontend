'use client'

import { useEffect } from 'react'

import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

import { Controller, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'

import type { HotelRole } from '@/types/apps/hotelRoleTypes'
import { createHotelRole, getHotelRolesApiErrorMessage, updateHotelRole } from '@/libs/hotelRolesApi'

export type HotelRoleDrawerMode = 'create' | 'edit' | 'view'

type FormValues = {
  name: string
}

type Props = {
  open: boolean
  mode: HotelRoleDrawerMode
  propertyId: number
  role?: HotelRole | null
  onClose: () => void
  onSuccess: (role: HotelRole) => void
}

const titles: Record<HotelRoleDrawerMode, string> = {
  create: 'Agregar rol',
  edit: 'Editar rol',
  view: 'Ver rol'
}

const HotelRoleFormDrawer = (props: Props) => {
  const { open, mode, propertyId, role, onClose, onSuccess } = props
  const isView = mode === 'view'
  const isEdit = mode === 'edit'

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      name: ''
    }
  })

  useEffect(() => {
    if (!open) {
      return
    }

    reset({
      name: (isEdit || isView) && role ? role.name : ''
    })
  }, [open, mode, role, isEdit, isView, reset])

  const handleReset = () => {
    onClose()
    reset({ name: '' })
  }

  const onSubmit = async (data: FormValues) => {
    if (isView) {
      return
    }

    try {
      const name = data.name.trim()

      const saved =
        isEdit && role
          ? await updateHotelRole(role.uuid, { name })
          : await createHotelRole({
              propertyId,
              name
            })

      toast.success(isEdit ? 'Rol actualizado.' : 'Rol creado.')
      onSuccess(saved)
      handleReset()
    } catch (error) {
      toast.error(getHotelRolesApiErrorMessage(error, 'No se pudo guardar el rol.'))
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
              maxLength: { value: 100, message: 'Máximo 100 caracteres.' }
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Nombre'
                placeholder='Recepcionista'
                disabled={isView || isSubmitting}
                {...(errors.name && { error: true, helperText: errors.name.message })}
              />
            )}
          />

          {isView && role ? (
            <div className='flex flex-col gap-2'>
              <Typography variant='body2' color='text.secondary'>
                ID: {role.id}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                UUID: {role.uuid}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Alojamiento: #{role.propertyId}
              </Typography>
              {role.createdAt ? (
                <Typography variant='body2' color='text.secondary'>
                  Creado: {new Date(role.createdAt).toLocaleString()}
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

export default HotelRoleFormDrawer
