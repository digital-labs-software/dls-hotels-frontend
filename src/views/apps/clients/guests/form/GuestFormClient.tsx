'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const GuestForm = dynamic(() => import('@views/apps/clients/guests/form/GuestForm'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const GuestFormClient = ({ uuid }: { uuid?: string }) => {
  return <GuestForm uuid={uuid} />
}

export default GuestFormClient
