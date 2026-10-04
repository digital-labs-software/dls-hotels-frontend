'use client'

// React Imports
import { useEffect, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'

// Third-party Imports
import { signIn } from 'next-auth/react'
import { Controller, useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { object, minLength, string, email, pipe, nonEmpty } from 'valibot'
import type { SubmitHandler } from 'react-hook-form'
import type { InferInput } from 'valibot'

// Type Imports
import type { Mode } from '@core/types'
import type { Locale } from '@configs/i18n'
import type { LoginError } from '@/types/apps/authTypes'

// Component Imports
import Logo from '@components/layout/shared/Logo'
import Illustrations from '@components/Illustrations'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

type FormData = InferInput<typeof schema>

const schema = object({
  email: pipe(string(), minLength(1, 'Este campo es obligatorio'), email('Ingresa un correo válido')),
  password: pipe(
    string(),
    nonEmpty('Este campo es obligatorio'),
    minLength(5, 'La contraseña debe tener al menos 5 caracteres')
  )
})

const DEFAULT_LOGIN_ERROR = 'No se pudo iniciar sesión. Inténtalo de nuevo en unos segundos.'
const LOGIN_ERROR_STORAGE_KEY = 'dls-hotel-login-error'

/** Textos propios del frontend; el resto de casos usa el mensaje en español que envía el backend. */
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  NETWORK: 'No pudimos conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.',
  GOOGLE_VERIFICATION_FAILED: 'No pudimos validar tu cuenta de Google. Inténtalo de nuevo.',
  INVALID_CREDENTIALS: 'El correo o la contraseña no son correctos. Revísalos e inténtalo de nuevo.',
  CredentialsSignin: 'El correo o la contraseña no son correctos. Revísalos e inténtalo de nuevo.',

  // Códigos propios de NextAuth (flujo de Google)
  OAuthSignin: 'No pudimos conectar con Google. Inténtalo de nuevo en unos segundos.',
  OAuthCallback: 'No pudimos completar el inicio de sesión con Google. Inténtalo de nuevo.',
  Callback: 'No pudimos completar el inicio de sesión con Google. Inténtalo de nuevo.',
  OAuthAccountNotLinked: 'No pudimos completar el inicio de sesión con Google. Inténtalo de nuevo.',
  AccessDenied: 'Se canceló el inicio de sesión con Google.',
  Configuration: 'El inicio de sesión no está disponible en este momento. Inténtalo más tarde.'
}

const readStoredLoginError = (): LoginError | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = sessionStorage.getItem(LOGIN_ERROR_STORAGE_KEY)

    return raw ? (JSON.parse(raw) as LoginError) : null
  } catch {
    return null
  }
}

const persistLoginError = (error: LoginError | null) => {
  if (typeof window === 'undefined') {
    return
  }

  if (error) {
    sessionStorage.setItem(LOGIN_ERROR_STORAGE_KEY, JSON.stringify(error))
  } else {
    sessionStorage.removeItem(LOGIN_ERROR_STORAGE_KEY)
  }
}

const toLoginError = (raw?: string | null): LoginError => {
  if (!raw) return { code: 'UNKNOWN', message: DEFAULT_LOGIN_ERROR }

  if (LOGIN_ERROR_MESSAGES[raw]) return { code: raw, message: LOGIN_ERROR_MESSAGES[raw] }

  try {
    const parsed = JSON.parse(raw) as Partial<LoginError>
    const code = typeof parsed.code === 'string' ? parsed.code : 'UNKNOWN'
    const message = LOGIN_ERROR_MESSAGES[code] ?? (parsed.message || DEFAULT_LOGIN_ERROR)

    return { code, message }
  } catch {
    return { code: 'UNKNOWN', message: DEFAULT_LOGIN_ERROR }
  }
}

const LoginV1 = ({ mode }: { mode: Mode }) => {
  // States
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [errorState, setErrorState] = useState<LoginError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Vars
  const darkImg = '/images/pages/auth-v1-mask-dark.png'
  const lightImg = '/images/pages/auth-v1-mask-light.png'

  // Hooks
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const authBackground = useImageVariant(mode, lightImg, darkImg)

  const {
    control,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors }
  } = useForm<FormData>({
    resolver: valibotResolver(schema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  // Show Nest / NextAuth errors from the query or a previous attempt.
  // history.replaceState avoids a remount (router.replace in production wipes this alert).
  useEffect(() => {
    const errorParam = searchParams.get('error')

    if (!errorParam) {
      const stored = readStoredLoginError()

      if (stored) {
        setErrorState(stored)
      }

      return
    }

    const next = toLoginError(errorParam)

    setErrorState(next)
    persistLoginError(next)

    const params = new URLSearchParams(window.location.search)

    params.delete('error')

    const query = params.toString()

    window.history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname)
  }, [searchParams])

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const onSubmit: SubmitHandler<FormData> = async (data: FormData) => {
    setIsSubmitting(true)
    setErrorState(null)
    persistLoginError(null)

    const res = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false
    })

    setIsSubmitting(false)

    if (res && res.ok && res.error === null) {
      persistLoginError(null)

      const redirectURL = searchParams.get('redirectTo') ?? '/'

      router.replace(getLocalizedUrl(redirectURL, locale as Locale))
    } else {
      const error = toLoginError(res?.error)

      setErrorState(error)
      persistLoginError(error)

      if (error.code === 'INVALID_CREDENTIALS' || error.code === 'CredentialsSignin') {
        setValue('password', '')
        setFocus('password')
      }
    }
  }

  return (
    <div className='flex flex-col justify-center items-center min-bs-[100dvh] relative p-6'>
      <Card className='flex flex-col sm:is-[450px]'>
        <CardContent className='p-6 sm:!p-12'>
          <Link href={getLocalizedUrl('/', locale as Locale)} className='flex justify-center items-center mbe-6'>
            <Logo />
          </Link>
          <div className='flex flex-col gap-5'>
            <div className='text-center'>
              <Typography variant='h4'>{`Bienvenido a ${themeConfig.templateName}`}</Typography>
              <Typography className='mbs-1'>Inicia sesión con tu cuenta de personal</Typography>
            </div>

            {errorState ? (
              <Alert severity={errorState.code === 'GOOGLE_ONLY' ? 'info' : 'error'} role='alert'>
                {errorState.message}
              </Alert>
            ) : null}

            <form
              noValidate
              autoComplete='off'
              onSubmit={handleSubmit(onSubmit)}
              className='flex flex-col gap-5'
            >
              <Controller
                name='email'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    autoFocus
                    fullWidth
                    type='email'
                    label='Correo'
                    onChange={e => {
                      field.onChange(e.target.value)
                    }}
                    {...(errors.email && {
                      error: true,
                      helperText: errors.email.message
                    })}
                  />
                )}
              />
              <Controller
                name='password'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label='Contraseña'
                    id='login-v1-password'
                    type={isPasswordShown ? 'text' : 'password'}
                    onChange={e => {
                      field.onChange(e.target.value)
                    }}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position='end'>
                            <IconButton
                              size='small'
                              edge='end'
                              onClick={handleClickShowPassword}
                              onMouseDown={e => e.preventDefault()}
                            >
                              <i className={isPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                    {...(errors.password && { error: true, helperText: errors.password.message })}
                  />
                )}
              />
              <div className='flex justify-between items-center gap-x-3 gap-y-1 flex-wrap'>
                <FormControlLabel control={<Checkbox />} label='Recordarme' />
                <Typography
                  className='text-end'
                  color='primary.main'
                  component={Link}
                  href={getLocalizedUrl('/pages/auth/forgot-password-v1', locale as Locale)}
                >
                  ¿Olvidaste tu contraseña?
                </Typography>
              </div>
              <Button fullWidth variant='contained' type='submit' disabled={isSubmitting}>
                {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
              </Button>
              <Divider className='gap-3'>o</Divider>
              <Button
                fullWidth
                color='secondary'
                className='text-textPrimary'
                startIcon={<img src='/images/logos/google.png' alt='Google' width={22} />}
                sx={{ '& .MuiButton-startIcon': { marginInlineEnd: 3 } }}
                onClick={() => signIn('google', { callbackUrl: getLocalizedUrl('/', locale as Locale) })}
              >
                Iniciar sesión con Google
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
      <Illustrations maskImg={{ src: authBackground }} />
    </div>
  )
}

export default LoginV1
