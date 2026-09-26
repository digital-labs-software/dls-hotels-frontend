import type { Metadata } from 'next'

import EmployeeFormClient from '@views/apps/staff/employees/form/EmployeeFormClient'

export const metadata: Metadata = {
  title: 'Editar empleado',
  description: 'Editar o ver un empleado'
}

type Props = {
  params: Promise<{ uuid: string }>
}

const EmployeesEditPage = async ({ params }: Props) => {
  const { uuid } = await params

  return <EmployeeFormClient uuid={uuid} />
}

export default EmployeesEditPage
