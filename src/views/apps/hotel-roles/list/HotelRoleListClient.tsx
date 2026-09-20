'use client'

import dynamic from 'next/dynamic'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'

const HotelRoleListTable = dynamic(() => import('@views/apps/hotel-roles/list/HotelRoleListTable'), {
  ssr: false,
  loading: () => (
    <Card>
      <div className='flex justify-center items-center p-10'>
        <CircularProgress size={32} />
      </div>
    </Card>
  )
})

const HotelRoleListClient = () => {
  return <HotelRoleListTable />
}

export default HotelRoleListClient
