import type { Metadata } from 'next'

import ReservationsClient from '@views/apps/reservations/ReservationsClient'

export const metadata: Metadata = {
  title: 'Reservas',
  description: 'Calendario de reservas, nueva reserva y detalle de estadías'
}

const ReservationsRoute = () => {
  return <ReservationsClient />
}

export default ReservationsRoute
