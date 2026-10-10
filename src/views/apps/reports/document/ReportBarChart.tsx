'use client'

import dynamic from 'next/dynamic'

import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

type Props = {
  title: string
  labels: string[]
  values: number[]
  formatValue: (value: number) => string
  horizontal?: boolean
  max?: number
}

const ReportBarChart = ({ title, labels, values, formatValue, horizontal = false, max }: Props) => {
  const theme = useTheme()

  const options: ApexOptions = {
    chart: { parentHeightOffset: 0, toolbar: { show: false } },
    plotOptions: { bar: { horizontal, borderRadius: 4, columnWidth: '60%', barHeight: '60%' } },
    colors: [theme.palette.primary.main],
    dataLabels: { enabled: false },
    grid: { borderColor: 'var(--mui-palette-divider)', padding: { top: -10 } },
    tooltip: { y: { formatter: value => formatValue(value) } },
    xaxis: {
      categories: labels,
      labels: {
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: '12px' },
        ...(horizontal ? { formatter: (value: string) => formatValue(Number(value)) } : {})
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      ...(horizontal && max !== undefined ? { max } : {})
    },
    yaxis: {
      ...(!horizontal && max !== undefined ? { max } : {}),
      labels: {
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: '12px' },
        ...(!horizontal ? { formatter: (value: number) => formatValue(value) } : {})
      }
    }
  }

  return (
    <div className='flex flex-col gap-2 pli-5 pbs-5'>
      <Typography variant='h6'>{title}</Typography>
      <AppReactApexCharts
        type='bar'
        height={horizontal ? Math.max(160, labels.length * 42) : 260}
        width='100%'
        series={[{ name: title, data: values }]}
        options={options}
      />
    </div>
  )
}

export default ReportBarChart
