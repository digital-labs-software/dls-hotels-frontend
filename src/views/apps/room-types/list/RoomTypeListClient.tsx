'use client'

import dynamic from 'next/dynamic'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'

const RoomTypeListTable = dynamic(() => import('@views/apps/room-types/list/RoomTypeListTable'), {
  ssr: false,
  loading: () => (
    <Card>
      <div className='flex justify-center items-center p-10'>
        <CircularProgress size={32} />
      </div>
    </Card>
  )
})

const RoomTypeListClient = () => {
  return <RoomTypeListTable />
}

export default RoomTypeListClient
