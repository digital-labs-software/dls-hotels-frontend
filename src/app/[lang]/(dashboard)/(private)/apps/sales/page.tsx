import type { Metadata } from 'next'

import SalesPage from '@views/apps/sales/SalesPage'

export const metadata: Metadata = {
  title: 'Ventas',
  description: 'Productos y servicios que cobra el hotel'
}

const SalesRoute = () => {
  return <SalesPage />
}

export default SalesRoute
