import type { Metadata } from 'next'

import GuestFormClient from '@views/apps/clients/guests/form/GuestFormClient'

export const metadata: Metadata = {
  title: 'Nuevo huésped',
  description: 'Crear un huésped'
}

const GuestsAddPage = () => {
  return <GuestFormClient />
}

export default GuestsAddPage
