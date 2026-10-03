import type { Metadata } from 'next'

import BillingClient from '@views/apps/billing/BillingClient'

export const metadata: Metadata = {
  title: 'Suscripción',
  description: 'Plan, historial de pagos y constancias de pago de la suscripción DLS Hotels'
}

const BillingRoute = () => {
  return <BillingClient />
}

export default BillingRoute
