'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const RoomListTable = dynamic(() => import('@views/apps/rooms/list/RoomListTable'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const RoomListClient = () => {
  return <RoomListTable />
}

export default RoomListClient
