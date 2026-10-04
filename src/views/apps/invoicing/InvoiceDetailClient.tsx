'use client'

import dynamic from 'next/dynamic'

const InvoiceDetailPage = dynamic(() => import('./InvoiceDetailPage'), { ssr: false })

const InvoiceDetailClient = ({ invoiceUuid }: { invoiceUuid: string }) => {
  return <InvoiceDetailPage invoiceUuid={invoiceUuid} />
}

export default InvoiceDetailClient
