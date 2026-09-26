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

// Component Imports
import Logo from '@components/layout/shared/Logo'
import Illustrations from '@components/Illustrations'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

type ErrorType = {
  message: string[]
}

type FormData = InferInput<typeof schema>

const schema = object({
  email: pipe(string(), minLength(1, 'This field is required'), email('Please enter a valid email address')),
  password: pipe(
    string(),
    nonEmpty('This field is required'),
    minLength(5, 'Password must be at least 5 characters long')
  )
})

const NEXT_AUTH_GENERIC_ERRORS: Record<string, string> = {
  OAuthSignin: 'No se pudo conectar con Google. En esta red el certificado HTTPS falla; reinicia el frontend.',
  OAuthCallback: 'Acceso no autorizado.',
  Callback: 'Acceso no autorizado.',
  AccessDenied: 'Acceso no autorizado.',
  OAuthAccountNotLinked: 'Acceso no autorizado.',
  Configuration: 'Error de configuración de autenticación.',
  Default: 'No se pudo iniciar sesión.'
}

const parseAuthError = (raw?: string | null): ErrorType => {
  if (!raw) {
    return { message: ['No se pudo iniciar sesión.'] }
  }

  const generic = NEXT_AUTH_GENERIC_ERRORS[raw]

  if (generic) {
    return { message: [generic] }
  }

  const fromObject = (parsed: Record<string, unknown>): string[] => {
    const lines: string[] = []
    const status = parsed.statusCode ?? parsed.status
    const errorName = typeof parsed.error === 'string' ? parsed.error : null

    if (status || errorName) {
      lines.push([status ? `HTTP ${status}` : null, errorName].filter(Boolean).join(' — '))
    }

    if (Array.isArray(parsed.message)) {
      lines.push(...parsed.message.map(item => String(item)))
    } else if (typeof parsed.message === 'string') {
      lines.push(parsed.message)
    }

    if (typeof parsed.path === 'string') {
      lines.push(`Ruta: ${parsed.path}`)
    }

    return lines.length ? lines : [JSON.stringify(parsed)]
  }

  try {
    const decoded = decodeURIComponent(raw)
    const parsed = JSON.parse(decoded)

    if (parsed && typeof parsed === 'object') {
      return { message: fromObject(parsed as Record<string, unknown>) }
    }

    return { message: [typeof parsed === 'string' ? parsed : raw] }
  } catch {
    try {
      const parsed = JSON.parse(raw)

      if (parsed && typeof parsed === 'object') {
        return { message: fromObject(parsed as Record<string, unknown>) }
      }
    } catch {
      // plain string from Nest / NextAuth
    }

    return { message: [raw] }
  }
}

const LoginV1 = ({ mode }: { mode: Mode }) => {
  // States
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [errorState, setErrorState] = useState<ErrorType | null>(null)
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
    formState: { errors }
  } = useForm<FormData>({
    resolver: valibotResolver(schema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  // Show Nest / NextAuth errors returned via query (Google redirect flow)
  useEffect(() => {
    const errorParam = searchParams.get('error')

    if (!errorParam) {
      return
    }

    setErrorState(parseAuthError(errorParam))

    const params = new URLSearchParams(searchParams.toString())

    params.delete('error')

    const query = params.toString()
    const path = getLocalizedUrl('/pages/auth/login-v1', locale as Locale)

    router.replace(query ? `${path}?${query}` : path)
  }, [searchParams, locale, router])

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const onSubmit: SubmitHandler<FormData> = async (data: FormData) => {
    setIsSubmitting(true)
    setErrorState(null)

    const res = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false
    })

    setIsSubmitting(false)

    if (res && res.ok && res.error === null) {
      const redirectURL = searchParams.get('redirectTo') ?? '/'

      router.replace(getLocalizedUrl(redirectURL, locale as Locale))
    } else {
      setErrorState(parseAuthError(res?.error))
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
            <div>
              <Typography variant='h4'>{`Welcome to ${themeConfig.templateName}!👋🏻`}</Typography>
              <Typography className='mbs-1'>Sign in with your hotel staff account</Typography>
            </div>

            {errorState?.message?.[0] ? (
              <Alert severity='error' icon={false} sx={{ whiteSpace: 'pre-wrap', alignItems: 'flex-start' }}>
                {errorState.message.join('\n')}
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
                    label='Email'
                    onChange={e => {
                      field.onChange(e.target.value)
                      errorState !== null && setErrorState(null)
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
                    label='Password'
                    id='login-v1-password'
                    type={isPasswordShown ? 'text' : 'password'}
                    onChange={e => {
                      field.onChange(e.target.value)
                      errorState !== null && setErrorState(null)
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
                <FormControlLabel control={<Checkbox />} label='Remember me' />
                <Typography
                  className='text-end'
                  color='primary.main'
                  component={Link}
                  href={getLocalizedUrl('/pages/auth/forgot-password-v1', locale as Locale)}
                >
                  Forgot password?
                </Typography>
              </div>
              <Button fullWidth variant='contained' type='submit' disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Log In'}
              </Button>
              <Divider className='gap-3'>or</Divider>
              <Button
                fullWidth
                color='secondary'
                className='text-textPrimary'
                startIcon={<img src='/images/logos/google.png' alt='Google' width={22} />}
                sx={{ '& .MuiButton-startIcon': { marginInlineEnd: 3 } }}
                onClick={() => signIn('google', { callbackUrl: getLocalizedUrl('/', locale as Locale) })}
              >
                Sign in with Google
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
