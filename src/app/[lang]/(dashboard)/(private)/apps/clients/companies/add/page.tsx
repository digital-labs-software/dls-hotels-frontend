import type { Metadata } from 'next'

import CompanyFormClient from '@views/apps/clients/companies/form/CompanyFormClient'

export const metadata: Metadata = {
  title: 'Nueva empresa',
  description: 'Crear una empresa'
}

const CompaniesAddPage = () => {
  return <CompanyFormClient />
}

export default CompaniesAddPage
