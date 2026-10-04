'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import Backdrop from '@mui/material/Backdrop'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'
import classnames from 'classnames'
import { toast } from 'react-toastify'

import { useSettings } from '@core/hooks/useSettings'
import { commonLayoutClasses } from '@layouts/utils/layoutClasses'
import { useSupport } from '@/contexts/supportContext'
import { getSupportApiErrorMessage, supportApi } from '@/libs/supportApi'
import type {
  CreateSupportTicketDto,
  SupportMessage,
  SupportMessageEvent,
  SupportTicket,
  SupportTicketDetail,
  SupportTypingEvent
} from '@/types/apps/supportTypes'
import { SUPPORT_EVENTS } from '@/types/apps/supportTypes'
import NewTicketDialog from './NewTicketDialog'
import SupportConversation from './SupportConversation'
import SupportSidebar from './SupportSidebar'

const sortTickets = (tickets: SupportTicket[]) =>
  [...tickets].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

const upsertTicket = (tickets: SupportTicket[], ticket: SupportTicket) =>
  sortTickets([ticket, ...tickets.filter(item => item.uuid !== ticket.uuid)])

const appendMessage = (messages: SupportMessage[], message: SupportMessage) =>
  messages.some(item => item.uuid === message.uuid) ? messages : [...messages, message]

const toSummary = (detail: SupportTicketDetail): SupportTicket => {
  const ticket: SupportTicket & { messages?: unknown } = { ...detail }

  delete ticket.messages

  return ticket
}

const SupportPage = () => {
  const { settings } = useSettings()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { propertyId, socket, connected, status, refreshUnread, previousPageUrl } = useSupport()

  const isBelowMdScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'))
  const isBelowSmScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [activeUuid, setActiveUuid] = useState<string | null>(searchParams.get('ticket'))
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [typingName, setTypingName] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeRef = useRef<string | null>(activeUuid)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    activeRef.current = activeUuid
  }, [activeUuid])

  const markRead = useCallback(
    async (uuid: string) => {
      if (!propertyId) return

      try {
        const ticket = await supportApi.markRead(propertyId, uuid)

        setTickets(prev => prev.map(item => (item.uuid === uuid ? { ...item, unreadCount: ticket.unreadCount } : item)))
        void refreshUnread()
      } catch {
        // Se vuelve a intentar al abrir la conversación.
      }
    },
    [propertyId, refreshUnread]
  )

  const loadTickets = useCallback(async () => {
    if (!propertyId) return

    try {
      const page = await supportApi.tickets(propertyId, { limit: 100 })

      setTickets(sortTickets(page.data))
    } catch (error) {
      toast.error(getSupportApiErrorMessage(error, 'No se pudieron cargar tus conversaciones.'))
    } finally {
      setLoadingList(false)
    }
  }, [propertyId])

  useEffect(() => {
    void loadTickets()
  }, [loadTickets])

  useEffect(() => {
    if (connected) void loadTickets()
  }, [connected, loadTickets])

  useEffect(() => {
    if (!propertyId || !activeUuid) {
      setDetail(null)

      return
    }

    let cancelled = false

    setLoadingDetail(true)
    setTypingName(null)
    setDetail(prev => (prev?.uuid === activeUuid ? prev : null))

    supportApi
      .ticket(propertyId, activeUuid)
      .then(ticket => {
        if (cancelled) return

        setDetail(ticket)
        setTickets(prev => upsertTicket(prev, toSummary(ticket)))

        if (ticket.unreadCount > 0) void markRead(ticket.uuid)
      })
      .catch(error => {
        if (cancelled) return

        toast.error(getSupportApiErrorMessage(error, 'No se pudo abrir la conversación.'))
        setActiveUuid(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeUuid, markRead, propertyId])

  useEffect(() => {
    if (!socket) return

    const onTicket = (ticket: SupportTicket) => {
      setTickets(prev => upsertTicket(prev, ticket))

      if (ticket.uuid !== activeRef.current) return

      setDetail(prev => (prev ? { ...prev, ...ticket, messages: prev.messages } : prev))

      if (ticket.unreadCount > 0 && document.visibilityState === 'visible') void markRead(ticket.uuid)
    }

    const onMessage = ({ ticketUuid, message }: SupportMessageEvent) => {
      if (ticketUuid !== activeRef.current) return

      setDetail(prev => (prev ? { ...prev, messages: appendMessage(prev.messages, message) } : prev))

      if (message.authorType === 'PLATFORM') setTypingName(null)
    }

    const onTyping = (event: SupportTypingEvent) => {
      if (event.ticketUuid !== activeRef.current || event.authorType !== 'PLATFORM') return

      if (typingTimer.current) clearTimeout(typingTimer.current)

      if (!event.typing) {
        setTypingName(null)

        return
      }

      setTypingName(event.name || 'Soporte DLS')
      typingTimer.current = setTimeout(() => setTypingName(null), 6000)
    }

    socket.on(SUPPORT_EVENTS.ticket, onTicket)
    socket.on(SUPPORT_EVENTS.message, onMessage)
    socket.on(SUPPORT_EVENTS.typing, onTyping)

    return () => {
      socket.off(SUPPORT_EVENTS.ticket, onTicket)
      socket.off(SUPPORT_EVENTS.message, onMessage)
      socket.off(SUPPORT_EVENTS.typing, onTyping)

      if (typingTimer.current) clearTimeout(typingTimer.current)
    }
  }, [markRead, socket])

  useEffect(() => {
    const onVisible = () => {
      const current = tickets.find(item => item.uuid === activeRef.current)

      if (document.visibilityState === 'visible' && current && current.unreadCount > 0) void markRead(current.uuid)
    }

    document.addEventListener('visibilitychange', onVisible)

    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [markRead, tickets])

  useEffect(() => {
    const current = searchParams.get('ticket')

    if (current === activeUuid) return

    const params = new URLSearchParams(searchParams.toString())

    if (activeUuid) params.set('ticket', activeUuid)
    else params.delete('ticket')

    const query = params.toString()

    router.replace(query ? `?${query}` : '?', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUuid])

  const selectTicket = (uuid: string) => {
    setActiveUuid(uuid)

    if (isBelowMdScreen) setSidebarOpen(false)
  }

  const handleTyping = (typing: boolean) => {
    if (socket && activeRef.current) socket.emit(SUPPORT_EVENTS.typing, { ticketUuid: activeRef.current, typing })
  }

  const handleSend = async (body: string, files: File[]) => {
    if (!propertyId || !detail) return false

    setSending(true)

    try {
      const attachments = files.length ? await supportApi.uploadAttachments(propertyId, files) : undefined
      const message = await supportApi.send(propertyId, detail.uuid, { body: body || undefined, attachments })

      setDetail(prev =>
        prev && prev.uuid === detail.uuid ? { ...prev, messages: appendMessage(prev.messages, message) } : prev
      )

      return true
    } catch (error) {
      toast.error(
        getSupportApiErrorMessage(error, error instanceof Error ? error.message : 'No se pudo enviar el mensaje.')
      )

      return false
    } finally {
      setSending(false)
    }
  }

  const handleResolve = async () => {
    if (!propertyId || !detail) return

    setResolving(true)

    try {
      const ticket = await supportApi.resolve(propertyId, detail.uuid)

      setDetail(ticket)
      setTickets(prev => upsertTicket(prev, toSummary(ticket)))
      toast.success('Consulta marcada como resuelta. ¡Gracias!')
    } catch (error) {
      toast.error(getSupportApiErrorMessage(error, 'No se pudo marcar como resuelta.'))
    } finally {
      setResolving(false)
    }
  }

  const handleCreate = async (payload: Omit<CreateSupportTicketDto, 'attachments'>, files: File[]) => {
    if (!propertyId) return false

    setCreating(true)

    try {
      const attachments = files.length ? await supportApi.uploadAttachments(propertyId, files) : undefined

      const ticket = await supportApi.create(propertyId, {
        ...payload,
        attachments,
        context: {
          pageUrl: previousPageUrl || window.location.pathname,
          userAgent: navigator.userAgent.slice(0, 300),
          appVersion: process.env.NEXT_PUBLIC_APP_VERSION || undefined
        }
      })

      setTickets(prev => upsertTicket(prev, toSummary(ticket)))
      setDetail(ticket)
      setActiveUuid(ticket.uuid)
      toast.success(`Consulta #${ticket.number} enviada.`)

      return true
    } catch (error) {
      toast.error(
        getSupportApiErrorMessage(error, error instanceof Error ? error.message : 'No se pudo enviar la consulta.')
      )

      return false
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className={classnames(commonLayoutClasses.contentHeightFixed, 'flex is-full overflow-hidden rounded relative', {
        border: settings.skin === 'bordered',
        'shadow-md': settings.skin !== 'bordered'
      })}
    >
      <SupportSidebar
        tickets={tickets}
        loading={loadingList}
        activeUuid={activeUuid}
        status={status}
        connected={connected}
        open={sidebarOpen}
        isBelowMdScreen={isBelowMdScreen}
        isBelowSmScreen={isBelowSmScreen}
        onClose={() => setSidebarOpen(false)}
        onSelect={selectTicket}
        onNew={() => setNewOpen(true)}
      />

      <SupportConversation
        ticket={detail}
        loading={loadingDetail}
        status={status}
        connected={connected}
        typingName={typingName}
        sending={sending}
        resolving={resolving}
        isBelowMdScreen={isBelowMdScreen}
        isBelowSmScreen={isBelowSmScreen}
        onOpenSidebar={() => setSidebarOpen(true)}
        onNew={() => setNewOpen(true)}
        onSend={handleSend}
        onResolve={handleResolve}
        onTyping={handleTyping}
      />

      <Backdrop
        open={isBelowMdScreen && sidebarOpen && !isBelowSmScreen}
        onClick={() => setSidebarOpen(false)}
        className='absolute z-10'
      />

      <NewTicketDialog
        open={newOpen}
        status={status}
        submitting={creating}
        onClose={() => setNewOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}

export default SupportPage
