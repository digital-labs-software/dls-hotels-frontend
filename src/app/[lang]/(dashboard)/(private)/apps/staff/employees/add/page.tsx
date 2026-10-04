import type { Metadata } from 'next'

import EmployeeFormClient from '@views/apps/staff/employees/form/EmployeeFormClient'

export const metadata: Metadata = {
  title: 'Nuevo empleado',
  description: 'Registrar un empleado'
}

const EmployeesAddPage = () => {
  return <EmployeeFormClient />
}

export default EmployeesAddPage
