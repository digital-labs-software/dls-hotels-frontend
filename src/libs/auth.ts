// Third-party Imports
import CredentialProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'

// Lib Imports
import { loginWithGoogle, loginWithPassword } from '@/libs/authApi'

// Type Imports
import type { NestAuthUser } from '@/types/apps/authTypes'

const applyNestUserToToken = (token: Record<string, unknown>, data: NestAuthUser) => {
  token.id = data.id
  token.sub = data.id
  token.email = data.email
  token.name = data.name
  token.picture = data.image
  token.accessToken = data.accessToken
  token.propertyId = data.propertyId
  token.propertyName = data.propertyName
  token.personUuid = data.personUuid
  token.employeeUuid = data.employeeUuid
}

const toNestErrorPayload = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return error
  }

  return { statusCode: 401, message: ['Acceso no autorizado.'], error: 'Unauthorized' }
}

const loginErrorRedirect = (error: unknown) => {
  const payload = toNestErrorPayload(error)

  return `/pages/auth/login-v1?error=${encodeURIComponent(JSON.stringify(payload))}`
}

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
          throw new Error(JSON.stringify(toNestErrorPayload(e)))
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

  pages: {
    signIn: '/pages/auth/login-v1'
  },

  callbacks: {
    async signIn({ user, account }) {
      // Google: validate against Nest before creating a NextAuth session
      if (account?.provider === 'google') {
        if (!account.id_token) {
          return loginErrorRedirect({ message: ['No se recibió el token de Google.'] })
        }

        try {
          const data = await loginWithGoogle(account.id_token)

          // Attach Nest payload onto user so jwt callback can persist it
          Object.assign(user, data)

          return true
        } catch (error: unknown) {
          return loginErrorRedirect(error)
        }
      }

      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        applyNestUserToToken(token as Record<string, unknown>, user as NestAuthUser)
        token.authProvider = account?.provider === 'google' ? 'google' : 'credentials'

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
      }

      session.accessToken = token.accessToken as string | undefined
      session.googleToken = token.googleToken as string | undefined
      session.authProvider = token.authProvider as 'credentials' | 'google' | undefined

      return session
    }
  }
}
