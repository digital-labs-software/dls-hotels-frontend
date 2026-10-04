import type { Metadata } from 'next'

import RoleFormClient from '@views/apps/staff/roles/form/RoleFormClient'

export const metadata: Metadata = {
  title: 'Nuevo rol',
  description: 'Registrar un rol'
}

const RolesAddPage = () => {
  return <RoleFormClient />
}

export default RolesAddPage
