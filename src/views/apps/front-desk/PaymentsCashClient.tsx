'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const PaymentsCashTable = dynamic(() => import('@views/apps/front-desk/PaymentsCashTable'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const PaymentsCashClient = () => {
  return <PaymentsCashTable />
}

export default PaymentsCashClient
