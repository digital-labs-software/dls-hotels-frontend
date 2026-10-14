'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

import type { NestAuthUser } from '@/types/apps/authTypes'
import { getAuthMe } from '@/libs/authApi'
import { isSubscriptionSuspendedError, notifySubscriptionSuspended } from '@/libs/subscriptionSuspended'
import { SUBSCRIPTION_HISTORY_VIEW, SUBSCRIPTION_PAY, SUBSCRIPTION_SUSPENDED_EVENT, SUBSCRIPTION_VIEW } from '@/types/apps/billingTypes'
import {
  CASH_CLOSE,
  CASH_EXPENSE,
  CASH_MENU_PERMISSIONS,
  CASH_OPEN,
  CLIENT_MENU_PERMISSIONS,
  DASHBOARD_VIEW,
  HOTEL_MENU_PERMISSIONS,
  PROFILE_MENU_PERMISSIONS,
  RECEPTION_PERMISSIONS,
  REPORT_MENU_PERMISSIONS,
  RESERVATION_PERMISSIONS,
  ROOM_MENU_PERMISSIONS,
  SUPPORT_MENU_PERMISSIONS
} from '@/types/apps/hotelPermissions'
import {
  EMPLOYEES_CREATE,
  EMPLOYEES_DELETE,
  EMPLOYEES_EDIT,
  EMPLOYEES_VIEW,
  ROLES_CREATE,
  ROLES_DELETE,
  ROLES_EDIT,
  ROLES_VIEW
} from '@/types/apps/staffTypes'
import { INVOICES_ISSUE, INVOICES_SETTINGS, INVOICES_VIEW, INVOICES_VOID } from '@/types/apps/einvoiceTypes'

type SubscriptionAccessValue = {
  me: NestAuthUser | null
  permissions: string[]
  subscriptionSuspended: boolean
  can: (code: string) => boolean
  canAny: (codes: readonly string[]) => boolean
  canViewDashboard: boolean
  canViewReception: boolean
  canViewReservations: boolean
  canViewRooms: boolean
  canViewClients: boolean
  canViewReports: boolean
  canViewCash: boolean
  canOpenCash: boolean
  canRecordCashExpense: boolean
  canCloseCash: boolean
  canViewHotel: boolean
  canViewSupport: boolean
  canViewProfile: boolean
  canViewSubscription: boolean
  canViewSubscriptionHistory: boolean
  canPaySubscription: boolean
  canViewEmployees: boolean
  canCreateEmployees: boolean
  canEditEmployees: boolean
  canDeleteEmployees: boolean
  canManageEmployees: boolean
  canViewRoles: boolean
  canCreateRoles: boolean
  canEditRoles: boolean
  canDeleteRoles: boolean
  canManageRoles: boolean
  canViewStaff: boolean
  canViewInvoices: boolean
  canIssueInvoices: boolean
  canVoidInvoices: boolean
  canSettingsInvoices: boolean
  loaded: boolean
  refreshAccess: () => Promise<void>
}

const allow = () => true

const SubscriptionAccessContext = createContext<SubscriptionAccessValue>({
  me: null,
  permissions: [],
  subscriptionSuspended: false,
  can: allow,
  canAny: allow,
  canViewDashboard: true,
  canViewReception: true,
  canViewReservations: true,
  canViewRooms: true,
  canViewClients: true,
  canViewReports: true,
  canViewCash: true,
  canOpenCash: true,
  canRecordCashExpense: true,
  canCloseCash: true,
  canViewHotel: true,
  canViewSupport: true,
  canViewProfile: true,
  canViewSubscription: true,
  canViewSubscriptionHistory: true,
  canPaySubscription: true,
  canViewEmployees: true,
  canCreateEmployees: true,
  canEditEmployees: true,
  canDeleteEmployees: true,
  canManageEmployees: true,
  canViewRoles: true,
  canCreateRoles: true,
  canEditRoles: true,
  canDeleteRoles: true,
  canManageRoles: true,
  canViewStaff: true,
  canViewInvoices: true,
  canIssueInvoices: true,
  canVoidInvoices: true,
  canSettingsInvoices: true,
  loaded: false,
  refreshAccess: async () => undefined
})

const isAllowedWhenSuspended = (pathname?: string | null) =>
  Boolean(
    pathname &&
      (pathname.includes('/apps/billing') || pathname.includes('/apps/profile') || pathname.includes('/apps/support'))
  )

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
  const can = useCallback(
    (code: string) => !hasPermissionCatalog || permissions.includes(code),
    [hasPermissionCatalog, permissions]
  )
  const canAny = useCallback(
    (codes: readonly string[]) => !hasPermissionCatalog || codes.some(code => permissions.includes(code)),
    [hasPermissionCatalog, permissions]
  )
  const canViewDashboard = can(DASHBOARD_VIEW)
  const canViewReception = canAny(RECEPTION_PERMISSIONS)
  const canViewReservations = canAny(RESERVATION_PERMISSIONS)
  const canViewRooms = canAny(ROOM_MENU_PERMISSIONS)
  const canViewClients = canAny(CLIENT_MENU_PERMISSIONS)
  const canViewReports = canAny(REPORT_MENU_PERMISSIONS)
  const canViewCash = canAny(CASH_MENU_PERMISSIONS)
  const canOpenCash = can(CASH_OPEN)
  const canRecordCashExpense = can(CASH_EXPENSE)
  const canCloseCash = can(CASH_CLOSE)
  const canViewHotel = canAny(HOTEL_MENU_PERMISSIONS)
  const canViewSupport = canAny(SUPPORT_MENU_PERMISSIONS)
  const canViewProfile = canAny(PROFILE_MENU_PERMISSIONS)
  const canViewSubscription =
    subscriptionSuspended || can(SUBSCRIPTION_VIEW) || can(SUBSCRIPTION_PAY) || can(SUBSCRIPTION_HISTORY_VIEW)
  const canViewSubscriptionHistory = can(SUBSCRIPTION_HISTORY_VIEW) || can(SUBSCRIPTION_VIEW) || can(SUBSCRIPTION_PAY)
  const canPaySubscription = can(SUBSCRIPTION_PAY)
  const canCreateEmployees = can(EMPLOYEES_CREATE)
  const canEditEmployees = can(EMPLOYEES_EDIT)
  const canDeleteEmployees = can(EMPLOYEES_DELETE)
  const canManageEmployees = canCreateEmployees || canEditEmployees
  const canViewEmployees = can(EMPLOYEES_VIEW) || canManageEmployees || canDeleteEmployees
  const canCreateRoles = can(ROLES_CREATE)
  const canEditRoles = can(ROLES_EDIT)
  const canDeleteRoles = can(ROLES_DELETE)
  const canManageRoles = canCreateRoles || canEditRoles
  const canViewRoles = can(ROLES_VIEW) || canManageRoles || canDeleteRoles || canCreateEmployees || canEditEmployees
  const canViewStaff = canViewEmployees || can(ROLES_VIEW) || canManageRoles || canDeleteRoles
  const canIssueInvoices = !hasPermissionCatalog || permissions.includes(INVOICES_ISSUE)
  const canVoidInvoices = !hasPermissionCatalog || permissions.includes(INVOICES_VOID)
  const canSettingsInvoices = !hasPermissionCatalog || permissions.includes(INVOICES_SETTINGS)
  const canViewInvoices =
    canIssueInvoices ||
    canSettingsInvoices ||
    !hasPermissionCatalog ||
    permissions.includes(INVOICES_VIEW)

  const value = useMemo(
    () => ({
      me,
      permissions,
      subscriptionSuspended,
      can,
      canAny,
      canViewDashboard,
      canViewReception,
      canViewReservations,
      canViewRooms,
      canViewClients,
      canViewReports,
      canViewCash,
      canOpenCash,
      canRecordCashExpense,
      canCloseCash,
      canViewHotel,
      canViewSupport,
      canViewProfile,
      canViewSubscription,
      canViewSubscriptionHistory,
      canPaySubscription,
      canViewEmployees,
      canCreateEmployees,
      canEditEmployees,
      canDeleteEmployees,
      canManageEmployees,
      canViewRoles,
      canCreateRoles,
      canEditRoles,
      canDeleteRoles,
      canManageRoles,
      canViewStaff,
      canViewInvoices,
      canIssueInvoices,
      canVoidInvoices,
      canSettingsInvoices,
      loaded,
      refreshAccess
    }),
    [
      can,
      canAny,
      canCreateEmployees,
      canCreateRoles,
      canDeleteEmployees,
      canDeleteRoles,
      canEditEmployees,
      canEditRoles,
      canManageEmployees,
      canManageRoles,
      canPaySubscription,
      canViewClients,
      canViewDashboard,
      canViewEmployees,
      canViewHotel,
      canViewProfile,
      canViewReception,
      canViewReports,
      canViewCash,
      canOpenCash,
      canRecordCashExpense,
      canCloseCash,
      canViewReservations,
      canViewRoles,
      canViewRooms,
      canViewSubscriptionHistory,
      canIssueInvoices,
      canSettingsInvoices,
      canViewInvoices,
      canViewStaff,
      canViewSubscription,
      canViewSupport,
      canVoidInvoices,
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
