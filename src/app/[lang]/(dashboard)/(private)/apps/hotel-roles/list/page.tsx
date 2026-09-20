import type { Metadata } from 'next'

import HotelRoleListClient from '@views/apps/hotel-roles/list/HotelRoleListClient'

export const metadata: Metadata = {
  title: 'Roles',
  description: 'Catálogo de roles del hotel'
}

const HotelRolesListPage = () => {
  return <HotelRoleListClient />
}

export default HotelRolesListPage
