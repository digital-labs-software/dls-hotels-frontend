'use client'

import { Suspense } from 'react'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const BillingPage = dynamic(() => import('@views/apps/billing/BillingPage'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const BillingClient = () => {
  return (
    <Suspense
      fallback={
        <div className='flex justify-center items-center p-10'>
          <CircularProgress size={32} />
        </div>
      }
    >
      <BillingPage />
    </Suspense>
  )
}

export default BillingClient
