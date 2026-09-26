'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const GuestListTable = dynamic(() => import('@views/apps/clients/guests/list/GuestListTable'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const GuestListClient = () => {
  return <GuestListTable />
}

export default GuestListClient
