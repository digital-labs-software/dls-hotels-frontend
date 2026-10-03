'use client'

import dynamic from 'next/dynamic'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import type { FrontDeskSummary } from '@/types/apps/frontDeskTypes'
import { RACK_STATUS_LABELS } from '@/types/apps/frontDeskTypes'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  summary: FrontDeskSummary
}

const RoomStatusDonut = ({ summary }: Props) => {
  const theme = useTheme()
  const series = [summary.available, summary.occupied, summary.cleaning, summary.maintenance]
  const labels = [
    RACK_STATUS_LABELS.AVAILABLE,
    RACK_STATUS_LABELS.OCCUPIED,
    RACK_STATUS_LABELS.CLEANING,
    RACK_STATUS_LABELS.MAINTENANCE
  ]
  const colors = [
    'var(--mui-palette-success-main)',
    'var(--mui-palette-primary-main)',
    'var(--mui-palette-warning-main)',
    'var(--mui-palette-error-main)'
  ]

  const options: ApexOptions = {
    chart: { sparkline: { enabled: true } },
    colors,
    stroke: { width: 0 },
    legend: { show: false },
    tooltip: { theme: theme.palette.mode },
    dataLabels: { enabled: false },
    labels,
    plotOptions: {
      pie: {
        customScale: 0.9,
        donut: {
          size: '72%',
          labels: {
            show: true,
            name: {
              offsetY: 25,
              fontSize: '0.875rem',
              color: 'var(--mui-palette-text-secondary)'
            },
            value: {
              offsetY: -15,
              fontWeight: 500,
              fontSize: '24px',
              color: 'var(--mui-palette-text-primary)'
            },
            total: {
              show: true,
              label: 'Habitaciones',
              fontSize: '0.8125rem',
              color: 'var(--mui-palette-text-secondary)',
              formatter: () => String(summary.totalRooms)
            }
          }
        }
      }
    }
  }

  return (
    <Card className='bs-full'>
      <CardHeader title='Estado de habitaciones' subheader='Libre, ocupada, limpieza y mantenimiento' />
      <CardContent className='flex flex-col items-center gap-4'>
        <AppReactApexCharts type='donut' height={220} width='100%' series={series} options={options} />
        <div className='flex flex-wrap justify-center gap-4'>
          {labels.map((label, index) => (
            <div key={label} className='flex items-center gap-2'>
              <span className='bs-2.5 is-2.5 rounded-full' style={{ backgroundColor: colors[index] }} />
              <Typography variant='body2'>
                {label}: {series[index]}
              </Typography>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default RoomStatusDonut
