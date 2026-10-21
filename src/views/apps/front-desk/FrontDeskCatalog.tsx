'use client'

import { useEffect, useState } from 'react'
import type { ReactElement, SyntheticEvent } from 'react'

import { useParams, useRouter } from 'next/navigation'

import Grid from '@mui/material/Grid'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import type { Locale } from '@configs/i18n'
import CustomTabList from '@core/components/mui/TabList'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import {
  RECEPTION_CHECK_IN,
  RECEPTION_CHECK_OUT,
  RECEPTION_DESK_VIEW,
  RECEPTION_PAYMENTS_CREATE,
  RECEPTION_PAYMENTS_VIEW,
  RECEPTION_WALK_IN
} from '@/types/apps/hotelPermissions'
import AccountsClient from '@views/apps/front-desk/AccountsClient'
import FrontDeskClient from '@views/apps/front-desk/FrontDeskClient'
import PaymentsCashClient from '@views/apps/front-desk/PaymentsCashClient'
import { getLocalizedUrl } from '@/utils/i18n'

const FRONT_DESK_TABS = ['desk', 'accounts', 'payments'] as const

type FrontDeskTab = (typeof FRONT_DESK_TABS)[number]

const tabContentList: Record<FrontDeskTab, ReactElement> = {
  desk: <FrontDeskClient />,
  accounts: <AccountsClient />,
  payments: <PaymentsCashClient />
}

const isFrontDeskTab = (value?: string): value is FrontDeskTab => {
  return FRONT_DESK_TABS.includes(value as FrontDeskTab)
}

const TAB_PERMISSIONS: Record<FrontDeskTab, readonly string[]> = {
  desk: [RECEPTION_DESK_VIEW, RECEPTION_WALK_IN, RECEPTION_CHECK_IN, RECEPTION_CHECK_OUT],
  accounts: [RECEPTION_DESK_VIEW, RECEPTION_PAYMENTS_VIEW, RECEPTION_PAYMENTS_CREATE],
  payments: [RECEPTION_PAYMENTS_VIEW, RECEPTION_PAYMENTS_CREATE]
}

const FrontDeskCatalog = ({ defaultTab }: { defaultTab?: string }) => {
  const router = useRouter()
  const { lang: locale } = useParams()
  const { canAny, canViewReception, loaded } = useSubscriptionAccess()
  const allowedTabs = FRONT_DESK_TABS.filter(tab => canAny(TAB_PERMISSIONS[tab]))
  const allowedKey = allowedTabs.join(',')
  const [activeTab, setActiveTab] = useState<FrontDeskTab>(isFrontDeskTab(defaultTab) ? defaultTab : 'desk')

  useEffect(() => {
    if (!loaded) {
      return
    }

    const tabs = allowedKey ? (allowedKey.split(',') as FrontDeskTab[]) : []

    if (!canViewReception || tabs.length === 0) {
      router.replace(getLocalizedUrl('/apps/dashboard', locale as Locale))

      return
    }

    const requested = isFrontDeskTab(defaultTab) ? defaultTab : tabs[0]
    const next = tabs.includes(requested) ? requested : tabs[0]

    setActiveTab(current => (current === next ? current : next))
  }, [allowedKey, canViewReception, defaultTab, loaded, locale, router])

  const handleChange = (_event: SyntheticEvent, value: string) => {
    if (!isFrontDeskTab(value) || !allowedTabs.includes(value)) {
      return
    }

    setActiveTab(value)

    const baseUrl = getLocalizedUrl('/apps/front-desk', locale as Locale)

    router.replace(value === 'desk' ? baseUrl : `${baseUrl}?tab=${value}`)
  }

  if (!loaded || allowedTabs.length === 0 || !allowedTabs.includes(activeTab)) {
    return null
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }} className='flex flex-col gap-4'>
        <TabContext value={activeTab}>
          <CustomTabList onChange={handleChange} variant='scrollable' pill='true'>
            {allowedTabs.includes('desk') ? (
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-dashboard-2-line text-lg' />
                  Recepción
                </div>
              }
              value='desk'
            />
            ) : null}
            {allowedTabs.includes('accounts') ? (
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-bill-line text-lg' />
                  Cuentas
                </div>
              }
              value='accounts'
            />
            ) : null}
            {allowedTabs.includes('payments') ? (
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-wallet-3-line text-lg' />
                  Caja
                </div>
              }
              value='payments'
            />
            ) : null}
          </CustomTabList>

          <TabPanel value={activeTab} className='p-0'>
            {tabContentList[activeTab]}
          </TabPanel>
        </TabContext>
      </Grid>
    </Grid>
  )
}

export default FrontDeskCatalog
