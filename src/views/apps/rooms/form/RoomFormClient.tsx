'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const RoomForm = dynamic(() => import('@views/apps/rooms/form/RoomForm'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const RoomFormClient = ({ uuid }: { uuid?: string }) => {
  return <RoomForm uuid={uuid} />
}

export default RoomFormClient
