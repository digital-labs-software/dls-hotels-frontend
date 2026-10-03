'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

import { getAuthMe } from '@/libs/authApi'
import { isSubscriptionSuspendedError, notifySubscriptionSuspended } from '@/libs/subscriptionSuspended'
import { SUBSCRIPTION_PAY, SUBSCRIPTION_SUSPENDED_EVENT, SUBSCRIPTION_VIEW } from '@/types/apps/billingTypes'

type SubscriptionAccessValue = {
  permissions: string[]
  subscriptionSuspended: boolean
  canViewSubscription: boolean
  canPaySubscription: boolean
  loaded: boolean
  refreshAccess: () => Promise<void>
}

const SubscriptionAccessContext = createContext<SubscriptionAccessValue>({
  permissions: [],
  subscriptionSuspended: false,
  canViewSubscription: true,
  canPaySubscription: true,
  loaded: false,
  refreshAccess: async () => undefined
})

const isBillingPath = (pathname?: string | null) => Boolean(pathname && pathname.includes('/apps/billing'))

export const SubscriptionAccessProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const locale = typeof params?.lang === 'string' ? params.lang : 'en'

  const [permissions, setPermissions] = useState<string[]>(session?.user?.permissions || [])
  const [subscriptionSuspended, setSubscriptionSuspended] = useState(Boolean(session?.user?.subscriptionSuspended))
  const [loaded, setLoaded] = useState(false)

  const billingUrl = `/${locale}/apps/billing`

  const refreshAccess = useCallback(async () => {
    if (!session?.accessToken) {
      setLoaded(true)

      return
    }

    try {
      const me = await getAuthMe(session.accessToken)
      const nextPermissions = Array.isArray(me.permissions) ? me.permissions : []

      setPermissions(nextPermissions)
      setSubscriptionSuspended(Boolean(me.subscriptionSuspended))
    } catch (error) {
      if (isSubscriptionSuspendedError(error)) {
        setSubscriptionSuspended(true)
        notifySubscriptionSuspended(error)
      } else {
        setPermissions(session.user?.permissions || [])
        setSubscriptionSuspended(Boolean(session.user?.subscriptionSuspended))
      }
    } finally {
      setLoaded(true)
    }
  }, [session?.accessToken, session?.user?.permissions, session?.user?.subscriptionSuspended])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (status === 'unauthenticated') {
      setLoaded(true)

      return
    }

    refreshAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken, status])

  useEffect(() => {
    const onSuspended = () => {
      setSubscriptionSuspended(true)
    }

    window.addEventListener(SUBSCRIPTION_SUSPENDED_EVENT, onSuspended)

    return () => {
      window.removeEventListener(SUBSCRIPTION_SUSPENDED_EVENT, onSuspended)
    }
  }, [])

  useEffect(() => {
    if (!subscriptionSuspended || !pathname || isBillingPath(pathname)) {
      return
    }

    router.replace(billingUrl)
  }, [billingUrl, pathname, router, subscriptionSuspended])

  const hasPermissionCatalog = permissions.length > 0
  const canViewSubscription =
    subscriptionSuspended || !hasPermissionCatalog || permissions.includes(SUBSCRIPTION_VIEW)
  const canPaySubscription = !hasPermissionCatalog || permissions.includes(SUBSCRIPTION_PAY)

  const value = useMemo(
    () => ({
      permissions,
      subscriptionSuspended,
      canViewSubscription,
      canPaySubscription,
      loaded,
      refreshAccess
    }),
    [canPaySubscription, canViewSubscription, loaded, permissions, refreshAccess, subscriptionSuspended]
  )

  return <SubscriptionAccessContext.Provider value={value}>{children}</SubscriptionAccessContext.Provider>
}

export const useSubscriptionAccess = () => useContext(SubscriptionAccessContext)
