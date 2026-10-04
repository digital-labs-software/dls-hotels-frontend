'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

import type { NestAuthUser } from '@/types/apps/authTypes'
import { getAuthMe } from '@/libs/authApi'
import { isSubscriptionSuspendedError, notifySubscriptionSuspended } from '@/libs/subscriptionSuspended'
import { SUBSCRIPTION_PAY, SUBSCRIPTION_SUSPENDED_EVENT, SUBSCRIPTION_VIEW } from '@/types/apps/billingTypes'
import { EMPLOYEES_MANAGE, EMPLOYEES_VIEW, ROLES_MANAGE, ROLES_VIEW } from '@/types/apps/staffTypes'

type SubscriptionAccessValue = {
  me: NestAuthUser | null
  permissions: string[]
  subscriptionSuspended: boolean
  canViewSubscription: boolean
  canPaySubscription: boolean
  canViewEmployees: boolean
  canManageEmployees: boolean
  canViewRoles: boolean
  canManageRoles: boolean
  canViewStaff: boolean
  loaded: boolean
  refreshAccess: () => Promise<void>
}

const SubscriptionAccessContext = createContext<SubscriptionAccessValue>({
  me: null,
  permissions: [],
  subscriptionSuspended: false,
  canViewSubscription: true,
  canPaySubscription: true,
  canViewEmployees: true,
  canManageEmployees: true,
  canViewRoles: true,
  canManageRoles: true,
  canViewStaff: true,
  loaded: false,
  refreshAccess: async () => undefined
})

const isAllowedWhenSuspended = (pathname?: string | null) =>
  Boolean(pathname && (pathname.includes('/apps/billing') || pathname.includes('/apps/profile')))

export const SubscriptionAccessProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const locale = typeof params?.lang === 'string' ? params.lang : 'en'

  const [me, setMe] = useState<NestAuthUser | null>(null)
  const [permissions, setPermissions] = useState<string[]>(session?.user?.permissions || [])
  const [subscriptionSuspended, setSubscriptionSuspended] = useState(Boolean(session?.user?.subscriptionSuspended))
  const [loaded, setLoaded] = useState(false)

  const billingUrl = `/${locale}/apps/billing`

  const refreshAccess = useCallback(async () => {
    if (!session?.accessToken) {
      setMe(null)
      setLoaded(true)

      return
    }

    try {
      const nextMe = await getAuthMe(session.accessToken)
      const nextPermissions = Array.isArray(nextMe.permissions) ? nextMe.permissions : []

      setMe(nextMe)
      setPermissions(nextPermissions)
      setSubscriptionSuspended(Boolean(nextMe.subscriptionSuspended))
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
      setMe(null)
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
    if (!subscriptionSuspended || !pathname || isAllowedWhenSuspended(pathname)) {
      return
    }

    router.replace(billingUrl)
  }, [billingUrl, pathname, router, subscriptionSuspended])

  const hasPermissionCatalog = permissions.length > 0
  const canViewSubscription =
    subscriptionSuspended || !hasPermissionCatalog || permissions.includes(SUBSCRIPTION_VIEW)
  const canPaySubscription = !hasPermissionCatalog || permissions.includes(SUBSCRIPTION_PAY)
  const canManageEmployees = !hasPermissionCatalog || permissions.includes(EMPLOYEES_MANAGE)
  const canViewEmployees =
    canManageEmployees || !hasPermissionCatalog || permissions.includes(EMPLOYEES_VIEW)
  const canManageRoles = !hasPermissionCatalog || permissions.includes(ROLES_MANAGE)
  const canViewRoles =
    canManageRoles || canManageEmployees || !hasPermissionCatalog || permissions.includes(ROLES_VIEW)
  const canViewStaff = canViewEmployees || canViewRoles

  const value = useMemo(
    () => ({
      me,
      permissions,
      subscriptionSuspended,
      canViewSubscription,
      canPaySubscription,
      canViewEmployees,
      canManageEmployees,
      canViewRoles,
      canManageRoles,
      canViewStaff,
      loaded,
      refreshAccess
    }),
    [
      canManageEmployees,
      canManageRoles,
      canPaySubscription,
      canViewEmployees,
      canViewRoles,
      canViewStaff,
      canViewSubscription,
      loaded,
      me,
      permissions,
      refreshAccess,
      subscriptionSuspended
    ]
  )

  return <SubscriptionAccessContext.Provider value={value}>{children}</SubscriptionAccessContext.Provider>
}

export const useSubscriptionAccess = () => useContext(SubscriptionAccessContext)
