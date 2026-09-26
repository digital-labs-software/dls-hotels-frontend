'use client'

import dynamic from 'next/dynamic'
import CircularProgress from '@mui/material/CircularProgress'

const CompanyForm = dynamic(() => import('@views/apps/clients/companies/form/CompanyForm'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center p-10'>
      <CircularProgress size={32} />
    </div>
  )
})

const CompanyFormClient = ({ uuid }: { uuid?: string }) => {
  return <CompanyForm uuid={uuid} />
}

export default CompanyFormClient
