import type { Metadata } from 'next'

import HotelSettingsFormClient from '@views/apps/hotel/HotelSettingsFormClient'

export const metadata: Metadata = {
  title: 'Hotel',
  description: 'Datos y configuración del hotel'
}

const HotelPage = () => {
  return <HotelSettingsFormClient />
}

export default HotelPage
