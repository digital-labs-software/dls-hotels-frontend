export type AuthProvider = 'credentials' | 'google'

export type NestAuthUser = {
  id: string
  email: string
  name: string
  image: string | null
  propertyId: number
  personUuid: string
  employeeUuid: string
  accessToken: string
}
