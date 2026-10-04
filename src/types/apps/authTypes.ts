export type AuthProvider = 'credentials' | 'google'

/** Error de inicio de sesión tal como lo recibe la pantalla de login: código + mensaje en español. */
export type LoginError = {
  code: string
  message: string
}

export type NestAuthPerson = {
  firstName?: string
  lastName?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  documentType?: string | null
  documentNumber?: string | null
  birthDate?: string | null
}

export type NestAuthUser = {
  id: string
  email: string
  name: string
  image: string | null
  propertyId: number
  propertyName?: string
  personUuid: string
  employeeUuid: string
  accessToken: string
  permissions?: string[]
  subscriptionSuspended?: boolean
  person?: NestAuthPerson
  employee?: {
    uuid?: string
    jobTitle?: string | null
    hireDate?: string | null
    person?: NestAuthPerson
    user?: {
      email?: string
      photoUrl?: string | null
    } | null
    roles?: Array<{
      uuid: string
      name: string
      isPrimary?: boolean
    }>
  }
  property?: {
    name?: string
    tradeName?: string | null
  }
}
