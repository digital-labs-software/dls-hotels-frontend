'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const AccountsTable = dynamic(() => import('@views/apps/front-desk/AccountsTable'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const AccountsClient = () => {
  return <AccountsTable />
}

export default AccountsClient
