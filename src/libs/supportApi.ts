import { getSession } from 'next-auth/react'

import type {
  CreateSupportTicketDto,
  SendSupportMessageDto,
  SupportApiError,
  SupportAttachmentInput,
  SupportMessage,
  SupportPaginated,
  SupportStatus,
  SupportTicket,
  SupportTicketDetail,
  SupportTicketStatus,
  SupportUnread,
  SupportUploadSignature
} from '@/types/apps/supportTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

/** Origen del servidor Socket.IO (el namespace /support no lleva el prefijo /api/v1). */
export const getSupportSocketUrl = () => {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_URL

  if (explicit) {
    return `${explicit.replace(/\/$/, '')}/support`
  }

  try {
    return `${new URL(getApiBase()).origin}/support`
  } catch {
    return 'http://localhost:3000/support'
  }
}

export const getSupportApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as SupportApiError).message

    if (Array.isArray(message) && message.length > 0) {
      return message.join('\n')
    }

    if (typeof message === 'string' && message.trim()) {
      return message
    }
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
    throw (data as SupportApiError) ?? { message: ['Ocurrió un error.'], error: 'Error', statusCode: res.status }
  }

  return data as T
}

const supportPath = (propertyId: number, path = '') => `/properties/${propertyId}/support${path}`

const fileExtension = (file: File) => {
  const fromName = file.name.split('.').pop()?.toLowerCase() || ''
  const fromType = file.type.split('/')[1]?.toLowerCase() || ''

  return fromName && fromName !== file.name.toLowerCase() ? fromName : fromType
}

export const validateSupportFile = (
  file: File,
  signed?: Pick<SupportUploadSignature, 'maxFileBytes' | 'allowedFormats'>
) => {
  const maxBytes = signed?.maxFileBytes || 5 * 1024 * 1024

  const formats = (signed?.allowedFormats?.length ? signed.allowedFormats : ['jpg', 'jpeg', 'png', 'webp', 'pdf']).map(
    item => item.toLowerCase()
  )

  const extension = fileExtension(file)
  const mimeType = file.type.split('/')[1]?.toLowerCase() || ''

  if (file.size > maxBytes) {
    return `"${file.name}" supera los ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`
  }

  if (!formats.includes(extension) && !formats.includes(mimeType)) {
    return `"${file.name}": usa un archivo ${formats.join(', ')}.`
  }

  return null
}

const uploadToCloudinary = async (signed: SupportUploadSignature, file: File): Promise<SupportAttachmentInput> => {
  const validationError = validateSupportFile(file, signed)

  if (validationError) {
    throw new Error(validationError)
  }

  const form = new FormData()

  form.append('file', file)
  form.append('api_key', String(signed.apiKey))
  form.append('timestamp', String(signed.timestamp))
  form.append('signature', signed.signature)
  form.append('folder', signed.folder)
  form.append('public_id', signed.publicId)
  form.append('overwrite', String(signed.overwrite))

  const res = await fetch(signed.uploadUrl, { method: 'POST', body: form })
  const uploaded = await res.json().catch(() => null)
  const fileUrl = uploaded?.secure_url

  if (!res.ok || typeof fileUrl !== 'string' || !fileUrl) {
    const message = uploaded?.error?.message || uploaded?.message || 'No se pudo subir el adjunto.'

    throw new Error(typeof message === 'string' ? message : 'No se pudo subir el adjunto.')
  }

  return {
    url: fileUrl,
    name: file.name.slice(0, 150),
    format: (typeof uploaded?.format === 'string' ? uploaded.format : fileExtension(file)).slice(0, 10) || undefined,
    bytes: typeof uploaded?.bytes === 'number' ? uploaded.bytes : file.size
  }
}

export const supportApi = {
  status: (propertyId: number, token?: string) => request<SupportStatus>(supportPath(propertyId, '/status'), {}, token),

  unread: (propertyId: number, token?: string) => request<SupportUnread>(supportPath(propertyId, '/unread'), {}, token),

  tickets: (
    propertyId: number,
    params: { page?: number; limit?: number; status?: SupportTicketStatus | '' } = {},
    token?: string
  ) => {
    const search = new URLSearchParams()

    search.set('page', String(params.page || 1))
    search.set('limit', String(params.limit || 50))

    if (params.status) {
      search.set('status', params.status)
    }

    return request<SupportPaginated<SupportTicket>>(supportPath(propertyId, `/tickets?${search.toString()}`), {}, token)
  },

  ticket: (propertyId: number, uuid: string, token?: string) =>
    request<SupportTicketDetail>(supportPath(propertyId, `/tickets/${uuid}`), {}, token),

  create: (propertyId: number, body: CreateSupportTicketDto, token?: string) =>
    request<SupportTicketDetail>(
      supportPath(propertyId, '/tickets'),
      { method: 'POST', body: JSON.stringify(body) },
      token
    ),

  send: (propertyId: number, uuid: string, body: SendSupportMessageDto, token?: string) =>
    request<SupportMessage>(
      supportPath(propertyId, `/tickets/${uuid}/messages`),
      { method: 'POST', body: JSON.stringify(body) },
      token
    ),

  markRead: (propertyId: number, uuid: string, token?: string) =>
    request<SupportTicket>(supportPath(propertyId, `/tickets/${uuid}/read`), { method: 'POST' }, token),

  resolve: (propertyId: number, uuid: string, token?: string) =>
    request<SupportTicketDetail>(supportPath(propertyId, `/tickets/${uuid}/resolve`), { method: 'POST' }, token),

  uploadAttachments: async (propertyId: number, files: File[], token?: string) => {
    const uploaded: SupportAttachmentInput[] = []

    for (const file of files) {
      const signed = await request<SupportUploadSignature>(
        supportPath(propertyId, '/attachments/upload-signature'),
        { method: 'POST' },
        token
      )

      uploaded.push(await uploadToCloudinary(signed, file))
    }

    return uploaded
  }
}
