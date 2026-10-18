'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const RateForm = dynamic(() => import('@views/apps/rates/form/RateForm'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const RateFormClient = ({ uuid }: { uuid?: string }) => {
  return <RateForm uuid={uuid} />
}

export default RateFormClient
