import type { Metadata } from 'next'

import GuestSheetClient from '@views/apps/reports/GuestSheetClient'

export const metadata: Metadata = {
  title: 'Reportes',
  description: 'Parte de huéspedes del día'
}

const ReportsPage = () => {
  return <GuestSheetClient />
}

export default ReportsPage
