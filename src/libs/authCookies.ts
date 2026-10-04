// Third-party Imports
import type { CookiesOptions } from 'next-auth'

/**
 * Cookies con nombre propio: el navegador comparte cookies entre puertos del mismo host,
 * así que con los nombres por defecto de next-auth la sesión del hotel y la del panel DLS
 * se pisarían en localhost.
 */
const COOKIE_PREFIX = 'dls-hotel'

const useSecureCookies = (process.env.NEXTAUTH_URL ?? '').startsWith('https://')
const securePrefix = useSecureCookies ? '__Secure-' : ''

const baseOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: useSecureCookies
}

export const authCookies: Partial<CookiesOptions> = {
  sessionToken: { name: `${securePrefix}${COOKIE_PREFIX}.session-token`, options: baseOptions },
  callbackUrl: { name: `${securePrefix}${COOKIE_PREFIX}.callback-url`, options: baseOptions },
  csrfToken: { name: `${useSecureCookies ? '__Host-' : ''}${COOKIE_PREFIX}.csrf-token`, options: baseOptions },
  pkceCodeVerifier: {
    name: `${securePrefix}${COOKIE_PREFIX}.pkce.code_verifier`,
    options: { ...baseOptions, maxAge: 60 * 15 }
  },
  state: { name: `${securePrefix}${COOKIE_PREFIX}.state`, options: { ...baseOptions, maxAge: 60 * 15 } },
  nonce: { name: `${securePrefix}${COOKIE_PREFIX}.nonce`, options: baseOptions }
}
