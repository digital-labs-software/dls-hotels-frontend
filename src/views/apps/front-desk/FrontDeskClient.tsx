'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const FrontDeskPage = dynamic(() => import('@views/apps/front-desk/FrontDeskPage'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const FrontDeskClient = () => {
  return <FrontDeskPage />
}

export default FrontDeskClient
