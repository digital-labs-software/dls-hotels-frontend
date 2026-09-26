'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const CompanyListTable = dynamic(() => import('@views/apps/clients/companies/list/CompanyListTable'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const CompanyListClient = () => {
  return <CompanyListTable />
}

export default CompanyListClient
