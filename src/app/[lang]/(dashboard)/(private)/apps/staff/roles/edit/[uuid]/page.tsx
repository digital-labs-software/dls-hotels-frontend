import type { Metadata } from 'next'

import RoleFormClient from '@views/apps/staff/roles/form/RoleFormClient'

export const metadata: Metadata = {
  title: 'Editar rol',
  description: 'Editar un rol o ver sus permisos'
}

type Props = {
  params: Promise<{ uuid: string }>
}

const RolesEditPage = async ({ params }: Props) => {
  const { uuid } = await params

  return <RoleFormClient uuid={uuid} />
}

export default RolesEditPage
