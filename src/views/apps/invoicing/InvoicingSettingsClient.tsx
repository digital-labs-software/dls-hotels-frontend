'use client'

import dynamic from 'next/dynamic'

const InvoicingSettingsPage = dynamic(() => import('./InvoicingSettingsPage'), { ssr: false })

const InvoicingSettingsClient = () => {
  return <InvoicingSettingsPage />
}

export default InvoicingSettingsClient
