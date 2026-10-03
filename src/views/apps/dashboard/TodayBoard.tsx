'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import type { Stay } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'

type Props = {
  arrivals: Stay[]
  departures: Stay[]
}

const StayRow = ({ stay, emptyLabel }: { stay?: Stay; emptyLabel: string }) => {
  if (!stay) {
    return (
      <Typography variant='body2' color='text.disabled'>
        {emptyLabel}
      </Typography>
    )
  }

  return (
    <div className='flex items-start justify-between gap-3'>
      <div>
        <Typography className='font-medium' color='text.primary'>
          {stay.guestName || stay.companyName || stay.reservationCode}
        </Typography>
        <Typography variant='body2'>
          Hab. {stay.roomNumber || 's/n'} · {stay.roomTypeName}
        </Typography>
      </div>
      <Typography variant='body2' color={stay.reservationBalance > 0 ? 'error.main' : 'success.main'}>
        {stay.reservationBalance > 0 ? formatRoomPrice(stay.reservationBalance) : 'Pagado'}
      </Typography>
    </div>
  )
}

const TodayBoard = ({ arrivals, departures }: Props) => {
  return (
    <Card>
      <CardHeader title='Movimiento de hoy' subheader='Llegadas y salidas que ve recepción en el turno' />
      <CardContent>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 6 }} className='flex flex-col gap-4'>
            <Typography className='font-medium' color='text.primary'>
              Llegadas ({arrivals.length})
            </Typography>
            {arrivals.length === 0 ? (
              <StayRow emptyLabel='No hay llegadas programadas.' />
            ) : (
              arrivals.slice(0, 6).map(stay => <StayRow key={stay.reservationRoomUuid} stay={stay} emptyLabel='' />)
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} className='flex flex-col gap-4'>
            <Typography className='font-medium' color='text.primary'>
              Salidas ({departures.length})
            </Typography>
            {departures.length === 0 ? (
              <StayRow emptyLabel='No hay salidas programadas.' />
            ) : (
              departures.slice(0, 6).map(stay => <StayRow key={stay.reservationRoomUuid} stay={stay} emptyLabel='' />)
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default TodayBoard
