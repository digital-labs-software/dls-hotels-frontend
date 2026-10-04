import type { Metadata } from 'next'

import IssueInvoiceClient from '@views/apps/invoicing/IssueInvoiceClient'

export const metadata: Metadata = {
  title: 'Nuevo comprobante',
  description: 'Emitir boleta o factura electrónica'
}

const IssueInvoiceRoute = () => {
  return <IssueInvoiceClient />
}

export default IssueInvoiceRoute
