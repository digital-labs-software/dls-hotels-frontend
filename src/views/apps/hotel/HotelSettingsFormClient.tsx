'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const HotelSettingsForm = dynamic(() => import('@views/apps/hotel/HotelSettingsForm'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const HotelSettingsFormClient = () => {
  return <HotelSettingsForm />
}

export default HotelSettingsFormClient
