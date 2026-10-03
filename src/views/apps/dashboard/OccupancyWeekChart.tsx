'use client'

import dynamic from 'next/dynamic'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  days: string[]
  values: number[]
}

const OccupancyWeekChart = ({ days, values }: Props) => {
  const theme = useTheme()
  const highlight = Math.max(0, days.length - 1)

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 7,
        distributed: true,
        columnWidth: '42%'
      }
    },
    stroke: {
      width: 2,
      colors: ['var(--mui-palette-background-paper)']
    },
    legend: { show: false },
    grid: {
      xaxis: { lines: { show: false } },
      strokeDashArray: 7,
      padding: { left: -9, top: -8, bottom: 8 },
      borderColor: 'var(--mui-palette-divider)'
    },
    dataLabels: { enabled: false },
    colors: days.map((_, index) =>
      index === highlight ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-customColors-trackBg)'
    ),
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } }
    },
    xaxis: {
      categories: days,
      tickPlacement: 'on',
      labels: {
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: '13px' }
      },
      axisTicks: { show: false },
      axisBorder: { show: false }
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 4,
      labels: {
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: '13px' },
        formatter: value => `${value}%`
      }
    },
    tooltip: {
      theme: theme.palette.mode,
      y: { formatter: value => `${value}%` }
    }
  }

  return (
    <Card className='bs-full'>
      <CardHeader title='Ocupación de la semana' subheader='Porcentaje de habitaciones ocupadas por día' />
      <CardContent>
        <AppReactApexCharts
          type='bar'
          height={280}
          width='100%'
          series={[{ name: 'Ocupación', data: values }]}
          options={options}
        />
      </CardContent>
    </Card>
  )
}

export default OccupancyWeekChart
