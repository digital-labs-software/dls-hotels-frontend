import type { Metadata } from 'next'

import SupportClient from '@views/apps/support/SupportClient'

export const metadata: Metadata = {
  title: 'Soporte',
  description: 'Chat en vivo y tickets con el equipo de soporte de DLS Hotels'
}

const SupportRoute = () => {
  return <SupportClient />
}

export default SupportRoute
