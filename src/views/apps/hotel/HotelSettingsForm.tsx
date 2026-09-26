'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
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

import type { GeoItem, PropertySettings, UpdatePropertySettingsInput } from '@/types/apps/hotelSettingsTypes'
import { PROPERTY_CATEGORY_LABELS } from '@/types/apps/hotelSettingsTypes'
import { getHotelSettingsApiErrorMessage, hotelSettingsApi, locationApi } from '@/libs/hotelSettingsApi'

type FormValues = {
  tradeName: string
  description: string
  logoUrl: string
  phone: string
  whatsapp: string
  email: string
  website: string
  address: string
  departmentId: number | ''
  provinceId: number | ''
  districtId: number | ''
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
  logoUrl: settings.logoUrl ?? '',
  phone: settings.phone ?? '',
  whatsapp: settings.whatsapp ?? '',
  email: settings.email ?? '',
  website: settings.website ?? '',
  address: settings.address ?? '',
  departmentId: settings.location?.departmentId ?? '',
  provinceId: settings.location?.provinceId ?? '',
  districtId: settings.districtId ?? settings.location?.districtId ?? '',
  checkInTime: settings.checkInTime,
  checkOutTime: settings.checkOutTime
})

const buildChangedPayload = (initial: FormValues, current: FormValues): UpdatePropertySettingsInput => {
  const payload: UpdatePropertySettingsInput = {}

  if (Number(current.districtId) !== Number(initial.districtId)) {
    payload.districtId = Number(current.districtId)
  }

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

  if (emptyToNull(current.logoUrl) !== emptyToNull(initial.logoUrl)) {
    payload.logoUrl = emptyToNull(current.logoUrl)
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
  const propertyId = session?.user?.propertyId ?? 1

  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<PropertySettings | null>(null)
  const [initialValues, setInitialValues] = useState<FormValues | null>(null)
  const [departments, setDepartments] = useState<GeoItem[]>([])
  const [provinces, setProvinces] = useState<GeoItem[]>([])
  const [districts, setDistricts] = useState<GeoItem[]>([])
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      tradeName: '',
      description: '',
      logoUrl: '',
      phone: '',
      whatsapp: '',
      email: '',
      website: '',
      address: '',
      departmentId: '',
      provinceId: '',
      districtId: '',
      checkInTime: '14:00',
      checkOutTime: '12:00'
    }
  })

  const logoUrl = watch('logoUrl')
  const departmentId = watch('departmentId')
  const provinceId = watch('provinceId')

  useEffect(() => {
    if (sessionStatus === 'loading') {
      return
    }

    const load = async () => {
      try {
        const [nextSettings, nextDepartments] = await Promise.all([
          hotelSettingsApi.get(propertyId),
          locationApi.departments()
        ])

        const values = toFormValues(nextSettings)
        const [nextProvinces, nextDistricts] = await Promise.all([
          values.departmentId ? locationApi.provincesByDepartment(Number(values.departmentId)) : Promise.resolve([]),
          values.provinceId ? locationApi.districtsByProvince(Number(values.provinceId)) : Promise.resolve([])
        ])

        setSettings(nextSettings)
        setDepartments(nextDepartments)
        setProvinces(nextProvinces)
        setDistricts(nextDistricts)
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

  const handleDepartmentChange = async (value: number | '') => {
    setValue('departmentId', value)
    setValue('provinceId', '')
    setValue('districtId', '')
    setDistricts([])

    if (!value) {
      setProvinces([])

      return
    }

    setLoadingProvinces(true)

    try {
      setProvinces(await locationApi.provincesByDepartment(Number(value)))
    } catch (error) {
      toast.error(getHotelSettingsApiErrorMessage(error, 'No se pudieron cargar las provincias.'))
      setProvinces([])
    } finally {
      setLoadingProvinces(false)
    }
  }

  const handleProvinceChange = async (value: number | '') => {
    setValue('provinceId', value)
    setValue('districtId', '')

    if (!value) {
      setDistricts([])

      return
    }

    setLoadingDistricts(true)

    try {
      setDistricts(await locationApi.districtsByProvince(Number(value)))
    } catch (error) {
      toast.error(getHotelSettingsApiErrorMessage(error, 'No se pudieron cargar los distritos.'))
      setDistricts([])
    } finally {
      setLoadingDistricts(false)
    }
  }

  const onSubmit = async (data: FormValues) => {
    if (!initialValues) {
      return
    }

    const payload = buildChangedPayload(initialValues, data)

    if (Object.keys(payload).length === 0) {
      toast.info('No hay cambios para guardar.')

      return
    }

    try {
      const updated = await hotelSettingsApi.update(propertyId, payload)
      const values = toFormValues(updated)

      setSettings(updated)
      setInitialValues(values)
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
                {settings.tradeName || settings.name}
              </Typography>
              <Typography>Datos del hotel. Algunos campos solo los cambia el panel DLS.</Typography>
            </div>
            <div className='flex flex-wrap max-sm:flex-col gap-4'>
              <Button
                variant='outlined'
                color='secondary'
                type='button'
                disabled={isSubmitting || !initialValues}
                onClick={() => initialValues && reset(initialValues)}
              >
                Descartar
              </Button>
              <Button variant='contained' type='submit' disabled={isSubmitting}>
                {isSubmitting ? <CircularProgress size={20} color='inherit' /> : 'Guardar'}
              </Button>
            </div>
          </div>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
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
                <Grid size={{ xs: 12, sm: logoUrl.trim() ? 8 : 12 }}>
                  <Controller
                    name='logoUrl'
                    control={control}
                    rules={{
                      validate: value => !value.trim() || URL_REGEX.test(value.trim()) || 'Debe iniciar con http:// o https://'
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='URL del logo'
                        placeholder='https://cdn.dls-hotels.com/logos/hotel.png'
                        disabled={isSubmitting}
                        {...(errors.logoUrl && { error: true, helperText: errors.logoUrl.message })}
                      />
                    )}
                  />
                </Grid>
                {logoUrl.trim() ? (
                  <Grid size={{ xs: 12, sm: 4 }} className='flex items-center'>
                    <img src={logoUrl} alt='Logo del hotel' className='max-h-[72px] max-w-full rounded border' />
                  </Grid>
                ) : null}
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

          <Card>
            <CardHeader title='Horarios' />
            <CardContent className='flex flex-col gap-5'>
              <Controller
                name='checkInTime'
                control={control}
                rules={{
                  required: 'La hora de check-in es obligatoria.',
                  validate: value => TIME_REGEX.test(value) || 'Usa el formato HH:mm.'
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type='time'
                    label='Check-in'
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
                  required: 'La hora de check-out es obligatoria.',
                  validate: value => TIME_REGEX.test(value) || 'Usa el formato HH:mm.'
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type='time'
                    label='Check-out'
                    slotProps={{ inputLabel: { shrink: true } }}
                    disabled={isSubmitting}
                    {...(errors.checkOutTime && { error: true, helperText: errors.checkOutTime.message })}
                  />
                )}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title='Ubicación' />
            <CardContent>
              <Grid container spacing={5}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth error={Boolean(errors.departmentId)}>
                    <InputLabel id='hotel-department'>Departamento</InputLabel>
                    <Controller
                      name='departmentId'
                      control={control}
                      rules={{ required: 'El departamento es obligatorio.' }}
                      render={({ field }) => (
                        <Select
                          {...field}
                          label='Departamento'
                          labelId='hotel-department'
                          disabled={isSubmitting}
                          onChange={event => handleDepartmentChange(event.target.value as number | '')}
                        >
                          {departments.map(item => (
                            <MenuItem key={item.id} value={item.id}>
                              {item.name}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                    {errors.departmentId ? <FormHelperText>{errors.departmentId.message}</FormHelperText> : null}
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth error={Boolean(errors.provinceId)}>
                    <InputLabel id='hotel-province'>Provincia</InputLabel>
                    <Controller
                      name='provinceId'
                      control={control}
                      rules={{ required: 'La provincia es obligatoria.' }}
                      render={({ field }) => (
                        <Select
                          {...field}
                          label='Provincia'
                          labelId='hotel-province'
                          disabled={isSubmitting || !departmentId || loadingProvinces}
                          onChange={event => handleProvinceChange(event.target.value as number | '')}
                        >
                          {provinces.map(item => (
                            <MenuItem key={item.id} value={item.id}>
                              {item.name}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                    {errors.provinceId ? <FormHelperText>{errors.provinceId.message}</FormHelperText> : null}
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth error={Boolean(errors.districtId)}>
                    <InputLabel id='hotel-district'>Distrito</InputLabel>
                    <Controller
                      name='districtId'
                      control={control}
                      rules={{ required: 'El distrito es obligatorio.' }}
                      render={({ field }) => (
                        <Select {...field} label='Distrito' labelId='hotel-district' disabled={isSubmitting || !provinceId || loadingDistricts}>
                          {districts.map(item => (
                            <MenuItem key={item.id} value={item.id}>
                              {item.name}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                    {errors.districtId ? <FormHelperText>{errors.districtId.message}</FormHelperText> : null}
                  </FormControl>
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
                        placeholder='Av. Costanera 123, Miraflores'
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
      </Grid>
    </form>
  )
}

export default HotelSettingsForm
