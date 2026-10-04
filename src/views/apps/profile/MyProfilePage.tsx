'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CardMedia from '@mui/material/CardMedia'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { Controller, useForm } from 'react-hook-form'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { DocumentType } from '@/types/apps/clientsTypes'
import { DOCUMENT_TYPE_LABELS } from '@/types/apps/clientsTypes'
import type { AuthProfile } from '@/types/apps/profileTypes'
import { authProfileApi, getAuthProfileErrorMessage } from '@/libs/authProfileApi'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import ProfilePhotoField from '@views/apps/profile/ProfilePhotoField'

type ContactValues = {
  phone: string
  address: string
}

type PasswordValues = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const toDatePart = (value?: string | null) => (value ? value.slice(0, 10) : '')

const documentLabel = (value?: string | null) => {
  if (!value) {
    return '—'
  }

  return DOCUMENT_TYPE_LABELS[value as DocumentType] || value
}

const getErrorStatus = (error: unknown) => {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    return Number((error as { statusCode?: number }).statusCode) || null
  }

  return null
}

const profileLoadMessage = (error: unknown) => {
  const status = getErrorStatus(error)

  if (status === 401) {
    return 'Tu sesión con el servidor venció. Vuelve a iniciar sesión para ver tu perfil.'
  }

  if (error instanceof TypeError || (error instanceof Error && error.message === 'Failed to fetch')) {
    return 'No se pudo conectar con el API. Revisa que Nest esté en marcha.'
  }

  return getAuthProfileErrorMessage(error, 'No se pudo leer GET /auth/profile.')
}

const ReadField = ({ label, value }: { label: string; value?: string | null }) => (
  <TextField fullWidth label={label} value={value || '—'} disabled />
)

const MyProfilePage = () => {
  const { data: session, status } = useSession()
  const { me, refreshAccess } = useSubscriptionAccess()
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadWarning, setLoadWarning] = useState<string | null>(null)
  const [savingPhoto, setSavingPhoto] = useState(false)
  const [isCurrentPasswordShown, setIsCurrentPasswordShown] = useState(false)
  const [isNewPasswordShown, setIsNewPasswordShown] = useState(false)

  const contactForm = useForm<ContactValues>({
    defaultValues: { phone: '', address: '' }
  })
  const passwordForm = useForm<PasswordValues>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
  })

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    const load = async () => {
      setLoading(true)
      setLoadWarning(null)

      try {
        const next = await authProfileApi.get()

        setProfile(next)
        contactForm.reset({
          phone: next.person.phone || '',
          address: next.person.address || ''
        })
      } catch (error) {
        setLoadWarning(profileLoadMessage(error))
      } finally {
        setLoading(false)
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const person = profile?.person
  const user = profile?.user
  const roles = profile?.roles || []
  const primaryRole = roles.find(role => role.isPrimary)
  const fullName = person
    ? `${person.firstName} ${person.lastName}`.trim()
    : me?.name || session?.user?.name || 'Mi perfil'
  const photoUrl = user?.photoUrl || me?.image || session?.user?.image || ''
  const hotelName = me?.propertyName || session?.user?.propertyName || ''
  const hasPassword = Boolean(user?.hasPassword)
  const canEdit = Boolean(profile)

  const persistPhoto = async (nextUrl: string | null) => {
    setSavingPhoto(true)

    try {
      const next = await authProfileApi.update({ photoUrl: nextUrl })

      setProfile(next)
      await refreshAccess()
      toast.success(nextUrl ? 'Foto actualizada.' : 'Foto quitada.')
    } catch (error) {
      toast.error(getAuthProfileErrorMessage(error, 'No se pudo guardar la foto.'))
    } finally {
      setSavingPhoto(false)
    }
  }

  const handlePhotoFile = async (file: File) => {
    setSavingPhoto(true)

    try {
      const secureUrl = await authProfileApi.uploadPhoto(file)
      const next = await authProfileApi.update({ photoUrl: secureUrl })

      setProfile(next)
      await refreshAccess()
      toast.success('Foto actualizada.')
    } catch (error) {
      toast.error(getAuthProfileErrorMessage(error, 'No se pudo subir la foto.'))
    } finally {
      setSavingPhoto(false)
    }
  }

  const onSaveContact = contactForm.handleSubmit(async data => {
    try {
      const next = await authProfileApi.update({
        phone: data.phone,
        address: data.address
      })

      setProfile(next)
      contactForm.reset({
        phone: next.person.phone || '',
        address: next.person.address || ''
      })
      toast.success('Datos de contacto actualizados.')
    } catch (error) {
      toast.error(getAuthProfileErrorMessage(error, 'No se pudieron guardar teléfono y dirección.'))
    }
  })

  const onSavePassword = passwordForm.handleSubmit(async data => {
    if (data.newPassword !== data.confirmPassword) {
      passwordForm.setError('confirmPassword', { message: 'Las contraseñas no coinciden.' })

      return
    }

    if (hasPassword && data.newPassword === data.currentPassword) {
      passwordForm.setError('newPassword', { message: 'La nueva contraseña debe ser distinta de la actual.' })

      return
    }

    try {
      await authProfileApi.updatePassword({
        newPassword: data.newPassword,
        ...(hasPassword ? { currentPassword: data.currentPassword } : {})
      })
      const next = await authProfileApi.get()

      setProfile(next)
      passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success(hasPassword ? 'Contraseña actualizada.' : 'Contraseña creada.')
    } catch (error) {
      toast.error(getAuthProfileErrorMessage(error, 'No se pudo cambiar la contraseña.'))
    }
  })

  if (loading) {
    return (
      <div className='flex justify-center items-center p-10'>
        <CircularProgress size={32} />
      </div>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardMedia image='/images/pages/profile-banner.png' className='bs-[180px]' />
          <CardContent className='flex gap-6 justify-center flex-col items-center md:items-end md:flex-row !pt-0 md:justify-start'>
            <div className='flex rounded-bs-md mbs-[-45px] border-[5px] border-backgroundPaper bg-backgroundPaper'>
              {photoUrl ? (
                <img height={120} width={120} src={photoUrl} className='rounded object-cover' alt={fullName} />
              ) : (
                <div className='flex items-center justify-center bs-[120px] is-[120px] bg-actionHover rounded'>
                  <Typography variant='h4'>{fullName.slice(0, 1)}</Typography>
                </div>
              )}
            </div>
            <div className='flex is-full flex-wrap justify-center flex-col items-center sm:items-start gap-2'>
              <Typography variant='h4'>{fullName}</Typography>
              <div className='flex flex-wrap gap-6 justify-center sm:justify-normal'>
                {primaryRole ? (
                  <div className='flex items-center gap-2'>
                    <i className='ri-shield-user-line text-textSecondary' />
                    <Typography className='font-medium'>{primaryRole.name}</Typography>
                  </div>
                ) : null}
                {hotelName ? (
                  <div className='flex items-center gap-2'>
                    <i className='ri-building-4-line text-textSecondary' />
                    <Typography className='font-medium'>{hotelName}</Typography>
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      {loadWarning ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info'>{loadWarning}</Alert>
        </Grid>
      ) : null}

      <Grid size={{ xs: 12, md: 8 }} className='flex flex-col gap-6'>
        <Card>
          <CardHeader title='Datos personales' subheader='Nombre y documento los cambia el administrador en Personal' />
          <CardContent>
            <Grid container spacing={5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <ReadField label='Nombres' value={person?.firstName} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <ReadField label='Apellidos' value={person?.lastName} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <ReadField label='Tipo de documento' value={documentLabel(person?.documentType)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <ReadField label='Número de documento' value={person?.documentNumber} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <ReadField label='Correo personal' value={person?.email} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <ReadField label='Fecha de nacimiento' value={toDatePart(person?.birthDate)} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card>
          <form onSubmit={onSaveContact}>
            <CardHeader title='Contacto' subheader='Puedes actualizar teléfono y dirección' />
            <CardContent>
              <Grid container spacing={5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='phone'
                    control={contactForm.control}
                    rules={{ maxLength: { value: 20, message: 'Máximo 20 caracteres.' } }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Teléfono'
                        disabled={!canEdit || contactForm.formState.isSubmitting}
                        {...(contactForm.formState.errors.phone && {
                          error: true,
                          helperText: contactForm.formState.errors.phone.message
                        })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='address'
                    control={contactForm.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Dirección'
                        disabled={!canEdit || contactForm.formState.isSubmitting}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Button type='submit' variant='contained' disabled={!canEdit || contactForm.formState.isSubmitting}>
                    {contactForm.formState.isSubmitting ? <CircularProgress size={20} color='inherit' /> : 'Guardar contacto'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </form>
        </Card>

        <Card>
          <form onSubmit={onSavePassword}>
            <CardHeader
              title='Contraseña'
              subheader={
                hasPassword
                  ? 'Cambia tu contraseña de acceso'
                  : 'Esta cuenta entra con Google. Puedes crear una contraseña para entrar también con correo.'
              }
            />
            <CardContent>
              <Grid container spacing={5}>
                {hasPassword ? (
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name='currentPassword'
                      control={passwordForm.control}
                      rules={{ required: 'Ingresa tu contraseña actual.' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label='Contraseña actual'
                          type={isCurrentPasswordShown ? 'text' : 'password'}
                          disabled={!canEdit || passwordForm.formState.isSubmitting}
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position='end'>
                                  <IconButton
                                    edge='end'
                                    onClick={() => setIsCurrentPasswordShown(value => !value)}
                                    onMouseDown={event => event.preventDefault()}
                                  >
                                    <i className={isCurrentPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                                  </IconButton>
                                </InputAdornment>
                              )
                            }
                          }}
                          {...(passwordForm.formState.errors.currentPassword && {
                            error: true,
                            helperText: passwordForm.formState.errors.currentPassword.message
                          })}
                        />
                      )}
                    />
                  </Grid>
                ) : null}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='newPassword'
                    control={passwordForm.control}
                    rules={{
                      required: 'La nueva contraseña es obligatoria.',
                      minLength: { value: 8, message: 'Mínimo 8 caracteres.' },
                      maxLength: { value: 100, message: 'Máximo 100 caracteres.' }
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Nueva contraseña'
                        type={isNewPasswordShown ? 'text' : 'password'}
                        disabled={!canEdit || passwordForm.formState.isSubmitting}
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position='end'>
                                <IconButton
                                  edge='end'
                                  onClick={() => setIsNewPasswordShown(value => !value)}
                                  onMouseDown={event => event.preventDefault()}
                                >
                                  <i className={isNewPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                                </IconButton>
                              </InputAdornment>
                            )
                          }
                        }}
                        {...(passwordForm.formState.errors.newPassword && {
                          error: true,
                          helperText: passwordForm.formState.errors.newPassword.message
                        })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name='confirmPassword'
                    control={passwordForm.control}
                    rules={{ required: 'Confirma la nueva contraseña.' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Confirmar contraseña'
                        type={isNewPasswordShown ? 'text' : 'password'}
                        disabled={!canEdit || passwordForm.formState.isSubmitting}
                        {...(passwordForm.formState.errors.confirmPassword && {
                          error: true,
                          helperText: passwordForm.formState.errors.confirmPassword.message
                        })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Button type='submit' variant='contained' disabled={!canEdit || passwordForm.formState.isSubmitting}>
                    {passwordForm.formState.isSubmitting ? (
                      <CircularProgress size={20} color='inherit' />
                    ) : hasPassword ? (
                      'Cambiar contraseña'
                    ) : (
                      'Crear contraseña'
                    )}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </form>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }} className='flex flex-col gap-6'>
        <Card>
          <CardHeader title='Foto' subheader='Se reemplaza en cada subida' />
          <CardContent>
            <ProfilePhotoField
              photoUrl={photoUrl || null}
              disabled={!canEdit || savingPhoto}
              onFileChange={handlePhotoFile}
              onRemove={() => persistPhoto(null)}
              onInvalidFile={message => toast.error(message)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title='Datos laborales' subheader='Cargo y roles los asigna el administrador' />
          <CardContent className='flex flex-col gap-5'>
            <ReadField label='Cargo' value={profile?.jobTitle} />
            <ReadField label='Fecha de ingreso' value={toDatePart(profile?.hireDate)} />
            <div className='flex flex-wrap gap-2'>
              {roles.length ? (
                roles.map(role => (
                  <Chip
                    key={role.uuid}
                    size='small'
                    variant='tonal'
                    color={role.isPrimary ? 'primary' : 'secondary'}
                    label={role.name}
                  />
                ))
              ) : (
                <Typography variant='body2'>Sin roles asignados en la ficha de empleado.</Typography>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title='Cuenta de acceso' subheader='Cómo inicia sesión este usuario' />
          <CardContent className='flex flex-col gap-5'>
            <ReadField label='Correo de inicio de sesión' value={user?.email || me?.email || session?.user?.email} />
            {user ? (
              <div className='flex flex-wrap gap-2'>
                <Chip
                  size='small'
                  variant='tonal'
                  color={user.hasPassword ? 'success' : 'secondary'}
                  label={user.hasPassword ? 'Entra con contraseña' : 'Sin contraseña'}
                />
                <Chip
                  size='small'
                  variant='tonal'
                  color={user.hasGoogle ? 'success' : 'secondary'}
                  label={user.hasGoogle ? 'Google vinculado' : 'Google no vinculado'}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default MyProfilePage
