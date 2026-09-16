// Next Imports
import type { Metadata } from 'next'

// Component Imports
import LoginV1 from '@views/pages/auth/LoginV1'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Login to your hotel staff account'
}

const LoginV1Page = async () => {
  const mode = await getServerMode()

  return <LoginV1 mode={mode} />
}

export default LoginV1Page
