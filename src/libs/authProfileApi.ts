import { getSession } from 'next-auth/react'

import type { ApiError } from '@/types/apps/clientsTypes'
import type { AuthProfile, UpdateAuthPasswordInput, UpdateAuthProfileInput } from '@/types/apps/profileTypes'
import type { Employee } from '@/types/apps/staffTypes'
import type { SignedUpload } from '@/types/apps/uploadsTypes'
import { normalizeEmployee } from '@/libs/staffApi'
import { uploadSignedFile, validateCloudinaryImageFile } from '@/libs/uploadsApi'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getAuthProfileErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as ApiError).message

    if (Array.isArray(message) && message.length > 0) {
      return message.join('\n')
    }

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

const resolveToken = async (token?: string) => {
  if (token) {
    return token
  }

  const session = await getSession()

  return session?.accessToken
}

const request = async <T>(path: string, init: RequestInit = {}, token?: string): Promise<T> => {
  const accessToken = await resolveToken(token)

  const res = await fetch(`${getApiBase()}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers
    }
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw (data as ApiError) ?? { message: ['Ocurrió un error.'], error: 'Error', statusCode: res.status }
  }

  return data as T
}

const emptyToNull = (value?: string | null) => {
  if (value === undefined) {
    return undefined
  }

  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

const toProfile = (payload: AuthProfile | { employee?: Employee }): AuthProfile => {
  if ('employee' in payload && payload.employee) {
    return normalizeEmployee({
      ...payload.employee,
      person: payload.employee.person,
      user: payload.employee.user,
      roles: payload.employee.roles
    })
  }

  return normalizeEmployee(payload as Employee)
}

export const authProfileApi = {
  get: async (token?: string) => {
    return toProfile(await request<AuthProfile>(`/auth/profile`, {}, token))
  },
  update: async (body: UpdateAuthProfileInput, token?: string) => {
    const payload: UpdateAuthProfileInput = {}

    if (body.phone !== undefined) payload.phone = emptyToNull(body.phone)
    if (body.address !== undefined) payload.address = emptyToNull(body.address)
    if (body.photoUrl !== undefined) payload.photoUrl = emptyToNull(body.photoUrl)

    return toProfile(await request<AuthProfile>(`/auth/profile`, { method: 'PATCH', body: JSON.stringify(payload) }, token))
  },
  signPhoto: async (token?: string) => {
    return request<SignedUpload>(`/auth/profile/photo/upload-signature`, { method: 'POST' }, token)
  },
  uploadPhoto: async (file: File, token?: string) => {
    const preflightError = validateCloudinaryImageFile(file)

    if (preflightError) {
      throw new Error(preflightError)
    }

    const signed = await authProfileApi.signPhoto(token)

    return uploadSignedFile(signed, file)
  },
  updatePassword: async (body: UpdateAuthPasswordInput, token?: string) => {
    const payload: UpdateAuthPasswordInput = {
      newPassword: body.newPassword
    }

    if (body.currentPassword) {
      payload.currentPassword = body.currentPassword
    }

    return request<{ message?: string }>(`/auth/profile/password`, { method: 'PATCH', body: JSON.stringify(payload) }, token)
  }
}
