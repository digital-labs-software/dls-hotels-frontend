'use client'

import { useEffect, useState } from 'react'
import type { ComponentType, SyntheticEvent } from 'react'

import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'

import CircularProgress from '@mui/material/CircularProgress'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import type { Locale } from '@configs/i18n'
import CustomTabList from '@core/components/mui/TabList'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { REPORT_TAB_PERMISSION } from '@/types/apps/hotelPermissions'
import { getLocalizedUrl } from '@/utils/i18n'

const loading = () => (
  <div className='flex justify-center p-10'>
    <CircularProgress />
  </div>
)

const lazy = (loader: () => Promise<{ default: ComponentType }>) => dynamic(loader, { ssr: false, loading })

type ReportTab = {
  value: string
  label: string
  icon: string
  component: ComponentType
}

type ReportGroup = {
  value: string
  label: string
  icon: string
  tabs: ReportTab[]
}

const GROUPS: ReportGroup[] = [
  {
    value: 'day',
    label: 'Día a día',
    icon: 'ri-sun-line',
    tabs: [
      { value: 'arrivals', label: 'Llegadas del día', icon: 'ri-login-box-line', component: lazy(() => import('./daily/ArrivalsReport')) },
      { value: 'departures', label: 'Salidas del día', icon: 'ri-logout-box-r-line', component: lazy(() => import('./daily/DeparturesReport')) },
      { value: 'in-house', label: 'Huéspedes alojados', icon: 'ri-hotel-bed-line', component: lazy(() => import('./daily/InHouseReport')) },
      { value: 'housekeeping', label: 'Hoja de limpieza', icon: 'ri-brush-line', component: lazy(() => import('./daily/HousekeepingReport')) }
    ]
  },
  {
    value: 'admin',
    label: 'Administración',
    icon: 'ri-briefcase-4-line',
    tabs: [
      { value: 'invoices', label: 'Comprobantes emitidos', icon: 'ri-file-list-3-line', component: lazy(() => import('./admin/SalesRegisterReport')) },
      { value: 'balances', label: 'Saldos pendientes', icon: 'ri-hand-coin-line', component: lazy(() => import('./admin/BalancesReport')) },
      { value: 'occupancy', label: 'Ocupación del mes', icon: 'ri-bar-chart-box-line', component: lazy(() => import('./admin/OccupancyReport')) },
      { value: 'mincetur', label: 'Estadística MINCETUR', icon: 'ri-government-line', component: lazy(() => import('./admin/MonthlyStatsReport')) },
      { value: 'audit', label: 'Bitácora', icon: 'ri-history-line', component: lazy(() => import('../audit/AuditPage')) }
    ]
  },
  {
    value: 'analysis',
    label: 'Análisis',
    icon: 'ri-line-chart-line',
    tabs: [
      { value: 'sources', label: 'Ventas por origen', icon: 'ri-pie-chart-2-line', component: lazy(() => import('./analysis/SalesBySourceReport')) },
      {
        value: 'companies',
        label: 'Empresas y agencias',
        icon: 'ri-building-2-line',
        component: lazy(() =>
          import('./analysis/SalesBySourceReport').then(module => ({ default: module.CompanyProductionReport }))
        )
      },
      { value: 'cancellations', label: 'Cancelaciones y no presentados', icon: 'ri-close-circle-line', component: lazy(() => import('./analysis/CancellationsReport')) }
    ]
  }
]

const ALL_TABS = GROUPS.flatMap(group => group.tabs.map(tab => ({ ...tab, group: group.value })))

const DEFAULT_TAB = 'arrivals'

const resolveTab = (value?: string) => ALL_TABS.find(tab => tab.value === value) ?? ALL_TABS.find(tab => tab.value === DEFAULT_TAB)!

const tabLabel = (icon: string, label: string) => (
  <div className='flex items-center gap-1.5'>
    <i className={`${icon} text-lg`} />
    {label}
  </div>
)

const ReportsCatalog = ({ defaultTab }: { defaultTab?: string }) => {
  const router = useRouter()
  const { lang: locale } = useParams()
  const { can, canViewReports, loaded } = useSubscriptionAccess()
  const visibleGroups = GROUPS.map(group => ({
    ...group,
    tabs: group.tabs.filter(tab => can(REPORT_TAB_PERMISSION[tab.value]))
  })).filter(group => group.tabs.length > 0)
  const visibleTabs = visibleGroups.flatMap(group => group.tabs)
  const [activeTab, setActiveTab] = useState(resolveTab(defaultTab).value)

  const visibleKey = visibleTabs.map(tab => tab.value).join(',')

  useEffect(() => {
    if (!loaded) {
      return
    }

    const tabs = visibleKey ? visibleKey.split(',') : []

    if (!canViewReports || tabs.length === 0) {
      router.replace(getLocalizedUrl('/apps/dashboard', locale as Locale))

      return
    }

    const requested = tabs.includes(defaultTab || '') ? defaultTab! : tabs[0]

    setActiveTab(current => (current === requested ? current : requested))
  }, [canViewReports, defaultTab, loaded, locale, router, visibleKey])

  const current = visibleTabs.find(tab => tab.value === activeTab) ?? visibleTabs[0]
  const group = visibleGroups.find(item => item.tabs.some(tab => tab.value === current?.value))
  const Report = current?.component

  const goTo = (value: string) => {
    setActiveTab(value)

    const baseUrl = getLocalizedUrl('/apps/reports', locale as Locale)

    router.replace(value === DEFAULT_TAB ? baseUrl : `${baseUrl}?tab=${value}`, { scroll: false })
  }

  const handleGroupChange = (_event: SyntheticEvent, value: string) => {
    const next = visibleGroups.find(item => item.value === value)

    if (next && group && next.value !== group.value) {
      goTo(next.tabs[0].value)
    }
  }

  const handleTabChange = (_event: SyntheticEvent, value: string) => goTo(value)

  if (!loaded || !current || !group || !Report) {
    return null
  }

  return (
    <div className='flex flex-col gap-6'>
      <TabContext value={group.value}>
        <CustomTabList onChange={handleGroupChange} variant='scrollable' pill='true' aria-label='Grupos de reportes'>
          {visibleGroups.map(item => (
            <Tab key={item.value} value={item.value} label={tabLabel(item.icon, item.label)} />
          ))}
        </CustomTabList>
      </TabContext>

      <TabContext value={current.value}>
        <CustomTabList onChange={handleTabChange} variant='scrollable' scrollButtons='auto' aria-label='Reportes'>
          {group.tabs.map(tab => (
            <Tab key={tab.value} value={tab.value} label={tabLabel(tab.icon, tab.label)} />
          ))}
        </CustomTabList>
        <TabPanel value={current.value} className='p-0'>
          <Report />
        </TabPanel>
      </TabContext>
    </div>
  )
}

export default ReportsCatalog
