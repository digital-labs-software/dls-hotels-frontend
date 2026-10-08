'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { Controller, useForm } from 'react-hook-form'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { PropertySettings, UpdatePropertySettingsInput } from '@/types/apps/hotelSettingsTypes'
import { PROPERTY_CATEGORY_LABELS } from '@/types/apps/hotelSettingsTypes'
import { getHotelSettingsApiErrorMessage, hotelSettingsApi } from '@/libs/hotelSettingsApi'
import { getUploadsApiErrorMessage, uploadHotelLogo } from '@/libs/uploadsApi'
import HotelLogoField from './HotelLogoField'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { getLocalizedUrl } from '@/utils/i18n'
import type { Locale } from '@configs/i18n'

type FormValues = {
  tradeName: string
  description: string
  phone: string
  whatsapp: string
  email: string
  website: string
  address: string
  checkInTime: string
  checkOutTime: string
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/
const URL_REGEX = /^https?:\/\/.+/i

const emptyToNull = (value: string) => {
  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

const toFormValues = (settings: PropertySettings): FormValues => ({
  tradeName: settings.tradeName ?? '',
  description: settings.description ?? '',
  phone: settings.phone ?? '',
  whatsapp: settings.whatsapp ?? '',
  email: settings.email ?? '',
  website: settings.website ?? '',
  address: settings.address ?? '',
  checkInTime: settings.checkInTime,
  checkOutTime: settings.checkOutTime
})

const buildChangedPayload = (initial: FormValues, current: FormValues): UpdatePropertySettingsInput => {
  const payload: UpdatePropertySettingsInput = {}

  if (current.address.trim() !== initial.address.trim()) {
    payload.address = current.address.trim()
  }

  if (current.phone.trim() !== initial.phone.trim()) {
    payload.phone = current.phone.trim()
  }

  if (current.email.trim() !== initial.email.trim()) {
    payload.email = current.email.trim()
  }

  if (emptyToNull(current.tradeName) !== emptyToNull(initial.tradeName)) {
    payload.tradeName = emptyToNull(current.tradeName)
  }

  if (emptyToNull(current.description) !== emptyToNull(initial.description)) {
    payload.description = emptyToNull(current.description)
  }

  if (emptyToNull(current.whatsapp) !== emptyToNull(initial.whatsapp)) {
    payload.whatsapp = emptyToNull(current.whatsapp)
  }

  if (emptyToNull(current.website) !== emptyToNull(initial.website)) {
    payload.website = emptyToNull(current.website)
  }

  if (current.checkInTime !== initial.checkInTime) {
    payload.checkInTime = current.checkInTime
  }

  if (current.checkOutTime !== initial.checkOutTime) {
    payload.checkOutTime = current.checkOutTime
  }

  return payload
}

const HotelSettingsForm = () => {
  const { data: session, status: sessionStatus } = useSession()
  const { lang: locale } = useParams()
  const { canSettingsInvoices } = useSubscriptionAccess()
  const propertyId = session?.user?.propertyId ?? 1

  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<PropertySettings | null>(null)
  const [initialValues, setInitialValues] = useState<FormValues | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [logoFieldKey, setLogoFieldKey] = useState(0)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      tradeName: '',
      description: '',
      phone: '',
      whatsapp: '',
      email: '',
      website: '',
      address: '',
      checkInTime: '14:00',
      checkOutTime: '12:00'
    }
  })

  useEffect(() => {
    if (sessionStatus === 'loading') {
      return
    }

    const load = async () => {
      try {
        const nextSettings = await hotelSettingsApi.get(propertyId)
        const values = toFormValues(nextSettings)

        setSettings(nextSettings)
        setInitialValues(values)
        reset(values)
      } catch (error) {
        toast.error(getHotelSettingsApiErrorMessage(error, 'No se pudo cargar la configuración del hotel.'))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [propertyId, reset, sessionStatus])

  const onSubmit = async (data: FormValues) => {
    if (!initialValues) {
      return
    }

    const payload = buildChangedPayload(initialValues, data)
    const hadLogoChange = Boolean(logoFile) || removeLogo

    if (logoFile) {
      try {
        payload.logoUrl = await uploadHotelLogo(propertyId, logoFile)
      } catch (error) {
        toast.error(getUploadsApiErrorMessage(error, 'No se pudo subir el logo.'))

        if (Object.keys(payload).length === 0) {
          return
        }
      }
    } else if (removeLogo) {
      payload.logoUrl = null
    }

    if (Object.keys(payload).length === 0) {
      toast.info(hadLogoChange ? 'No se pudo guardar el logo.' : 'No hay cambios para guardar.')

      return
    }

    try {
      const updated = await hotelSettingsApi.update(propertyId, payload)
      const values = toFormValues(updated)

      setSettings(updated)
      setInitialValues(values)
      setLogoFile(null)
      setRemoveLogo(false)
      setLogoFieldKey(key => key + 1)
      reset(values)
      toast.success('Datos del hotel actualizados.')
    } catch (error) {
      toast.error(getHotelSettingsApiErrorMessage(error, 'No se pudieron guardar los datos del hotel.'))
    }
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center p-10'>
        <CircularProgress size={32} />
      </div>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardContent>
          <Typography>No se encontró la configuración del hotel.</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-6'>
            <div>
              <Typography variant='h4' className='mbe-1'>
                {settings.name}
              </Typography>
              <Typography>Datos del hotel. Algunos campos solo los cambia el panel DLS.</Typography>
            </div>
            <div className='flex flex-wrap max-sm:flex-col gap-4'>
              <Button
                variant='outlined'
                color='secondary'
                type='button'
                disabled={isSubmitting || !initialValues}
                onClick={() => {
                  if (!initialValues) {
                    return
                  }

                  reset(initialValues)
                  setLogoFile(null)
                  setRemoveLogo(false)
                  setLogoFieldKey(key => key + 1)
                }}
              >
                Descartar
              </Button>
              <Button variant='contained' type='submit' disabled={isSubmitting}>
                {isSubmitting ? <CircularProgress size={20} color='inherit' /> : 'Guardar'}
              </Button>
            </div>
          </div>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }} className='flex flex-col gap-6'>
          <Card>
            <CardHeader title='Identidad y contacto' />
            <CardContent>
              <Grid container spacing={5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='tradeName'
                    control={control}
                    rules={{ maxLength: { value: 150, message: 'Máximo 150 caracteres.' } }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Nombre comercial'
                        placeholder='Hotel Costa Verde'
                        disabled={isSubmitting}
                        {...(errors.tradeName && { error: true, helperText: errors.tradeName.message })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='phone'
                    control={control}
                    rules={{
                      required: 'El teléfono es obligatorio.',
                      maxLength: { value: 20, message: 'Máximo 20 caracteres.' }
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Teléfono / celular'
                        placeholder='999888777'
                        disabled={isSubmitting}
                        {...(errors.phone && { error: true, helperText: errors.phone.message })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='whatsapp'
                    control={control}
                    rules={{ maxLength: { value: 20, message: 'Máximo 20 caracteres.' } }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='WhatsApp (opcional)'
                        placeholder='Si es el mismo celular, puedes dejarlo vacío'
                        disabled={isSubmitting}
                        {...(errors.whatsapp && { error: true, helperText: errors.whatsapp.message })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='email'
                    control={control}
                    rules={{
                      required: 'El correo es obligatorio.',
                      maxLength: { value: 100, message: 'Máximo 100 caracteres.' },
                      validate: value =>
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || 'Ingresa un correo válido.'
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type='email'
                        label='Correo de contacto'
                        placeholder='contacto@hotel.com'
                        disabled={isSubmitting}
                        {...(errors.email && { error: true, helperText: errors.email.message })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Controller
                    name='website'
                    control={control}
                    rules={{
                      maxLength: { value: 255, message: 'Máximo 255 caracteres.' },
                      validate: value => !value.trim() || URL_REGEX.test(value.trim()) || 'Debe iniciar con http:// o https://'
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Sitio web'
                        placeholder='https://hotel-costa-verde.com'
                        disabled={isSubmitting}
                        {...(errors.website && { error: true, helperText: errors.website.message })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
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
                        placeholder='Hotel frente al mar con vista panorámica.'
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <HotelLogoField
                    key={logoFieldKey}
                    logoUrl={removeLogo ? null : settings.logoUrl}
                    disabled={isSubmitting}
                    onFileChange={file => {
                      setLogoFile(file)
                      setRemoveLogo(false)
                    }}
                    onRemove={() => {
                      setLogoFile(null)
                      setRemoveLogo(true)
                    }}
                    onInvalidFile={message => toast.error(message)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title='Ubicación' subheader='El distrito lo registra DLS. Puedes corregir la calle.' />
            <CardContent>
              <Grid container spacing={5}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField fullWidth label='Departamento' value={settings.location?.departmentName || '—'} disabled />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField fullWidth label='Provincia' value={settings.location?.provinceName || '—'} disabled />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField fullWidth label='Distrito' value={settings.location?.districtName || '—'} disabled />
                </Grid>
                <Grid size={{ xs: 12 }}>
              <Controller
                name='address'
                control={control}
                rules={{ required: 'La dirección es obligatoria.' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label='Dirección'
                    placeholder='Av. Costanera 123'
                    disabled={isSubmitting}
                    {...(errors.address && { error: true, helperText: errors.address.message })}
                  />
                )}
              />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card className='mbe-6'>
            <CardHeader title='Datos del sistema' subheader='Solo lectura' />
            <CardContent className='flex flex-col gap-5'>
              <TextField fullWidth label='Nombre del hotel' value={settings.name} disabled />
              <TextField fullWidth label='Dominio' value={settings.domain} disabled />
              <TextField
                fullWidth
                label='Categoría'
                value={PROPERTY_CATEGORY_LABELS[settings.category] || settings.category}
                disabled
              />
              <TextField fullWidth label='RUC' value={settings.taxNumber || '—'} disabled />
              <TextField fullWidth label='Razón social' value={settings.businessName || '—'} disabled />
            </CardContent>
          </Card>

          {canSettingsInvoices ? (
            <Card className='mbe-6'>
              <CardHeader title='Series y SUNAT' subheader='IGV, series y NubeFact' />
              <CardContent className='flex flex-col gap-3'>
                <Typography color='text.secondary'>
                  Se configura al activar el hotel o cambiar series e IGV. Para emitir boletas o facturas, usa Facturación.
                </Typography>
                <Button
                  variant='outlined'
                  component={Link}
                  href={getLocalizedUrl('/apps/hotel/einvoice', locale as Locale)}
                >
                  Abrir Series y SUNAT
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader title='Horarios' />
            <CardContent className='flex flex-col gap-5'>
              <Controller
                name='checkInTime'
                control={control}
                rules={{
                  required: 'La hora de ingreso (check-in) es obligatoria.',
                  validate: value => TIME_REGEX.test(value) || 'Usa el formato HH:mm.'
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type='time'
                    label='Check-in (ingreso)'
                    helperText={errors.checkInTime ? undefined : 'Hora a la que el huésped entra a la habitación.'}
                    slotProps={{ inputLabel: { shrink: true } }}
                    disabled={isSubmitting}
                    {...(errors.checkInTime && { error: true, helperText: errors.checkInTime.message })}
                  />
                )}
              />
              <Controller
                name='checkOutTime'
                control={control}
                rules={{
                  required: 'La hora de salida (check-out) es obligatoria.',
                  validate: value => TIME_REGEX.test(value) || 'Usa el formato HH:mm.'
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type='time'
                    label='Check-out (salida)'
                    helperText={errors.checkOutTime ? undefined : 'Hora a la que el huésped deja la habitación.'}
                    slotProps={{ inputLabel: { shrink: true } }}
                    disabled={isSubmitting}
                    {...(errors.checkOutTime && { error: true, helperText: errors.checkOutTime.message })}
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

export default HotelSettingsForm
