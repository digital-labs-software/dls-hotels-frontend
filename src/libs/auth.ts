// Third-party Imports
import CredentialProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'

// Lib Imports
import { loginWithGoogle, loginWithPassword } from '@/libs/authApi'
import { authCookies } from '@/libs/authCookies'

// Type Imports
import type { LoginError, NestAuthUser } from '@/types/apps/authTypes'

const applyNestUserToToken = (token: Record<string, unknown>, data: NestAuthUser) => {
  token.id = data.id
  token.sub = data.id
  token.email = data.email
  token.name = data.name
  token.picture = data.image || token.picture
  token.accessToken = data.accessToken
  token.propertyId = data.propertyId
  token.propertyName = data.propertyName
  token.personUuid = data.personUuid
  token.employeeUuid = data.employeeUuid
  token.permissions = Array.isArray(data.permissions) ? data.permissions : []
  token.subscriptionSuspended = Boolean(data.subscriptionSuspended)
}

/**
 * Lo único que llega a la pantalla de login: un código y el mensaje para el usuario.
 * El detalle técnico (status, ruta, error de red) se queda en el log del servidor de Next.
 */
const toLoginError = (error: unknown, path: string): LoginError => {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const { code, message, statusCode } = error as { code?: unknown; message?: unknown; statusCode?: unknown }
    const text = Array.isArray(message) ? String(message[0] ?? '') : typeof message === 'string' ? message : ''

    if (statusCode !== 401) console.warn(`[auth] ${path} respondió ${String(statusCode)}`, error)

    return { code: typeof code === 'string' ? code : 'UNAUTHORIZED', message: text }
  }

  console.error(`[auth] ${path} sin respuesta del backend`, error)

  return { code: 'NETWORK', message: '' }
}

const loginErrorRedirect = (error: LoginError) =>
  `/pages/auth/login-v1?error=${encodeURIComponent(JSON.stringify(error))}`

export const authOptions: NextAuthOptions = {
  // Source of truth is NestJS (users / persons / employees) — do not use PrismaAdapter
  providers: [
    CredentialProvider({
      name: 'Credentials',
      type: 'credentials',
      credentials: {},
      async authorize(credentials) {
        const { email, password } = credentials as { email: string; password: string }

        try {
          return await loginWithPassword(email, password)
        } catch (e: unknown) {
          throw new Error(JSON.stringify(toLoginError(e, '/auth/login')))
        }
      }
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
    })
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60
  },

  cookies: authCookies,

  pages: {
    signIn: '/pages/auth/login-v1'
  },

  callbacks: {
    async signIn({ user, account }) {
      // Google: validate against Nest before creating a NextAuth session
      if (account?.provider === 'google') {
        if (!account.id_token) {
          console.error('[auth] Google no devolvió id_token')

          return loginErrorRedirect({ code: 'GOOGLE_VERIFICATION_FAILED', message: '' })
        }

        try {
          const data = await loginWithGoogle(account.id_token)
          const googleImage = user.image

          // Attach Nest payload onto user so jwt callback can persist it
          Object.assign(user, data)

          if (!user.image && googleImage) {
            user.image = googleImage
          }

          return true
        } catch (error: unknown) {
          return loginErrorRedirect(toLoginError(error, '/auth/google'))
        }
      }

      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        const incomingImage = user.image || token.picture

        applyNestUserToToken(token as Record<string, unknown>, user as NestAuthUser)
        token.authProvider = account?.provider === 'google' ? 'google' : 'credentials'

        if (!token.picture && incomingImage) {
          token.picture = incomingImage
        }

        if (account?.provider === 'google') {
          token.googleToken = account.access_token ?? account.id_token
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? (token.sub as string)
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.image = (token.picture as string) ?? null
        session.user.propertyId = token.propertyId as number | undefined
        session.user.propertyName = token.propertyName as string | undefined
        session.user.personUuid = token.personUuid as string | undefined
        session.user.employeeUuid = token.employeeUuid as string | undefined
        session.user.permissions = Array.isArray(token.permissions) ? (token.permissions as string[]) : []
        session.user.subscriptionSuspended = Boolean(token.subscriptionSuspended)
      }

      session.accessToken = token.accessToken as string | undefined
      session.googleToken = token.googleToken as string | undefined
      session.authProvider = token.authProvider as 'credentials' | 'google' | undefined

      return session
    }
  }
}
