'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const GuestSheetPage = dynamic(() => import('@views/apps/reports/GuestSheetPage'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const GuestSheetClient = () => {
  return <GuestSheetPage />
}

export default GuestSheetClient
