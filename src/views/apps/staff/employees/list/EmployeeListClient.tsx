'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const EmployeeListTable = dynamic(() => import('@views/apps/staff/employees/list/EmployeeListTable'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const EmployeeListClient = () => {
  return <EmployeeListTable />
}

export default EmployeeListClient
