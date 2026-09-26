'use client'

import { useEffect, useState } from 'react'

import { useParams, useRouter, useSearchParams } from 'next/navigation'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
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
import type { CompanyType } from '@/types/apps/clientsTypes'
import { COMPANY_TYPE_LABELS, COMPANY_TYPES } from '@/types/apps/clientsTypes'
import { companiesApi, getClientsApiErrorMessage } from '@/libs/clientsApi'
import { getLocalizedUrl } from '@/utils/i18n'

type FormValues = {
  businessName: string
  tradeName: string
  companyType: CompanyType
  taxNumber: string
  phone: string
  email: string
  address: string
}

type Props = {
  uuid?: string
}

const CompanyForm = ({ uuid }: Props) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const { data: session, status: sessionStatus } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const isView = searchParams.get('mode') === 'view'
  const isEdit = Boolean(uuid) && !isView
  const [loading, setLoading] = useState(Boolean(uuid))

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      businessName: '',
      tradeName: '',
      companyType: 'CORPORATE',
      taxNumber: '',
      phone: '',
      email: '',
      address: ''
    }
  })

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
        const company = await companiesApi.get(propertyId, uuid)

        reset({
          businessName: company.businessName,
          tradeName: company.tradeName ?? '',
          companyType: company.companyType,
          taxNumber: company.taxNumber ?? '',
          phone: company.phone ?? '',
          email: company.email ?? '',
          address: company.address ?? ''
        })
      } catch (error) {
        toast.error(getClientsApiErrorMessage(error, 'No se encontró la empresa solicitada.'))
        router.replace(getLocalizedUrl('/apps/clients?tab=companies', locale as Locale))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [locale, propertyId, reset, router, sessionStatus, uuid])

  const goBack = () => {
    router.push(getLocalizedUrl('/apps/clients?tab=companies', locale as Locale))
  }

  const onSubmit = async (data: FormValues) => {
    if (isView) {
      return
    }

    try {
      const payload = {
        businessName: data.businessName.trim(),
        companyType: data.companyType,
        taxNumber: data.taxNumber.trim() || null,
        tradeName: data.tradeName.trim() || null,
        phone: data.phone.trim() || null,
        email: data.email.trim() || null,
        address: data.address.trim() || null
      }

      if (isEdit && uuid) {
        await companiesApi.update(propertyId, uuid, payload)
        toast.success('Empresa actualizada.')
      } else {
        await companiesApi.create(propertyId, payload)
        toast.success('Empresa creada.')
      }

      goBack()
    } catch (error) {
      toast.error(getClientsApiErrorMessage(error, 'No se pudo guardar la empresa.'))
    }
  }

  const title = isView ? 'Ver empresa' : isEdit ? 'Editar empresa' : 'Nueva empresa'

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
                  ? 'Consulta los datos de la empresa'
                  : isEdit
                    ? 'Actualiza la razón social, el tipo o los datos de contacto.'
                    : 'Registra una empresa, institución o agencia'}
              </Typography>
            </div>
            <div className='flex flex-wrap max-sm:flex-col gap-4'>
              <Button variant='outlined' color='secondary' type='button' onClick={goBack}>
                {isView ? 'Volver' : 'Descartar'}
              </Button>
              {!isView ? (
                <Button variant='contained' type='submit' disabled={isSubmitting}>
                  {isSubmitting ? <CircularProgress size={20} color='inherit' /> : isEdit ? 'Guardar' : 'Guardar empresa'}
                </Button>
              ) : null}
            </div>
          </div>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardHeader title='Datos de la empresa' />
            <CardContent className='flex flex-col gap-5'>
              <Controller
                name='businessName'
                control={control}
                rules={{
                  required: 'La razón social es obligatoria.',
                  maxLength: { value: 150, message: 'Máximo 150 caracteres.' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label='Razón social'
                    placeholder='Viajes Andinos S.A.C.'
                    disabled={isView || isSubmitting}
                    {...(errors.businessName && { error: true, helperText: errors.businessName.message })}
                  />
                )}
              />
              <Controller
                name='tradeName'
                control={control}
                rules={{ maxLength: { value: 150, message: 'Máximo 150 caracteres.' } }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label='Nombre comercial'
                    placeholder='Viajes Andinos'
                    disabled={isView || isSubmitting}
                    {...(errors.tradeName && { error: true, helperText: errors.tradeName.message })}
                  />
                )}
              />
              <Grid container spacing={5}>
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
                        placeholder='014567890'
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
                        placeholder='reservas@viajesandinos.pe'
                        disabled={isView || isSubmitting}
                        {...(errors.email && { error: true, helperText: errors.email.message })}
                      />
                    )}
                  />
                </Grid>
              </Grid>
              <Controller
                name='address'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    minRows={4}
                    label='Dirección fiscal'
                    placeholder='Av. Larco 123, Miraflores'
                    disabled={isView || isSubmitting}
                  />
                )}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardHeader title='Clasificación' />
            <CardContent className='flex flex-col gap-5'>
              <FormControl fullWidth>
                <InputLabel id='company-type'>Tipo</InputLabel>
                <Controller
                  name='companyType'
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select {...field} label='Tipo' labelId='company-type' disabled={isView || isSubmitting}>
                      {COMPANY_TYPES.map(item => (
                        <MenuItem key={item} value={item}>
                          {COMPANY_TYPE_LABELS[item]}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
              <Controller
                name='taxNumber'
                control={control}
                rules={{ maxLength: { value: 20, message: 'Máximo 20 caracteres.' } }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label='RUC'
                    placeholder='20123456789'
                    disabled={isView || isSubmitting}
                    {...(errors.taxNumber && { error: true, helperText: errors.taxNumber.message })}
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

export default CompanyForm
