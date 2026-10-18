import type { Metadata } from 'next'

import PricesPage from '@views/apps/prices/PricesPage'

export const metadata: Metadata = {
  title: 'Precios',
  description: 'Precio por noche para contestarle al huésped'
}

const PricesRoute = () => {
  return <PricesPage />
}

export default PricesRoute
