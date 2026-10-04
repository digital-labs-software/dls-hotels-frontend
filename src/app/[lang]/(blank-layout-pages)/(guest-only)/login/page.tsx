// Next Imports
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

// Type Imports
import type { Locale } from '@configs/i18n'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Inicia sesión con tu cuenta de personal del hotel'
}

type Props = {
  params: Promise<{ lang: Locale }>
}

const LoginPage = async ({ params }: Props) => {
  const { lang } = await params

  redirect(getLocalizedUrl('/pages/auth/login-v1', lang))
}

export default LoginPage
