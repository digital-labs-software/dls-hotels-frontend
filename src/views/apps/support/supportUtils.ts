import type { SupportAttachment, SupportMessage } from '@/types/apps/supportTypes'

const LOCALE = 'es-PE'

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

export const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false })

export const formatDayLabel = (value: string) => {
  const date = new Date(value)
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000)

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'

  return date.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })
}

/** Hora si es de hoy; si no, día corto (lista de conversaciones). */
export const formatListDate = (value: string) => {
  const date = new Date(value)
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000)

  if (diffDays === 0) return formatTime(value)
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return date.toLocaleDateString(LOCALE, { weekday: 'short' })

  return date.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short' })
}

export const formatBytes = (bytes: number | null | undefined) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const isImageAttachment = (attachment: SupportAttachment) => {
  const format = (attachment.format || attachment.url.split('.').pop() || '').toLowerCase()

  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(format)
}

export type SupportMessageGroup = {
  key: string
  authorType: SupportMessage['authorType']
  authorUuid: string | null
  dayLabel: string | null
  messages: SupportMessage[]
}

/** Agrupa mensajes consecutivos del mismo autor e inserta el separador de día. */
export const groupMessages = (messages: SupportMessage[]): SupportMessageGroup[] => {
  const groups: SupportMessageGroup[] = []
  let lastDay = ''

  for (const message of messages) {
    const day = formatDayLabel(message.createdAt)
    const authorUuid = message.author?.uuid ?? null
    const last = groups[groups.length - 1]
    const newDay = day !== lastDay

    if (
      !newDay &&
      last &&
      message.authorType !== 'SYSTEM' &&
      last.authorType === message.authorType &&
      last.authorUuid === authorUuid
    ) {
      last.messages.push(message)
    } else {
      groups.push({
        key: message.uuid,
        authorType: message.authorType,
        authorUuid,
        dayLabel: newDay ? day : null,
        messages: [message]
      })
    }

    lastDay = day
  }

  return groups
}
