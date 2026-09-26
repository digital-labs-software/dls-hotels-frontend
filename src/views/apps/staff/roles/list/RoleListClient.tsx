'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const RoleListTable = dynamic(() => import('@views/apps/staff/roles/list/RoleListTable'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const RoleListClient = () => {
  return <RoleListTable />
}

export default RoleListClient
