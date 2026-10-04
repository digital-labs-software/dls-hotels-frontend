'use client'

import { Suspense } from 'react'

import dynamic from 'next/dynamic'

import CircularProgress from '@mui/material/CircularProgress'

const SupportPage = dynamic(() => import('@views/apps/support/SupportPage'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const SupportClient = () => {
  return (
    <Suspense
      fallback={
        <div className='flex justify-center items-center p-10'>
          <CircularProgress size={32} />
        </div>
      }
    >
      <SupportPage />
    </Suspense>
  )
}

export default SupportClient
