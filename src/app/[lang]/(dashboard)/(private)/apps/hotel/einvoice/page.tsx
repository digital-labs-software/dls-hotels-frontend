import type { Metadata } from 'next'

import InvoicingSettingsClient from '@views/apps/invoicing/InvoicingSettingsClient'

export const metadata: Metadata = {
  title: 'Series y SUNAT',
  description: 'IGV, series y NubeFact del hotel'
}

const HotelEinvoiceRoute = () => {
  return <InvoicingSettingsClient />
}

export default HotelEinvoiceRoute
