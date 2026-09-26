'use client'

import { useEffect, useState } from 'react'

import { useParams, useRouter, useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { Controller, useForm } from 'react-hook-form'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { Locale } from '@configs/i18n'
import type { DocumentType } from '@/types/apps/clientsTypes'
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from '@/types/apps/clientsTypes'
import { getClientsApiErrorMessage, guestsApi } from '@/libs/clientsApi'
import { getLocalizedUrl } from '@/utils/i18n'

type FormValues = {
  firstName: string
  lastName: string
  documentType: DocumentType | ''
  documentNumber: string
  phone: string
  email: string
  address: string
  birthDate: string
  notes: string
}

type Props = {
  uuid?: string
}

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '')

const GuestForm = ({ uuid }: Props) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const { data: session, status: sessionStatus } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const isView = searchParams.get('mode') === 'view'
  const isEdit = Boolean(uuid) && !isView
  const [loading, setLoading] = useState(Boolean(uuid))
  const [isEmployee, setIsEmployee] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      documentType: '',
      documentNumber: '',
      phone: '',
      email: '',
      address: '',
      birthDate: '',
      notes: ''
    }
  })

  const documentType = watch('documentType')
  const documentNumber = watch('documentNumber')

  useEffect(() => {
    if (sessionStatus === 'loading') {
      return
    }

    const load = async () => {
      if (!uuid) {
        setLoading(false)

        return
      }

      try {
        const guest = await guestsApi.get(propertyId, uuid)

        setIsEmployee(guest.person.isEmployee)
        reset({
          firstName: guest.person.firstName,
          lastName: guest.person.lastName,
          documentType: guest.person.documentType ?? '',
          documentNumber: guest.person.documentNumber ?? '',
          phone: guest.person.phone ?? '',
          email: guest.person.email ?? '',
          address: guest.person.address ?? '',
          birthDate: toDateInput(guest.person.birthDate),
          notes: guest.notes ?? ''
        })
      } catch (error) {
        toast.error(getClientsApiErrorMessage(error, 'No se encontró el huésped solicitado.'))
        router.replace(getLocalizedUrl('/apps/clients', locale as Locale))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [locale, propertyId, reset, router, sessionStatus, uuid])

  const goBack = () => {
    router.push(getLocalizedUrl('/apps/clients', locale as Locale))
  }

  const onSubmit = async (data: FormValues) => {
    if (isView) {
      return
    }

    const hasDocumentType = Boolean(data.documentType)
    const hasDocumentNumber = Boolean(data.documentNumber.trim())

    if (hasDocumentType !== hasDocumentNumber) {
      toast.error('El tipo y el número de documento deben enviarse juntos.')

      return
    }

    try {
      const payload = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        documentType: data.documentType || null,
        documentNumber: data.documentNumber.trim() || null,
        phone: data.phone.trim() || null,
        email: data.email.trim() || null,
        address: data.address.trim() || null,
        birthDate: data.birthDate || null,
        notes: data.notes.trim() || null
      }

      if (isEdit && uuid) {
        await guestsApi.update(propertyId, uuid, payload)
        toast.success('Huésped actualizado.')
      } else {
        await guestsApi.create(propertyId, payload)
        toast.success('Huésped creado.')
      }

      goBack()
    } catch (error) {
      toast.error(getClientsApiErrorMessage(error, 'No se pudo guardar el huésped.'))
    }
  }

  const title = isView ? 'Ver huésped' : isEdit ? 'Editar huésped' : 'Nuevo huésped'

  if (loading) {
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
            <div>
              <Typography variant='h4' className='mbe-1'>
                {title}
              </Typography>
              <Typography>
                {isView
                  ? 'Consulta los datos del huésped'
                  : isEdit
                    ? 'Actualiza los datos personales o las notas internas.'
                    : 'Registra un huésped del hotel'}
              </Typography>
            </div>
            <div className='flex flex-wrap max-sm:flex-col gap-4'>
              <Button variant='outlined' color='secondary' type='button' onClick={goBack}>
                {isView ? 'Volver' : 'Descartar'}
              </Button>
              {!isView ? (
                <Button variant='contained' type='submit' disabled={isSubmitting}>
                  {isSubmitting ? <CircularProgress size={20} color='inherit' /> : isEdit ? 'Guardar' : 'Guardar huésped'}
                </Button>
              ) : null}
            </div>
          </div>
        </Grid>

        {isEmployee ? (
          <Grid size={{ xs: 12 }}>
            <Alert
              severity='info'
              icon={false}
              action={<Chip size='small' color='info' variant='tonal' label='Empleado' />}
            >
              Esta persona también es empleado del hotel. Los datos personales se actualizan sobre el mismo registro.
            </Alert>
          </Grid>
        ) : null}

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardHeader title='Datos personales' />
            <CardContent className='flex flex-col gap-5'>
              <Grid container spacing={5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='firstName'
                    control={control}
                    rules={{
                      required: 'El nombre es obligatorio.',
                      maxLength: { value: 100, message: 'Máximo 100 caracteres.' }
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Nombres'
                        placeholder='María'
                        disabled={isView || isSubmitting}
                        {...(errors.firstName && { error: true, helperText: errors.firstName.message })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='lastName'
                    control={control}
                    rules={{
                      required: 'Los apellidos son obligatorios.',
                      maxLength: { value: 100, message: 'Máximo 100 caracteres.' }
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Apellidos'
                        placeholder='Quispe Huamán'
                        disabled={isView || isSubmitting}
                        {...(errors.lastName && { error: true, helperText: errors.lastName.message })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='phone'
                    control={control}
                    rules={{ maxLength: { value: 20, message: 'Máximo 20 caracteres.' } }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Teléfono'
                        placeholder='987654321'
                        disabled={isView || isSubmitting}
                        {...(errors.phone && { error: true, helperText: errors.phone.message })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='email'
                    control={control}
                    rules={{
                      maxLength: { value: 100, message: 'Máximo 100 caracteres.' },
                      validate: value =>
                        !value.trim() ||
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
                        'Ingresa un correo válido.'
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type='email'
                        label='Correo'
                        placeholder='maria.quispe@gmail.com'
                        disabled={isView || isSubmitting}
                        {...(errors.email && { error: true, helperText: errors.email.message })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Controller
                    name='address'
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Dirección'
                        placeholder='Jr. Cusco 456, Arequipa'
                        disabled={isView || isSubmitting}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Controller
                    name='notes'
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        multiline
                        minRows={5}
                        label='Notas internas'
                        placeholder='Prefiere habitación en piso alto, alergias, etc.'
                        disabled={isView || isSubmitting}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardHeader title='Documento' />
            <CardContent className='flex flex-col gap-5'>
              <FormControl fullWidth error={Boolean(errors.documentType)}>
                <InputLabel id='guest-document-type'>Tipo de documento</InputLabel>
                <Controller
                  name='documentType'
                  control={control}
                  rules={{
                    validate: value =>
                      Boolean(value) === Boolean(documentNumber.trim()) ||
                      'El tipo y el número de documento deben enviarse juntos.'
                  }}
                  render={({ field }) => (
                    <Select {...field} label='Tipo de documento' labelId='guest-document-type' disabled={isView || isSubmitting}>
                      <MenuItem value=''>Ninguno</MenuItem>
                      {DOCUMENT_TYPES.map(item => (
                        <MenuItem key={item} value={item}>
                          {DOCUMENT_TYPE_LABELS[item]}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                {errors.documentType ? <FormHelperText>{errors.documentType.message}</FormHelperText> : null}
              </FormControl>

              <Controller
                name='documentNumber'
                control={control}
                rules={{
                  maxLength: { value: 20, message: 'Máximo 20 caracteres.' },
                  validate: value =>
                    Boolean(value.trim()) === Boolean(documentType) ||
                    'El tipo y el número de documento deben enviarse juntos.'
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label='Número de documento'
                    placeholder='45678912'
                    disabled={isView || isSubmitting}
                    {...(errors.documentNumber && { error: true, helperText: errors.documentNumber.message })}
                  />
                )}
              />

              <Controller
                name='birthDate'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type='date'
                    label='Fecha de nacimiento'
                    slotProps={{ inputLabel: { shrink: true } }}
                    disabled={isView || isSubmitting}
                  />
                )}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </form>
  )
}

export default GuestForm
