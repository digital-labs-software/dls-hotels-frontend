'use client'

import dynamic from 'next/dynamic'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'

const RateListTable = dynamic(() => import('@views/apps/rates/list/RateListTable'), {
  ssr: false,
  loading: () => (
    <Card>
      <div className='flex justify-center items-center p-10'>
        <CircularProgress size={32} />
      </div>
    </Card>
  )
})

const RateListClient = () => {
  return <RateListTable />
}

export default RateListClient
