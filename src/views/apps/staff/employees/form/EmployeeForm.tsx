'use client'

import { useEffect, useState } from 'react'

import { useParams, useRouter, useSearchParams } from 'next/navigation'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import OutlinedInput from '@mui/material/OutlinedInput'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { Controller, useForm } from 'react-hook-form'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { Locale } from '@configs/i18n'
import type { DocumentType } from '@/types/apps/clientsTypes'
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from '@/types/apps/clientsTypes'
import type { Role } from '@/types/apps/staffTypes'
import { employeesApi, getStaffApiErrorMessage, rolesApi } from '@/libs/staffApi'
import { getLocalizedUrl } from '@/utils/i18n'

type FormValues = {
  firstName: string
  lastName: string
  email: string
  password: string
  documentType: DocumentType | ''
  documentNumber: string
  phone: string
  address: string
  birthDate: string
  jobTitle: string
  hireDate: string
  terminationDate: string
  roleIds: number[]
  primaryRoleId: number | ''
}

type Props = {
  uuid?: string
}

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '')

const EmployeeForm = ({ uuid }: Props) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const { data: session, status: sessionStatus } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const isView = searchParams.get('mode') === 'view'
  const isEdit = Boolean(uuid) && !isView
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<Role[]>([])

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      documentType: '',
      documentNumber: '',
      phone: '',
      address: '',
      birthDate: '',
      jobTitle: '',
      hireDate: '',
      terminationDate: '',
      roleIds: [],
      primaryRoleId: ''
    }
  })

  const documentType = watch('documentType')
  const documentNumber = watch('documentNumber')
  const roleIds = watch('roleIds')

  useEffect(() => {
    if (sessionStatus === 'loading') {
      return
    }

    const load = async () => {
      try {
        const catalog = await rolesApi.list(propertyId)

        setRoles(catalog)

        if (!uuid) {
          setLoading(false)

          return
        }

        const employee = await employeesApi.get(propertyId, uuid)
        const assignedIds = employee.roles.map(role => role.id)
        const primary = employee.roles.find(role => role.isPrimary)

        reset({
          firstName: employee.person.firstName,
          lastName: employee.person.lastName,
          email: employee.user?.email || employee.person.email || '',
          password: '',
          documentType: employee.person.documentType ?? '',
          documentNumber: employee.person.documentNumber ?? '',
          phone: employee.person.phone ?? '',
          address: employee.person.address ?? '',
          birthDate: toDateInput(employee.person.birthDate),
          jobTitle: employee.jobTitle ?? '',
          hireDate: toDateInput(employee.hireDate),
          terminationDate: toDateInput(employee.terminationDate),
          roleIds: assignedIds,
          primaryRoleId: primary?.id ?? assignedIds[0] ?? ''
        })
      } catch (error) {
        toast.error(getStaffApiErrorMessage(error, 'No se pudieron cargar los datos del empleado.'))
        router.replace(getLocalizedUrl('/apps/staff', locale as Locale))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [locale, propertyId, reset, router, sessionStatus, uuid])

  const goBack = () => {
    router.push(getLocalizedUrl('/apps/staff', locale as Locale))
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

    const primaryRoleId = data.primaryRoleId === '' ? data.roleIds[0] : Number(data.primaryRoleId)

    try {
      const payload = {
        email: data.email.trim(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        password: data.password.trim() || undefined,
        documentType: data.documentType || null,
        documentNumber: data.documentNumber.trim() || null,
        phone: data.phone.trim() || null,
        address: data.address.trim() || null,
        birthDate: data.birthDate || null,
        jobTitle: data.jobTitle.trim() || null,
        hireDate: data.hireDate || null,
        terminationDate: data.terminationDate || null,
        roles: data.roleIds.map(roleId => ({
          roleId,
          isPrimary: roleId === primaryRoleId
        }))
      }

      if (isEdit && uuid) {
        await employeesApi.update(propertyId, uuid, payload)
        toast.success('Empleado actualizado.')
      } else {
        await employeesApi.create(propertyId, payload)
        toast.success('Empleado creado.')
      }

      goBack()
    } catch (error) {
      toast.error(getStaffApiErrorMessage(error, 'No se pudo guardar el empleado.'))
    }
  }

  const title = isView ? 'Ver empleado' : isEdit ? 'Editar empleado' : 'Nuevo empleado'

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
                  ? 'Consulta los datos del empleado'
                  : isEdit
                    ? 'Actualiza el cargo, los roles o los datos personales.'
                    : 'Registra un empleado del hotel'}
              </Typography>
            </div>
            <div className='flex flex-wrap max-sm:flex-col gap-4'>
              <Button variant='outlined' color='secondary' type='button' onClick={goBack}>
                {isView ? 'Volver' : 'Descartar'}
              </Button>
              {!isView ? (
                <Button variant='contained' type='submit' disabled={isSubmitting}>
                  {isSubmitting ? <CircularProgress size={20} color='inherit' /> : isEdit ? 'Guardar' : 'Guardar empleado'}
                </Button>
              ) : null}
            </div>
          </div>
        </Grid>

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
                        placeholder='Juan'
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
                        placeholder='Pérez'
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
                    name='jobTitle'
                    control={control}
                    rules={{ maxLength: { value: 100, message: 'Máximo 100 caracteres.' } }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Cargo'
                        placeholder='Recepcionista'
                        disabled={isView || isSubmitting}
                        {...(errors.jobTitle && { error: true, helperText: errors.jobTitle.message })}
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
                        placeholder='Av. Principal 123'
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
            <CardHeader title='Documento y fechas' />
            <CardContent className='flex flex-col gap-5'>
              <FormControl fullWidth error={Boolean(errors.documentType)}>
                <InputLabel id='employee-document-type'>Tipo de documento</InputLabel>
                <Controller
                  name='documentType'
                  control={control}
                  rules={{
                    validate: value =>
                      Boolean(value) === Boolean(documentNumber.trim()) ||
                      'El tipo y el número de documento deben enviarse juntos.'
                  }}
                  render={({ field }) => (
                    <Select {...field} label='Tipo de documento' labelId='employee-document-type' disabled={isView || isSubmitting}>
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
                    placeholder='70000002'
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
              <Controller
                name='hireDate'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type='date'
                    label='Fecha de contratación'
                    slotProps={{ inputLabel: { shrink: true } }}
                    disabled={isView || isSubmitting}
                  />
                )}
              />
              <Controller
                name='terminationDate'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type='date'
                    label='Fecha de cese'
                    slotProps={{ inputLabel: { shrink: true } }}
                    disabled={isView || isSubmitting}
                  />
                )}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title='Acceso y roles' />
            <CardContent>
              <Grid container spacing={5}>
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
                        label='Correo de acceso'
                        placeholder='juan.perez@gmail.com'
                        disabled={isView || isSubmitting}
                        {...(errors.email && { error: true, helperText: errors.email.message })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='password'
                    control={control}
                    rules={{
                      maxLength: { value: 100, message: 'Máximo 100 caracteres.' },
                      validate: value =>
                        !value.trim() || value.trim().length >= 8 || 'Mínimo 8 caracteres.'
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type='password'
                        label={isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña (opcional)'}
                        placeholder='Si se omite, solo podrá entrar con Google'
                        disabled={isView || isSubmitting}
                        {...(errors.password && { error: true, helperText: errors.password.message })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id='employee-roles'>Roles</InputLabel>
                    <Controller
                      name='roleIds'
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          multiple
                          label='Roles'
                          labelId='employee-roles'
                          input={<OutlinedInput label='Roles' />}
                          disabled={isView || isSubmitting}
                          onChange={event => {
                            const value = event.target.value as number[]

                            field.onChange(value)
                            if (value.length === 0) {
                              setValue('primaryRoleId', '')
                            } else if (!value.includes(Number(watch('primaryRoleId')))) {
                              setValue('primaryRoleId', value[0])
                            }
                          }}
                          renderValue={selected => (
                            <div className='flex flex-wrap gap-1'>
                              {(selected as number[]).map(id => {
                                const role = roles.find(item => item.id === id)

                                return role ? <Chip key={id} size='small' label={role.name} /> : null
                              })}
                            </div>
                          )}
                        >
                          {roles.map(role => (
                            <MenuItem key={role.uuid} value={role.id}>
                              <Checkbox checked={roleIds.includes(role.id)} />
                              {role.name}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id='employee-primary-role'>Rol principal</InputLabel>
                    <Controller
                      name='primaryRoleId'
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          label='Rol principal'
                          labelId='employee-primary-role'
                          disabled={isView || isSubmitting || roleIds.length === 0}
                        >
                          {roles
                            .filter(role => roleIds.includes(role.id))
                            .map(role => (
                              <MenuItem key={role.uuid} value={role.id}>
                                {role.name}
                              </MenuItem>
                            ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </form>
  )
}

export default EmployeeForm
