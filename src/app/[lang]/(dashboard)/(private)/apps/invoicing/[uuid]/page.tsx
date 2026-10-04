import type { Metadata } from 'next'

import InvoiceDetailClient from '@views/apps/invoicing/InvoiceDetailClient'

export const metadata: Metadata = {
  title: 'Comprobante',
  description: 'Detalle del comprobante electrónico'
}

const InvoiceDetailRoute = async ({ params }: { params: Promise<{ uuid: string }> }) => {
  const { uuid } = await params

  return <InvoiceDetailClient invoiceUuid={uuid} />
}

export default InvoiceDetailRoute
