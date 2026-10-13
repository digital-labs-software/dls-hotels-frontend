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
  COMPANIES_CREATE,
  COMPANIES_DELETE,
  COMPANIES_EDIT,
  COMPANIES_VIEW,
  GUESTS_CREATE,
  GUESTS_DELETE,
  GUESTS_EDIT,
  GUESTS_VIEW
} from '@/types/apps/hotelPermissions'
import CompanyListClient from '@views/apps/clients/companies/list/CompanyListClient'
import GuestListClient from '@views/apps/clients/guests/list/GuestListClient'
import { getLocalizedUrl } from '@/utils/i18n'

const CLIENT_TABS = ['guests', 'companies'] as const

type ClientTab = (typeof CLIENT_TABS)[number]

const tabContentList: Record<ClientTab, ReactElement> = {
  guests: <GuestListClient />,
  companies: <CompanyListClient />
}

const isClientTab = (value?: string): value is ClientTab => {
  return CLIENT_TABS.includes(value as ClientTab)
}

const TAB_PERMISSIONS: Record<ClientTab, readonly string[]> = {
  guests: [GUESTS_VIEW, GUESTS_CREATE, GUESTS_EDIT, GUESTS_DELETE],
  companies: [COMPANIES_VIEW, COMPANIES_CREATE, COMPANIES_EDIT, COMPANIES_DELETE]
}

const ClientsCatalog = ({ defaultTab }: { defaultTab?: string }) => {
  const router = useRouter()
  const { lang: locale } = useParams()
  const { canAny, canViewClients, loaded } = useSubscriptionAccess()
  const allowedTabs = CLIENT_TABS.filter(tab => canAny(TAB_PERMISSIONS[tab]))
  const allowedKey = allowedTabs.join(',')
  const [activeTab, setActiveTab] = useState<ClientTab>(isClientTab(defaultTab) ? defaultTab : 'guests')

  useEffect(() => {
    if (!loaded) {
      return
    }

    const tabs = allowedKey ? (allowedKey.split(',') as ClientTab[]) : []

    if (!canViewClients || tabs.length === 0) {
      router.replace(getLocalizedUrl('/apps/dashboard', locale as Locale))

      return
    }

    const requested = isClientTab(defaultTab) ? defaultTab : tabs[0]
    const next = tabs.includes(requested) ? requested : tabs[0]

    setActiveTab(current => (current === next ? current : next))
  }, [allowedKey, canViewClients, defaultTab, loaded, locale, router])

  const handleChange = (_event: SyntheticEvent, value: string) => {
    if (!isClientTab(value) || !allowedTabs.includes(value)) {
      return
    }

    setActiveTab(value)

    const baseUrl = getLocalizedUrl('/apps/clients', locale as Locale)

    router.replace(value === 'guests' ? baseUrl : `${baseUrl}?tab=${value}`)
  }

  if (!loaded || allowedTabs.length === 0 || !allowedTabs.includes(activeTab)) {
    return null
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }} className='flex flex-col gap-6'>
        <TabContext value={activeTab}>
          <CustomTabList onChange={handleChange} variant='scrollable' pill='true'>
            {allowedTabs.includes('guests') ? (
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-user-line text-lg' />
                  Huéspedes
                </div>
              }
              value='guests'
            />
            ) : null}
            {allowedTabs.includes('companies') ? (
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-building-line text-lg' />
                  Empresas
                </div>
              }
              value='companies'
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

export default ClientsCatalog
