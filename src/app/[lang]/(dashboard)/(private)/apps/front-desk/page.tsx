import type { Metadata } from 'next'

import FrontDeskCatalog from '@views/apps/front-desk/FrontDeskCatalog'

export const metadata: Metadata = {
  title: 'Recepción',
  description: 'Rack del día, llegadas, salidas y caja de pagos'
}

type Props = {
  searchParams: Promise<{ tab?: string }>
}

const FrontDeskRoute = async ({ searchParams }: Props) => {
  const { tab } = await searchParams

  return <FrontDeskCatalog defaultTab={tab} />
}

export default FrontDeskRoute
