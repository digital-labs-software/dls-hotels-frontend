export type SupportTicketStatus = 'OPEN' | 'ANSWERED' | 'RESOLVED'

export type SupportTicketCategory =
  | 'RESERVATIONS'
  | 'INVOICING'
  | 'SUBSCRIPTION'
  | 'TECHNICAL'
  | 'ACCESS'
  | 'SUGGESTION'
  | 'OTHER'

export type SupportTicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export type SupportAuthorType = 'HOTEL' | 'PLATFORM' | 'SYSTEM'

export type SupportMode = 'ONLINE' | 'AWAY' | 'OFFLINE'

export type SupportPerson = {
  uuid: string
  name: string
  photoUrl: string | null
}

export type SupportAttachment = {
  url: string
  name: string
  format: string | null
  bytes: number | null
}

export type SupportAttachmentInput = {
  url: string
  name: string
  format?: string
  bytes?: number
}

export type SupportMessage = {
  uuid: string
  authorType: SupportAuthorType
  author: SupportPerson | null
  body: string
  attachments: SupportAttachment[]
  isInternal: boolean
  createdAt: string
}

export type SupportTicket = {
  uuid: string
  number: number
  subject: string
  category: SupportTicketCategory
  status: SupportTicketStatus
  priority: SupportTicketPriority
  lastMessageAt: string
  lastMessagePreview: string | null
  lastAuthorType: SupportAuthorType
  unreadCount: number
  createdBy: SupportPerson | null
  assignedTo: SupportPerson | null
  firstResponseAt: string | null
  resolvedAt: string | null
  createdAt: string
}

export type SupportTicketDetail = SupportTicket & {
  messages: SupportMessage[]
}

export type SupportScheduleDay = {
  day: number
  isOpen: boolean
  opensAt: string
  closesAt: string
}

export type SupportStatus = {
  mode: SupportMode
  title: string
  message: string
  withinSchedule: boolean
  liveChatEnabled: boolean
  agentsOnline: number
  schedule: SupportScheduleDay[]
  scheduleSummary: string[]
  nextOpeningAt: string | null
  nextOpeningLabel: string | null
  whatsappUrl: string | null
}

export type SupportUnread = {
  tickets: number
  messages: number
}

export type SupportPaginated<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type SupportContext = {
  pageUrl?: string
  userAgent?: string
  appVersion?: string
}

export type CreateSupportTicketDto = {
  subject: string
  category?: SupportTicketCategory
  body?: string
  attachments?: SupportAttachmentInput[]
  context?: SupportContext
}

export type SendSupportMessageDto = {
  body?: string
  attachments?: SupportAttachmentInput[]
}

export type SupportUploadSignature = {
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

export type SupportApiError = {
  message?: string | string[]
  error?: string
  statusCode?: number
}

export type SupportMessageEvent = {
  ticketUuid: string
  message: SupportMessage
}

export type SupportTypingEvent = {
  ticketUuid: string
  typing: boolean
  name: string
  authorType: SupportAuthorType
}

export const SUPPORT_EVENTS = {
  message: 'support:message',
  ticket: 'support:ticket',
  presence: 'support:presence',
  typing: 'support:typing',
  error: 'support:error'
} as const

export const SUPPORT_MAX_ATTACHMENTS = 5
export const SUPPORT_MAX_MESSAGE = 5000

export const SUPPORT_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  RESERVATIONS: 'Reservas y recepción',
  INVOICING: 'Facturación electrónica',
  SUBSCRIPTION: 'Suscripción y pagos',
  TECHNICAL: 'Error del sistema',
  ACCESS: 'Usuarios y accesos',
  SUGGESTION: 'Sugerencia',
  OTHER: 'Otro'
}

export const SUPPORT_CATEGORIES = Object.keys(SUPPORT_CATEGORY_LABELS) as SupportTicketCategory[]

export const SUPPORT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  OPEN: 'Esperando a DLS',
  ANSWERED: 'Respondida',
  RESOLVED: 'Resuelta'
}

export const SUPPORT_STATUS_COLORS: Record<SupportTicketStatus, 'warning' | 'info' | 'success'> = {
  OPEN: 'warning',
  ANSWERED: 'info',
  RESOLVED: 'success'
}

export const SUPPORT_MODE_COLORS: Record<SupportMode, 'success' | 'warning' | 'secondary'> = {
  ONLINE: 'success',
  AWAY: 'warning',
  OFFLINE: 'secondary'
}
