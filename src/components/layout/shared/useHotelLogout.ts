'use client'

import { signOut, useSession } from 'next-auth/react'

import { logoutGoogle, logoutPassword } from '@/libs/authApi'

const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/en/pages/auth/login-v1`

const useHotelLogout = () => {
  const { data: session } = useSession()

  return async () => {
    try {
      const accessToken = session?.accessToken
      const authProvider = session?.authProvider

      if (accessToken) {
        if (authProvider === 'google') {
          await logoutGoogle(accessToken, session?.googleToken)
        } else {
          await logoutPassword(accessToken)
        }
      }

      await signOut({ callbackUrl: loginUrl })
    } catch (error) {
      console.error(error)
      await signOut({ callbackUrl: loginUrl })
    }
  }
}

export default useHotelLogout
