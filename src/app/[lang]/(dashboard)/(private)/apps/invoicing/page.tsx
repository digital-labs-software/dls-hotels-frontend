import type { Metadata } from 'next'

import InvoicingListClient from '@views/apps/invoicing/InvoicingListClient'

export const metadata: Metadata = {
  title: 'Facturación',
  description: 'Boletas, facturas y notas electrónicas'
}

const InvoicingPage = () => {
  return <InvoicingListClient />
}

export default InvoicingPage
