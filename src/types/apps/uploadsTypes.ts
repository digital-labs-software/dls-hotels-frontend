export type UploadKind = 'room'

export type SignUploadDto = {
  kind: UploadKind
  roomUuid: string
}

export type SignedUpload = {
  cloudName: string
  apiKey: string
  timestamp: number | string
  signature: string
  folder: string
  publicId: string
  overwrite: boolean | string
  uploadUrl: string
  maxFileBytes: number
  allowedFormats: string[]
  transformation?: string
}

export const DEFAULT_ROOM_PHOTO_MAX_BYTES = 5 * 1024 * 1024

export const DEFAULT_ROOM_PHOTO_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const
