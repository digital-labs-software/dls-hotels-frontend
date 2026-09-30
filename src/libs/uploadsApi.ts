import { getSession } from 'next-auth/react'

import type { ApiError } from '@/types/apps/clientsTypes'
import {
  DEFAULT_ROOM_PHOTO_FORMATS,
  DEFAULT_ROOM_PHOTO_MAX_BYTES,
  type SignUploadDto,
  type SignedUpload
} from '@/types/apps/uploadsTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getUploadsApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
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
    if (res.status === 503) {
      throw { message: 'La carga de fotos no está configurada.', error: 'Service Unavailable', statusCode: 503 }
    }

    if (res.status === 404) {
      throw { message: 'No se encontró el recurso para firmar la imagen.', error: 'Not Found', statusCode: 404 }
    }

    throw (data as ApiError) ?? { message: ['Ocurrió un error.'], error: 'Error', statusCode: res.status }
  }

  return data as T
}

const fileExtension = (file: File) => {
  const fromName = file.name.split('.').pop()?.toLowerCase() || ''
  const fromType = file.type.split('/')[1]?.toLowerCase() || ''

  return fromName && fromName !== file.name.toLowerCase() ? fromName : fromType
}

export const validateRoomPhotoFile = (file: File, signed?: Pick<SignedUpload, 'maxFileBytes' | 'allowedFormats'>) => {
  const maxBytes = signed?.maxFileBytes || DEFAULT_ROOM_PHOTO_MAX_BYTES
  const formats = (signed?.allowedFormats?.length ? signed.allowedFormats : DEFAULT_ROOM_PHOTO_FORMATS).map(item =>
    item.toLowerCase()
  )
  const extension = fileExtension(file)
  const mimeType = file.type.split('/')[1]?.toLowerCase() || ''

  if (file.size > maxBytes) {
    return `La foto no puede superar ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`
  }

  if (!formats.includes(extension) && !formats.includes(mimeType)) {
    return `Usa un archivo ${formats.join(', ')}.`
  }

  return null
}

export const validateCloudinaryImageFile = validateRoomPhotoFile

export async function signRoomUpload(propertyId: number, roomUuid: string, token?: string) {
  const body: SignUploadDto = { kind: 'room', roomUuid }

  return request<SignedUpload>(
    `/properties/${propertyId}/uploads/sign`,
    { method: 'POST', body: JSON.stringify(body) },
    token
  )
}

export async function uploadSignedFile(signed: SignedUpload, file: File) {
  const validationError = validateRoomPhotoFile(file, signed)

  if (validationError) {
    throw new Error(validationError)
  }

  const formData = new FormData()

  formData.append('file', file)
  formData.append('api_key', String(signed.apiKey))
  formData.append('timestamp', String(signed.timestamp))
  formData.append('signature', signed.signature)
  formData.append('folder', signed.folder)
  formData.append('public_id', signed.publicId)
  formData.append('overwrite', 'true')

  const res = await fetch(signed.uploadUrl, { method: 'POST', body: formData })
  const data = await res.json().catch(() => null)
  const secureUrl = data?.secure_url

  if (!res.ok || typeof secureUrl !== 'string' || !secureUrl) {
    const message = data?.error?.message || data?.message || 'No se pudo subir la foto a Cloudinary.'

    throw new Error(typeof message === 'string' ? message : 'No se pudo subir la foto a Cloudinary.')
  }

  return secureUrl as string
}

export async function uploadRoomPhoto(propertyId: number, roomUuid: string, file: File, token?: string) {
  const preflightError = validateRoomPhotoFile(file)

  if (preflightError) {
    throw new Error(preflightError)
  }

  const signed = await signRoomUpload(propertyId, roomUuid, token)

  return uploadSignedFile(signed, file)
}

export async function signLogoUpload(propertyId: number, token?: string) {
  return request<SignedUpload>(`/properties/${propertyId}/uploads/logo/sign`, { method: 'POST' }, token)
}

export async function uploadHotelLogo(propertyId: number, file: File, token?: string) {
  const preflightError = validateRoomPhotoFile(file)

  if (preflightError) {
    throw new Error(preflightError)
  }

  const signed = await signLogoUpload(propertyId, token)

  return uploadSignedFile(signed, file)
}
