import type { Metadata } from 'next'

import RateFormClient from '@views/apps/rates/form/RateFormClient'

export const metadata: Metadata = {
  title: 'Nueva tarifa',
  description: 'Registrar una tarifa por temporada'
}

const RatesAddPage = () => {
  return <RateFormClient />
}

export default RatesAddPage
