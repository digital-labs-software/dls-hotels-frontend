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
import FrontDeskClient from '@views/apps/front-desk/FrontDeskClient'
import PaymentsCashClient from '@views/apps/front-desk/PaymentsCashClient'
import { getLocalizedUrl } from '@/utils/i18n'

const FRONT_DESK_TABS = ['desk', 'payments'] as const

type FrontDeskTab = (typeof FRONT_DESK_TABS)[number]

const tabContentList: Record<FrontDeskTab, ReactElement> = {
  desk: <FrontDeskClient />,
  payments: <PaymentsCashClient />
}

const isFrontDeskTab = (value?: string): value is FrontDeskTab => {
  return FRONT_DESK_TABS.includes(value as FrontDeskTab)
}

const FrontDeskCatalog = ({ defaultTab }: { defaultTab?: string }) => {
  const router = useRouter()
  const { lang: locale } = useParams()
  const [activeTab, setActiveTab] = useState<FrontDeskTab>(isFrontDeskTab(defaultTab) ? defaultTab : 'desk')

  useEffect(() => {
    setActiveTab(isFrontDeskTab(defaultTab) ? defaultTab : 'desk')
  }, [defaultTab])

  const handleChange = (_event: SyntheticEvent, value: string) => {
    if (!isFrontDeskTab(value)) {
      return
    }

    setActiveTab(value)

    const baseUrl = getLocalizedUrl('/apps/front-desk', locale as Locale)

    router.replace(value === 'desk' ? baseUrl : `${baseUrl}?tab=${value}`)
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }} className='flex flex-col gap-6'>
        <TabContext value={activeTab}>
          <CustomTabList onChange={handleChange} variant='scrollable' pill='true'>
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-dashboard-2-line text-lg' />
                  Recepción
                </div>
              }
              value='desk'
            />
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-wallet-3-line text-lg' />
                  Pagos
                </div>
              }
              value='payments'
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

export default FrontDeskCatalog
