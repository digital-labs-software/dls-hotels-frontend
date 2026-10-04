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
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
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
  const { canViewEmployees, canViewRoles, canViewStaff, loaded } = useSubscriptionAccess()
  const firstAllowed: StaffTab = canViewEmployees ? 'employees' : 'roles'
  const [activeTab, setActiveTab] = useState<StaffTab>(
    isStaffTab(defaultTab) && (defaultTab === 'employees' ? canViewEmployees : canViewRoles) ? defaultTab : firstAllowed
  )

  useEffect(() => {
    if (!loaded) {
      return
    }

    if (!canViewStaff) {
      router.replace(getLocalizedUrl('/apps/dashboard', locale as Locale))

      return
    }

    const requested = isStaffTab(defaultTab) ? defaultTab : firstAllowed
    const next =
      requested === 'employees' ? (canViewEmployees ? 'employees' : 'roles') : canViewRoles ? 'roles' : 'employees'

    setActiveTab(next)
  }, [canViewEmployees, canViewRoles, canViewStaff, defaultTab, firstAllowed, loaded, locale, router])

  const handleChange = (_event: SyntheticEvent, value: string) => {
    if (!isStaffTab(value)) {
      return
    }

    if (value === 'employees' && !canViewEmployees) {
      return
    }

    if (value === 'roles' && !canViewRoles) {
      return
    }

    setActiveTab(value)

    const baseUrl = getLocalizedUrl('/apps/staff', locale as Locale)

    router.replace(value === 'employees' ? baseUrl : `${baseUrl}?tab=${value}`)
  }

  if (!loaded || !canViewStaff) {
    return null
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
            {canViewEmployees ? (
              <Tab
                label={
                  <div className='flex items-center gap-1.5'>
                    <i className='ri-id-card-line text-lg' />
                    Empleados
                  </div>
                }
                value='employees'
              />
            ) : null}
            {canViewRoles ? (
              <Tab
                label={
                  <div className='flex items-center gap-1.5'>
                    <i className='ri-shield-user-line text-lg' />
                    Roles y permisos
                  </div>
                }
                value='roles'
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

export default StaffCatalog
