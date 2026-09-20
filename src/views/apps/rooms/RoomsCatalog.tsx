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
import FloorListClient from '@views/apps/floors/list/FloorListClient'
import RoomTypeListClient from '@views/apps/room-types/list/RoomTypeListClient'
import RoomListClient from '@views/apps/rooms/list/RoomListClient'
import { getLocalizedUrl } from '@/utils/i18n'

const ROOM_TABS = ['rooms', 'room-types', 'floors'] as const

type RoomTab = (typeof ROOM_TABS)[number]

const tabContentList: Record<RoomTab, ReactElement> = {
  rooms: <RoomListClient />,
  'room-types': <RoomTypeListClient />,
  floors: <FloorListClient />
}

const isRoomTab = (value?: string): value is RoomTab => {
  return ROOM_TABS.includes(value as RoomTab)
}

const RoomsCatalog = ({ defaultTab }: { defaultTab?: string }) => {
  const router = useRouter()
  const { lang: locale } = useParams()
  const [activeTab, setActiveTab] = useState<RoomTab>(isRoomTab(defaultTab) ? defaultTab : 'rooms')

  useEffect(() => {
    setActiveTab(isRoomTab(defaultTab) ? defaultTab : 'rooms')
  }, [defaultTab])

  const handleChange = (_event: SyntheticEvent, value: string) => {
    if (!isRoomTab(value)) {
      return
    }

    setActiveTab(value)

    const baseUrl = getLocalizedUrl('/apps/rooms', locale as Locale)

    router.replace(value === 'rooms' ? baseUrl : `${baseUrl}?tab=${value}`)
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }} className='flex flex-col gap-6'>
        <TabContext value={activeTab}>
          <CustomTabList onChange={handleChange} variant='scrollable' pill='true'>
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-hotel-bed-line text-lg' />
                  Habitaciones
                </div>
              }
              value='rooms'
            />
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-price-tag-3-line text-lg' />
                  Tipos de habitación
                </div>
              }
              value='room-types'
            />
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-building-4-line text-lg' />
                  Niveles
                </div>
              }
              value='floors'
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

export default RoomsCatalog
