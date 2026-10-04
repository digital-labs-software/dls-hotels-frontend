import type { Employee } from '@/types/apps/staffTypes'

export type AuthProfile = Employee

export type UpdateAuthProfileInput = {
  phone?: string | null
  address?: string | null
  photoUrl?: string | null
}

export type UpdateAuthPasswordInput = {
  currentPassword?: string
  newPassword: string
}
