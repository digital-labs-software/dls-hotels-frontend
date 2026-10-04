'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { usePathname } from 'next/navigation'

import { useSession } from 'next-auth/react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { toast } from 'react-toastify'

import { getSupportSocketUrl, supportApi } from '@/libs/supportApi'
import { SUPPORT_EVENTS } from '@/types/apps/supportTypes'
import type { SupportMessageEvent, SupportStatus, SupportUnread } from '@/types/apps/supportTypes'

type SupportContextValue = {
  propertyId: number | null
  socket: Socket | null
  connected: boolean
  status: SupportStatus | null
  unread: SupportUnread

  /** Última pantalla visitada antes de entrar a Soporte (contexto del ticket). */
  previousPageUrl: string | null
  refreshUnread: () => Promise<void>
  refreshStatus: () => Promise<void>
}

const EMPTY_UNREAD: SupportUnread = { tickets: 0, messages: 0 }

const SupportContext = createContext<SupportContextValue>({
  propertyId: null,
  socket: null,
  connected: false,
  status: null,
  unread: EMPTY_UNREAD,
  previousPageUrl: null,
  refreshUnread: async () => undefined,
  refreshStatus: async () => undefined
})

export const SupportProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status: sessionStatus } = useSession()
  const pathname = usePathname()

  const accessToken = sessionStatus === 'authenticated' ? session?.accessToken : undefined
  const propertyId = sessionStatus === 'authenticated' ? (session?.user?.propertyId ?? null) : null

  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState<SupportStatus | null>(null)
  const [unread, setUnread] = useState<SupportUnread>(EMPTY_UNREAD)
  const [previousPageUrl, setPreviousPageUrl] = useState<string | null>(null)

  const pathnameRef = useRef(pathname)
  const unreadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    pathnameRef.current = pathname

    if (pathname && !pathname.includes('/apps/support')) {
      setPreviousPageUrl(pathname)
    }
  }, [pathname])

  const refreshUnread = useCallback(async () => {
    if (!propertyId || !accessToken) {
      setUnread(EMPTY_UNREAD)

      return
    }

    try {
      setUnread(await supportApi.unread(propertyId, accessToken))
    } catch {
      // El contador no debe romper la navegación.
    }
  }, [accessToken, propertyId])

  const refreshStatus = useCallback(async () => {
    if (!propertyId || !accessToken) {
      setStatus(null)

      return
    }

    try {
      setStatus(await supportApi.status(propertyId, accessToken))
    } catch {
      // Se reintenta con el evento support:presence.
    }
  }, [accessToken, propertyId])

  const scheduleUnreadRefresh = useCallback(() => {
    if (unreadTimer.current) {
      clearTimeout(unreadTimer.current)
    }

    unreadTimer.current = setTimeout(() => void refreshUnread(), 400)
  }, [refreshUnread])

  useEffect(() => {
    if (!propertyId || !accessToken) {
      setSocket(null)
      setConnected(false)
      setStatus(null)
      setUnread(EMPTY_UNREAD)

      return
    }

    void refreshStatus()
    void refreshUnread()

    const client = io(getSupportSocketUrl(), {
      path: '/socket.io',
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionDelayMax: 10000
    })

    const onConnect = () => {
      setConnected(true)
      void refreshUnread()
    }

    const onDisconnect = () => setConnected(false)

    const onPresence = (payload: SupportStatus) => setStatus(payload)

    const onMessage = (payload: SupportMessageEvent) => {
      if (payload?.message?.authorType !== 'PLATFORM') {
        return
      }

      if (!pathnameRef.current?.includes('/apps/support')) {
        const author = payload.message.author?.name || 'Soporte DLS'
        const preview = payload.message.body?.trim() || 'Te envió un adjunto.'

        toast.info(`${author}: ${preview.length > 90 ? `${preview.slice(0, 90)}…` : preview}`, {
          toastId: payload.message.uuid
        })
      }
    }

    client.on('connect', onConnect)
    client.on('disconnect', onDisconnect)
    client.on(SUPPORT_EVENTS.presence, onPresence)
    client.on(SUPPORT_EVENTS.message, onMessage)
    client.on(SUPPORT_EVENTS.ticket, scheduleUnreadRefresh)

    setSocket(client)

    return () => {
      client.off('connect', onConnect)
      client.off('disconnect', onDisconnect)
      client.off(SUPPORT_EVENTS.presence, onPresence)
      client.off(SUPPORT_EVENTS.message, onMessage)
      client.off(SUPPORT_EVENTS.ticket, scheduleUnreadRefresh)
      client.disconnect()

      if (unreadTimer.current) {
        clearTimeout(unreadTimer.current)
      }
    }
  }, [accessToken, propertyId, refreshStatus, refreshUnread, scheduleUnreadRefresh])

  const value = useMemo(
    () => ({ propertyId, socket, connected, status, unread, previousPageUrl, refreshUnread, refreshStatus }),
    [connected, previousPageUrl, propertyId, refreshStatus, refreshUnread, socket, status, unread]
  )

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>
}

export const useSupport = () => useContext(SupportContext)
