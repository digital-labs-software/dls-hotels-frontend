'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const MyProfilePage = dynamic(() => import('@views/apps/profile/MyProfilePage'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const MyProfileClient = () => {
  return <MyProfilePage />
}

export default MyProfileClient
