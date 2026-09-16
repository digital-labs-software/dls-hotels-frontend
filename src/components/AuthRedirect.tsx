'use client'

// Next Imports
import { redirect, usePathname } from 'next/navigation'

// Type Imports
import type { Locale } from '@configs/i18n'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

const LOGIN_PATH = '/pages/auth/login-v1'

const AuthRedirect = ({ lang }: { lang: Locale }) => {
  const pathname = usePathname()

  const login = `/${lang}${LOGIN_PATH}`
  const redirectUrl = `${login}?redirectTo=${pathname}`
  const homePage = getLocalizedUrl(themeConfig.homePageUrl, lang)

  return redirect(pathname === login ? login : pathname === homePage ? login : redirectUrl)
}

export default AuthRedirect
