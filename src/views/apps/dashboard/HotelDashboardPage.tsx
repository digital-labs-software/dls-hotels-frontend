'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { FrontDesk, StayStatus } from '@/types/apps/frontDeskTypes'
import { limaToday } from '@/types/apps/frontDeskTypes'
import type { Planning, PlanningBooking } from '@/types/apps/reservationsTypes'
import { addDays, formatPlanningShort } from '@/types/apps/reservationsTypes'
import type { Reservation } from '@/types/apps/frontDeskTypes'
import { getFrontDeskApiErrorMessage, frontDeskApi } from '@/libs/frontDeskApi'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'
import DashboardKpis from './DashboardKpis'
import OccupancyWeekChart from './OccupancyWeekChart'
import ReservationStatusChart from './ReservationStatusChart'
import RoomStatusDonut from './RoomStatusDonut'
import TodayBoard from './TodayBoard'

const EMPTY_STATUS: Record<StayStatus, number> = {
  PENDING: 0,
  CONFIRMED: 0,
  CHECKED_IN: 0,
  CHECKED_OUT: 0,
  CANCELLED: 0,
  NO_SHOW: 0
}

const occupiesDay = (booking: PlanningBooking, day: string) => {
  if (booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') {
    return false
  }

  return booking.checkInDate <= day && booking.checkOutDate > day
}

const HotelDashboardPage = () => {
  const { data: session, status } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const today = limaToday()

  const [frontDesk, setFrontDesk] = useState<FrontDesk | null>(null)
  const [planning, setPlanning] = useState<Planning | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [collectedToday, setCollectedToday] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [desk, week, list, payments] = await Promise.all([
        frontDeskApi.overview(propertyId),
        reservationsApi.planning(propertyId, 'WEEK', today),
        reservationsApi.list(propertyId, {
          page: 1,
          limit: 100,
          from: addDays(today, -7),
          to: addDays(today, 14)
        }),
        frontDeskApi.listPropertyPayments(propertyId, { from: today, to: today, page: 1, limit: 100 })
      ])

      setFrontDesk(desk)
      setPlanning(week)
      setReservations(list.data)
      setCollectedToday(payments.data.reduce((sum, payment) => sum + Number(payment.amount || 0), 0))
    } catch (error) {
      toast.error(
        getFrontDeskApiErrorMessage(error, getReservationsApiErrorMessage(error, 'No se pudo cargar el dashboard.'))
      )
    } finally {
      setLoading(false)
    }
  }, [propertyId, today])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    load()
  }, [load, status])

  const occupancy = useMemo(() => {
    const total = frontDesk?.summary.totalRooms || 0

    if (!total) {
      return 0
    }

    return Math.round(((frontDesk?.summary.occupied || 0) / total) * 100)
  }, [frontDesk])

  const pendingBalance = useMemo(() => {
    const stays = [...(frontDesk?.arrivals || []), ...(frontDesk?.inHouse || [])]

    return stays.reduce((sum, stay) => sum + Math.max(0, stay.reservationBalance), 0)
  }, [frontDesk])

  const weekSeries = useMemo(() => {
    const days = planning?.days?.length ? planning.days : [today]
    const rooms = planning?.rooms?.length || frontDesk?.summary.totalRooms || 0
    const bookings = planning?.bookings || []

    return {
      labels: days.map(day => formatPlanningShort(day).replace(/ de /g, ' ')),
      values: days.map(day => {
        if (!rooms) {
          return 0
        }

        const occupied = bookings.filter(booking => occupiesDay(booking, day)).length

        return Math.round((occupied / rooms) * 100)
      })
    }
  }, [frontDesk?.summary.totalRooms, planning, today])

  const reservationStats = useMemo(() => {
    const counts = { ...EMPTY_STATUS }
    let paid = 0
    let unpaid = 0

    reservations.forEach(reservation => {
      counts[reservation.status] = (counts[reservation.status] || 0) + 1

      if (reservation.status === 'CANCELLED' || reservation.status === 'NO_SHOW') {
        return
      }

      if (reservation.balance > 0) {
        unpaid += 1
      } else {
        paid += 1
      }
    })

    return { counts, paid, unpaid }
  }, [reservations])

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>Dashboard</Typography>
      </Grid>

      {loading && !frontDesk ? (
        <Grid size={{ xs: 12 }} className='flex justify-center p-10'>
          <CircularProgress size={32} />
        </Grid>
      ) : frontDesk ? (
        <>
          <Grid size={{ xs: 12 }}>
            <DashboardKpis
              date={frontDesk.date || today}
              summary={frontDesk.summary}
              occupancy={occupancy}
              collectedToday={collectedToday}
              pendingBalance={pendingBalance}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <RoomStatusDonut summary={frontDesk.summary} />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <OccupancyWeekChart days={weekSeries.labels} values={weekSeries.values} />
          </Grid>
          <Grid size={{ xs: 12, lg: 7 }}>
            <ReservationStatusChart
              counts={reservationStats.counts}
              paid={reservationStats.paid}
              unpaid={reservationStats.unpaid}
            />
          </Grid>
          <Grid size={{ xs: 12, lg: 5 }}>
            <TodayBoard arrivals={frontDesk.arrivals} departures={frontDesk.departures} />
          </Grid>
        </>
      ) : (
        <Grid size={{ xs: 12 }}>
          <Alert
            severity='warning'
            action={
              <Button color='inherit' size='small' onClick={load}>
                Reintentar
              </Button>
            }
          >
            No se pudo cargar el tablero. Revisa la sesión o vuelve a intentar.
          </Alert>
        </Grid>
      )}
    </Grid>
  )
}

export default HotelDashboardPage
