import type { Metadata } from 'next'

import FrontDeskClient from '@views/apps/front-desk/FrontDeskClient'

export const metadata: Metadata = {
  title: 'Recepción',
  description: 'Rack de habitaciones, llegadas, salidas y estadías del día'
}

const FrontDeskRoute = () => {
  return <FrontDeskClient />
}

export default FrontDeskRoute
