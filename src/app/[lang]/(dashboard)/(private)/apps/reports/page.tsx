import type { Metadata } from 'next'

import ReportsCatalog from '@views/apps/reports/ReportsCatalog'

export const metadata: Metadata = {
  title: 'Reportes',
  description: 'Llegadas, salidas, huéspedes alojados, limpieza, caja, comprobantes, saldos, ocupación y ventas'
}

type Props = {
  searchParams: Promise<{ tab?: string }>
}

const ReportsPage = async ({ searchParams }: Props) => {
  const { tab } = await searchParams

  return <ReportsCatalog defaultTab={tab} />
}

export default ReportsPage
