// Next Imports
import type { Metadata } from 'next'

// Component Imports
import LoginV1 from '@views/pages/auth/LoginV1'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Inicia sesión con tu cuenta de personal del hotel'
}

const LoginV1Page = async () => {
  const mode = await getServerMode()

  return <LoginV1 mode={mode} />
}

export default LoginV1Page
