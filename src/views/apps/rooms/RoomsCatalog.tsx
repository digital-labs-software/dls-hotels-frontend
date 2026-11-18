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
  FLOORS_CREATE,
  FLOORS_DELETE,
  FLOORS_EDIT,
  FLOORS_VIEW,
  RATES_CREATE,
  RATES_DELETE,
  RATES_EDIT,
  RATES_VIEW,
  ROOMS_CREATE,
  ROOMS_DELETE,
  ROOMS_EDIT,
  ROOMS_STATUS,
  ROOMS_VIEW,
  ROOM_TYPES_CREATE,
  ROOM_TYPES_DELETE,
  ROOM_TYPES_EDIT,
  ROOM_TYPES_VIEW
} from '@/types/apps/hotelPermissions'
import FloorListClient from '@views/apps/floors/list/FloorListClient'
import RateListClient from '@views/apps/rates/list/RateListClient'
import RoomTypeListClient from '@views/apps/room-types/list/RoomTypeListClient'
import RoomListClient from '@views/apps/rooms/list/RoomListClient'
import RoomStatusBoard from '@views/apps/rooms/RoomStatusBoard'
import { getLocalizedUrl } from '@/utils/i18n'

const ROOM_TABS = ['status', 'rooms', 'rates', 'room-types', 'floors'] as const

type RoomTab = (typeof ROOM_TABS)[number]

const tabContentList: Record<RoomTab, ReactElement> = {
  status: <RoomStatusBoard />,
  rooms: <RoomListClient />,
  'room-types': <RoomTypeListClient />,
  floors: <FloorListClient />,
  rates: <RateListClient />
}

const isRoomTab = (value?: string): value is RoomTab => {
  return ROOM_TABS.includes(value as RoomTab)
}

const TAB_PERMISSIONS: Record<RoomTab, readonly string[]> = {
  status: [ROOMS_STATUS],
  rooms: [ROOMS_VIEW, ROOMS_CREATE, ROOMS_EDIT, ROOMS_DELETE],
  rates: [RATES_VIEW, RATES_CREATE, RATES_EDIT, RATES_DELETE],
  'room-types': [ROOM_TYPES_VIEW, ROOM_TYPES_CREATE, ROOM_TYPES_EDIT, ROOM_TYPES_DELETE],
  floors: [FLOORS_VIEW, FLOORS_CREATE, FLOORS_EDIT, FLOORS_DELETE]
}

const RoomsCatalog = ({ defaultTab }: { defaultTab?: string }) => {
  const router = useRouter()
  const { lang: locale } = useParams()
  const { canAny, canViewRooms, loaded } = useSubscriptionAccess()
  const allowedTabs = ROOM_TABS.filter(tab => canAny(TAB_PERMISSIONS[tab]))
  const allowedKey = allowedTabs.join(',')
  const [activeTab, setActiveTab] = useState<RoomTab>(isRoomTab(defaultTab) ? defaultTab : 'status')

  useEffect(() => {
    if (!loaded) {
      return
    }

    const tabs = allowedKey ? (allowedKey.split(',') as RoomTab[]) : []

    if (!canViewRooms || tabs.length === 0) {
      router.replace(getLocalizedUrl('/apps/dashboard', locale as Locale))

      return
    }

    const next = isRoomTab(defaultTab) && tabs.includes(defaultTab) ? defaultTab : tabs[0]

    setActiveTab(current => (current === next ? current : next))
  }, [allowedKey, canViewRooms, defaultTab, loaded, locale, router])

  const handleChange = (_event: SyntheticEvent, value: string) => {
    if (!isRoomTab(value) || !allowedTabs.includes(value)) {
      return
    }

    setActiveTab(value)

    const baseUrl = getLocalizedUrl('/apps/rooms', locale as Locale)
    const home = allowedTabs[0]

    router.replace(value === home ? baseUrl : `${baseUrl}?tab=${value}`)
  }

  if (!loaded || allowedTabs.length === 0 || !allowedTabs.includes(activeTab)) {
    return null
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }} className='flex flex-col gap-6'>
        <TabContext value={activeTab}>
          <CustomTabList onChange={handleChange} variant='scrollable' wrap='true'>
            {allowedTabs.includes('status') ? (
              <Tab value='status' label='Estado' icon={<i className='ri-checkbox-circle-line' />} iconPosition='top' />
            ) : null}
            {allowedTabs.includes('rooms') ? (
              <Tab
                value='rooms'
                label='Habitaciones'
                icon={<i className='ri-hotel-bed-line' />}
                iconPosition='top'
              />
            ) : null}
            {allowedTabs.includes('rates') ? (
              <Tab
                value='rates'
                label='Tarifas'
                icon={<i className='ri-money-dollar-circle-line' />}
                iconPosition='top'
              />
            ) : null}
            {allowedTabs.includes('room-types') ? (
              <Tab
                value='room-types'
                label='Tipos de habitación'
                icon={<i className='ri-price-tag-3-line' />}
                iconPosition='top'
              />
            ) : null}
            {allowedTabs.includes('floors') ? (
              <Tab value='floors' label='Pisos' icon={<i className='ri-building-4-line' />} iconPosition='top' />
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

export default RoomsCatalog
