import type { DefaultSession } from 'next-auth'
import type { DefaultJWT } from 'next-auth/jwt'

import type { AuthProvider, NestAuthUser } from '@/types/apps/authTypes'

export type { AuthProvider, NestAuthUser }

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    googleToken?: string
    authProvider?: AuthProvider
    user: {
      id: string
      propertyId?: number
      personUuid?: string
      employeeUuid?: string
    } & DefaultSession['user']
  }

  interface User extends NestAuthUser {}
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string
    accessToken?: string
    googleToken?: string
    authProvider?: AuthProvider
    propertyId?: number
    personUuid?: string
    employeeUuid?: string
  }
}
