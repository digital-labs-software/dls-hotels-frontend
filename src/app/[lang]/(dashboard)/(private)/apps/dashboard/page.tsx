import type { Metadata } from 'next'

import HotelDashboardClient from '@views/apps/dashboard/HotelDashboardClient'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Tablero de recepción: ocupación, habitaciones y reservas del día'
}

const DashboardRoute = () => {
  return <HotelDashboardClient />
}

export default DashboardRoute
