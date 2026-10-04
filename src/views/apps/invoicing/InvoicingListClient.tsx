'use client'

import dynamic from 'next/dynamic'

const InvoicingListPage = dynamic(() => import('./InvoicingListPage'), { ssr: false })

const InvoicingListClient = () => {
  return <InvoicingListPage />
}

export default InvoicingListClient
