'use client'

import { useEffect, useState } from 'react'
import type { ComponentType, SyntheticEvent } from 'react'

import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'

import CircularProgress from '@mui/material/CircularProgress'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Typography from '@mui/material/Typography'

import type { Locale } from '@configs/i18n'
import CustomTabList from '@core/components/mui/TabList'
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
  hint: string
  tabs: ReportTab[]
}

const GROUPS: ReportGroup[] = [
  {
    value: 'day',
    label: 'Día a día',
    icon: 'ri-sun-line',
    hint: 'Listas para imprimir y trabajar en el turno.',
    tabs: [
      { value: 'arrivals', label: 'Llegadas del día', icon: 'ri-login-box-line', component: lazy(() => import('./daily/ArrivalsReport')) },
      { value: 'departures', label: 'Salidas del día', icon: 'ri-logout-box-r-line', component: lazy(() => import('./daily/DeparturesReport')) },
      { value: 'in-house', label: 'Huéspedes alojados', icon: 'ri-hotel-bed-line', component: lazy(() => import('./daily/InHouseReport')) },
      { value: 'housekeeping', label: 'Hoja de limpieza', icon: 'ri-brush-line', component: lazy(() => import('./daily/HousekeepingReport')) },
      { value: 'cash', label: 'Cierre de caja', icon: 'ri-safe-2-line', component: lazy(() => import('./daily/CashClosingReport')) }
    ]
  },
  {
    value: 'admin',
    label: 'Administración',
    icon: 'ri-briefcase-4-line',
    hint: 'Para el contador, la cobranza y los reportes del mes.',
    tabs: [
      { value: 'invoices', label: 'Comprobantes emitidos', icon: 'ri-file-list-3-line', component: lazy(() => import('./admin/SalesRegisterReport')) },
      { value: 'balances', label: 'Saldos pendientes', icon: 'ri-hand-coin-line', component: lazy(() => import('./admin/BalancesReport')) },
      { value: 'occupancy', label: 'Ocupación del mes', icon: 'ri-bar-chart-box-line', component: lazy(() => import('./admin/OccupancyReport')) },
      { value: 'mincetur', label: 'Estadística MINCETUR', icon: 'ri-government-line', component: lazy(() => import('./admin/MonthlyStatsReport')) }
    ]
  },
  {
    value: 'analysis',
    label: 'Análisis',
    icon: 'ri-line-chart-line',
    hint: 'Para decidir dónde vender más y qué ajustar.',
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
      { value: 'cancellations', label: 'Cancelaciones y no-shows', icon: 'ri-close-circle-line', component: lazy(() => import('./analysis/CancellationsReport')) }
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
  const [activeTab, setActiveTab] = useState(resolveTab(defaultTab).value)

  useEffect(() => {
    setActiveTab(resolveTab(defaultTab).value)
  }, [defaultTab])

  const current = resolveTab(activeTab)
  const group = GROUPS.find(item => item.value === current.group)!
  const Report = current.component

  const goTo = (value: string) => {
    setActiveTab(value)

    const baseUrl = getLocalizedUrl('/apps/reports', locale as Locale)

    router.replace(value === DEFAULT_TAB ? baseUrl : `${baseUrl}?tab=${value}`, { scroll: false })
  }

  const handleGroupChange = (_event: SyntheticEvent, value: string) => {
    const next = GROUPS.find(item => item.value === value)

    if (next && next.value !== group.value) {
      goTo(next.tabs[0].value)
    }
  }

  const handleTabChange = (_event: SyntheticEvent, value: string) => goTo(value)

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-1'>
        <Typography variant='h4'>Reportes</Typography>
        <Typography color='text.secondary'>{group.hint}</Typography>
      </div>

      <TabContext value={group.value}>
        <CustomTabList onChange={handleGroupChange} variant='scrollable' pill='true' aria-label='Grupos de reportes'>
          {GROUPS.map(item => (
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
