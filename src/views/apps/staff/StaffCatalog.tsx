'use client'

import { useEffect, useState } from 'react'
import type { ReactElement, SyntheticEvent } from 'react'

import { useParams, useRouter } from 'next/navigation'

import Grid from '@mui/material/Grid'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Typography from '@mui/material/Typography'

import type { Locale } from '@configs/i18n'
import CustomTabList from '@core/components/mui/TabList'
import EmployeeListClient from '@views/apps/staff/employees/list/EmployeeListClient'
import RoleListClient from '@views/apps/staff/roles/list/RoleListClient'
import { getLocalizedUrl } from '@/utils/i18n'

const STAFF_TABS = ['employees', 'roles'] as const

type StaffTab = (typeof STAFF_TABS)[number]

const tabContentList: Record<StaffTab, ReactElement> = {
  employees: <EmployeeListClient />,
  roles: <RoleListClient />
}

const isStaffTab = (value?: string): value is StaffTab => {
  return STAFF_TABS.includes(value as StaffTab)
}

const StaffCatalog = ({ defaultTab }: { defaultTab?: string }) => {
  const router = useRouter()
  const { lang: locale } = useParams()
  const [activeTab, setActiveTab] = useState<StaffTab>(isStaffTab(defaultTab) ? defaultTab : 'employees')

  useEffect(() => {
    setActiveTab(isStaffTab(defaultTab) ? defaultTab : 'employees')
  }, [defaultTab])

  const handleChange = (_event: SyntheticEvent, value: string) => {
    if (!isStaffTab(value)) {
      return
    }

    setActiveTab(value)

    const baseUrl = getLocalizedUrl('/apps/staff', locale as Locale)

    router.replace(value === 'employees' ? baseUrl : `${baseUrl}?tab=${value}`)
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }} className='flex flex-col gap-6'>
        <div>
          <Typography variant='h4' className='mbe-1'>
            Personal
          </Typography>
          <Typography>Quiénes trabajan aquí y qué puede hacer cada uno</Typography>
        </div>
        <TabContext value={activeTab}>
          <CustomTabList onChange={handleChange} variant='scrollable' pill='true'>
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-id-card-line text-lg' />
                  Empleados
                </div>
              }
              value='employees'
            />
            <Tab
              label={
                <div className='flex items-center gap-1.5'>
                  <i className='ri-shield-user-line text-lg' />
                  Roles y permisos
                </div>
              }
              value='roles'
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

export default StaffCatalog
