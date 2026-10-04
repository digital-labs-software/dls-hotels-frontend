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
import { isCompleteDocument, useDocumentLookup } from '@/hooks/useDocumentLookup'
import { useExistingRecord } from '@/hooks/useExistingRecord'
import { DocumentLookupAdornment, DocumentLookupHelper } from '@/components/document-lookup/DocumentLookupHelper'
import ExistingRecordAlert from '@/components/document-lookup/ExistingRecordAlert'

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
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      documentType: uuid ? '' : 'DNI',
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

  const dniLookup = useDocumentLookup('DNI', data => {
    const options = { shouldValidate: true, shouldDirty: true }

    if (data.firstName) setValue('firstName', data.firstName, options)
    if (data.lastName) setValue('lastName', data.lastName, options)
    if (data.birthDate) setValue('birthDate', data.birthDate, options)
  })

  const existingGuest = useExistingRecord(async (query: { type: DocumentType; number: string }) => {
    const guest = await guestsApi.findByDocument(propertyId, query.type, query.number)

    return guest && guest.uuid !== uuid ? guest : null
  })

  /** Primero busca el documento entre los huéspedes del hotel; solo si no existe consulta RENIEC. */
  const checkDocument = async (type: DocumentType | '', raw: string) => {
    const number = raw.trim()
    const complete = type === 'DNI' ? isCompleteDocument('DNI', number) : Boolean(number)

    if (!type || !complete) {
      existingGuest.clear()

      if (type === 'DNI') dniLookup.lookup(number)
      else dniLookup.reset()

      return
    }

    const found = await existingGuest.check({ type, number })

    if (found === undefined) return

    if (found) {
      dniLookup.reset()
    } else if (type === 'DNI') {
      dniLookup.lookup(number)
    }
  }

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

  const openExistingGuest = () => {
    if (!existingGuest.record) return

    router.push(getLocalizedUrl(`/apps/clients/guests/edit/${existingGuest.record.uuid}`, locale as Locale))
  }

  const onSubmit = async (data: FormValues) => {
    if (isView) {
      return
    }

    if (existingGuest.record) {
      toast.error('Ya existe un huésped con ese documento. Ábrelo para actualizar sus datos.')

      return
    }

    const number = data.documentNumber.trim()

    try {
      const payload = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        documentType: number ? data.documentType || null : null,
        documentNumber: number || null,
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
  const isDni = documentType === 'DNI'
  const existing = isView ? null : existingGuest.record

  const documentHelper = () => {
    if (errors.documentNumber?.message) return errors.documentNumber.message
    if (isView) return undefined
    if (existingGuest.checking) return 'Verificando si ya está registrado…'
    if (existing) return undefined

    if (isDni) {
      return dniLookup.status === 'idle' ? (
        'Al completar los 8 dígitos se cargan los datos de RENIEC.'
      ) : (
        <DocumentLookupHelper lookup={dniLookup} />
      )
    }

    return documentType ? 'Al salir del campo se verifica si ya está registrado.' : undefined
  }

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
                    : 'Digita el documento: si ya está registrado te avisamos, si no, se cargan sus datos.'}
              </Typography>
            </div>
            <div className='flex flex-wrap max-sm:flex-col gap-4'>
              <Button variant='outlined' color='secondary' type='button' onClick={goBack}>
                {isView ? 'Volver' : 'Descartar'}
              </Button>
              {!isView ? (
                <Button variant='contained' type='submit' disabled={isSubmitting || Boolean(existing)}>
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
          <div className='flex flex-col gap-6'>
            <Card>
              <CardHeader title='Documento de identidad' />
              <CardContent>
                <Grid container spacing={5}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel id='guest-document-type'>Tipo de documento</InputLabel>
                      <Controller
                        name='documentType'
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            label='Tipo de documento'
                            labelId='guest-document-type'
                            disabled={isView || isSubmitting}
                            onChange={event => {
                              const nextType = event.target.value as DocumentType | ''
                              let nextNumber = documentNumber

                              if (nextType === 'DNI') {
                                nextNumber = documentNumber.replace(/\D/g, '').slice(0, 8)
                                if (nextNumber !== documentNumber) setValue('documentNumber', nextNumber)
                              }

                              field.onChange(event)
                              void checkDocument(nextType, nextNumber)
                            }}
                          >
                            <MenuItem value=''>Sin documento</MenuItem>
                            {DOCUMENT_TYPES.map(item => (
                              <MenuItem key={item} value={item}>
                                {DOCUMENT_TYPE_LABELS[item]}
                              </MenuItem>
                            ))}
                          </Select>
                        )}
                      />
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <Controller
                      name='documentNumber'
                      control={control}
                      rules={{
                        maxLength: { value: 20, message: 'Máximo 20 caracteres.' },
                        validate: value => {
                          const number = value.trim()

                          if (!number) return true
                          if (!documentType) return 'Selecciona el tipo de documento.'

                          if (documentType === 'DNI' && !isCompleteDocument('DNI', number)) {
                            return 'El DNI debe tener 8 dígitos.'
                          }

                          return true
                        }
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          autoFocus={!uuid && !isView}
                          label='Número de documento'
                          placeholder={isDni ? '45678912' : 'Número de documento'}
                          disabled={isView || isSubmitting}
                          onChange={event => {
                            const value = isDni ? event.target.value.replace(/\D/g, '').slice(0, 8) : event.target.value

                            field.onChange(value)

                            if (isDni) void checkDocument('DNI', value)
                            else existingGuest.clear()
                          }}
                          onBlur={() => {
                            field.onBlur()
                            if (!isDni) void checkDocument(documentType, documentNumber)
                          }}
                          error={Boolean(errors.documentNumber)}
                          helperText={documentHelper()}
                          slotProps={{
                            htmlInput: isDni ? { inputMode: 'numeric' } : undefined,
                            input:
                              isDni && !isView
                                ? {
                                    endAdornment: (
                                      <DocumentLookupAdornment
                                        lookup={dniLookup}
                                        canSearch={isCompleteDocument('DNI', documentNumber) && !existing}
                                        onSearch={() => dniLookup.lookup(documentNumber, { force: true })}
                                      />
                                    )
                                  }
                                : undefined
                          }}
                        />
                      )}
                    />
                  </Grid>
                  {existing ? (
                    <Grid size={{ xs: 12 }}>
                      <ExistingRecordAlert
                        title='Este documento ya está registrado como huésped'
                        name={`${existing.person.firstName} ${existing.person.lastName}`}
                        details={[
                          existing.person.phone && `Tel. ${existing.person.phone}`,
                          existing.person.email
                        ]}
                        actionLabel='Abrir huésped'
                        onAction={openExistingGuest}
                      />
                    </Grid>
                  ) : null}
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title='Datos personales' />
              <CardContent>
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
                  <Grid size={{ xs: 12, sm: 4 }}>
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
                  </Grid>
                  <Grid size={{ xs: 12, sm: 8 }}>
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
                </Grid>
              </CardContent>
            </Card>
          </div>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardHeader title='Notas internas' />
            <CardContent>
              <Controller
                name='notes'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    minRows={8}
                    label='Notas'
                    placeholder='Prefiere habitación en piso alto, alergias, etc.'
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
