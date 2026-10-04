import type { Metadata } from 'next'

import InvoicingComingSoon from '@views/apps/invoicing/InvoicingComingSoon'

export const metadata: Metadata = {
  title: 'Facturación',
  description: 'Emisión de boletas y facturas electrónicas'
}

const InvoicingPage = () => {
  return <InvoicingComingSoon />
}

export default InvoicingPage
