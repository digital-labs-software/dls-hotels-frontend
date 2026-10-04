'use client'

import dynamic from 'next/dynamic'

const IssueInvoicePage = dynamic(() => import('./IssueInvoicePage'), { ssr: false })

const IssueInvoiceClient = () => {
  return <IssueInvoicePage />
}

export default IssueInvoiceClient
