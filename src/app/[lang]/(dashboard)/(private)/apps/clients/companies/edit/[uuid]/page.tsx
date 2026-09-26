import type { Metadata } from 'next'

import CompanyFormClient from '@views/apps/clients/companies/form/CompanyFormClient'

export const metadata: Metadata = {
  title: 'Editar empresa',
  description: 'Editar o ver una empresa'
}

type Props = {
  params: Promise<{ uuid: string }>
}

const CompaniesEditPage = async ({ params }: Props) => {
  const { uuid } = await params

  return <CompanyFormClient uuid={uuid} />
}

export default CompaniesEditPage
