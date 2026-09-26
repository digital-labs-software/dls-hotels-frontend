import type { Metadata } from 'next'

import ClientsCatalog from '@views/apps/clients/ClientsCatalog'

export const metadata: Metadata = {
  title: 'Clientes',
  description: 'Huéspedes y empresas del hotel'
}

type Props = {
  searchParams: Promise<{ tab?: string }>
}

const ClientsPage = async ({ searchParams }: Props) => {
  const { tab } = await searchParams

  return <ClientsCatalog defaultTab={tab} />
}

export default ClientsPage
