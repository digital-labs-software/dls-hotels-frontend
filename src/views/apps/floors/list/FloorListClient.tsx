'use client'

import dynamic from 'next/dynamic'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'

const FloorListTable = dynamic(() => import('@views/apps/floors/list/FloorListTable'), {
  ssr: false,
  loading: () => (
    <Card>
      <div className='flex justify-center items-center p-10'>
        <CircularProgress size={32} />
      </div>
    </Card>
  )
})

const FloorListClient = () => {
  return <FloorListTable />
}

export default FloorListClient
