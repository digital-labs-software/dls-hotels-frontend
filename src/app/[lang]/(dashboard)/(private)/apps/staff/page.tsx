import type { Metadata } from 'next'

import StaffCatalog from '@views/apps/staff/StaffCatalog'

export const metadata: Metadata = {
  title: 'Personal',
  description: 'Empleados, roles y permisos del hotel'
}

type Props = {
  searchParams: Promise<{ tab?: string }>
}

const StaffPage = async ({ searchParams }: Props) => {
  const { tab } = await searchParams

  return <StaffCatalog defaultTab={tab} />
}

export default StaffPage
