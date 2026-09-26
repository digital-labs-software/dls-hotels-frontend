'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const RoleForm = dynamic(() => import('@views/apps/staff/roles/form/RoleForm'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const RoleFormClient = ({ uuid }: { uuid?: string }) => {
  return <RoleForm uuid={uuid} />
}

export default RoleFormClient
