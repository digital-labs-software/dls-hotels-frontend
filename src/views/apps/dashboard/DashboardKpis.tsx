'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import type { ThemeColor } from '@core/types'
import CustomAvatar from '@core/components/mui/Avatar'
import type { FrontDeskSummary } from '@/types/apps/frontDeskTypes'
import { formatPlanningDate } from '@/types/apps/reservationsTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'

type Props = {
  date: string
  summary: FrontDeskSummary
  occupancy: number
  collectedToday: number
  pendingBalance: number
}

type Kpi = {
  title: string
  stats: string
  icon: string
  color: ThemeColor
}

const DashboardKpis = ({ date, summary, occupancy, collectedToday, pendingBalance }: Props) => {
  const items: Kpi[] = [
    {
      title: 'Ocupación',
      stats: `${occupancy}%`,
      icon: 'ri-pie-chart-2-line',
      color: 'primary'
    },
    {
      title: 'Llegadas',
      stats: String(summary.arrivals),
      icon: 'ri-login-box-line',
      color: 'success'
    },
    {
      title: 'Salidas',
      stats: String(summary.departures),
      icon: 'ri-logout-box-line',
      color: 'warning'
    },
    {
      title: 'En casa',
      stats: String(summary.inHouse),
      icon: 'ri-hotel-bed-line',
      color: 'info'
    }
  ]

  return (
    <Card className='bs-full'>
      <CardHeader
        title='Hoy en recepción'
        subheader={
          <Typography variant='body2' className='mbs-1'>
            {formatPlanningDate(date)} · cobrado {formatRoomPrice(collectedToday)} · por cobrar{' '}
            {formatRoomPrice(pendingBalance)}
          </Typography>
        }
      />
      <CardContent className='!pbs-5'>
        <Grid container spacing={4}>
          {items.map(item => (
            <Grid size={{ xs: 6, md: 3 }} key={item.title}>
              <div className='flex items-center gap-3'>
                <CustomAvatar variant='rounded' color={item.color} className='shadow-xs'>
                  <i className={item.icon} />
                </CustomAvatar>
                <div>
                  <Typography>{item.title}</Typography>
                  <Typography variant='h5'>{item.stats}</Typography>
                </div>
              </div>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default DashboardKpis
