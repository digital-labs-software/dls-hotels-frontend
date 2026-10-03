'use client'

import dynamic from 'next/dynamic'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import { STAY_STATUS_LABELS, type StayStatus } from '@/types/apps/frontDeskTypes'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

const STATUSES: StayStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW']

type Props = {
  counts: Record<StayStatus, number>
  paid: number
  unpaid: number
}

const ReservationStatusChart = ({ counts, paid, unpaid }: Props) => {
  const theme = useTheme()
  const labels = STATUSES.map(status => STAY_STATUS_LABELS[status])
  const series = STATUSES.map(status => counts[status] || 0)

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        distributed: true,
        columnWidth: '48%'
      }
    },
    legend: { show: false },
    grid: {
      strokeDashArray: 7,
      borderColor: 'var(--mui-palette-divider)',
      padding: { top: -12 }
    },
    dataLabels: { enabled: false },
    colors: [
      'var(--mui-palette-warning-main)',
      'var(--mui-palette-info-main)',
      'var(--mui-palette-success-main)',
      'var(--mui-palette-secondary-main)',
      'var(--mui-palette-error-main)',
      'var(--mui-palette-text-disabled)'
    ],
    xaxis: {
      categories: labels,
      labels: {
        rotate: -20,
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: '12px' }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: '13px' },
        formatter: value => `${Math.round(Number(value))}`
      }
    },
    tooltip: { theme: theme.palette.mode }
  }

  return (
    <Card className='bs-full'>
      <CardHeader
        title='Reservas de la semana'
        subheader={`${paid} pagadas · ${unpaid} con saldo pendiente`}
      />
      <CardContent>
        <AppReactApexCharts type='bar' height={280} width='100%' series={[{ name: 'Reservas', data: series }]} options={options} />
      </CardContent>
    </Card>
  )
}

export default ReservationStatusChart
