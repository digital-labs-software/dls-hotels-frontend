'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const EmployeeForm = dynamic(() => import('@views/apps/staff/employees/form/EmployeeForm'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const EmployeeFormClient = ({ uuid }: { uuid?: string }) => {
  return <EmployeeForm uuid={uuid} />
}

export default EmployeeFormClient
