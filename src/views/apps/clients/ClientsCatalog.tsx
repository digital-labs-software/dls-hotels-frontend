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

const ClientsCatalog = ({ defaultTab }: { defaultTab?: string }) => {
  const router = useRouter()
  const { lang: locale } = useParams()
  const [activeTab, setActiveTab] = useState<ClientTab>(isClientTab(defaultTab) ? defaultTab : 'guests')

  useEffect(() => {
    setActiveTab(isClientTab(defaultTab) ? defaultTab : 'guests')
  }, [defaultTab])

  const handleChange = (_event: SyntheticEvent, value: string) => {
    if (!isClientTab(value)) {
      return
    }

    setActiveTab(value)

    const baseUrl = getLocalizedUrl('/apps/clients', locale as Locale)

    router.replace(value === 'guests' ? baseUrl : `${baseUrl}?tab=${value}`)
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }} className='flex flex-col gap-6'>
        <TabContext value={activeTab}>
          <CustomTabList onChange={handleChange} variant='scrollable' pill='true'>
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-user-line text-lg' />
                  Huéspedes
                </div>
              }
              value='guests'
            />
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-building-line text-lg' />
                  Empresas
                </div>
              }
              value='companies'
            />
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
