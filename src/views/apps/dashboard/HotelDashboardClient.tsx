'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const HotelDashboardPage = dynamic(() => import('@views/apps/dashboard/HotelDashboardPage'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const HotelDashboardClient = () => {
  return <HotelDashboardPage />
}

export default HotelDashboardClient
