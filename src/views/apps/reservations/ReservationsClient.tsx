'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const ReservationsPage = dynamic(() => import('@views/apps/reservations/ReservationsPage'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const ReservationsClient = () => {
  return <ReservationsPage />
}

export default ReservationsClient
