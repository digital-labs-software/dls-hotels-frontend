'use client'

import { useEffect, useState } from 'react'

import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import type { ThemeColor } from '@core/types'
import type { Company, CompanyType } from '@/types/apps/clientsTypes'
import { COMPANY_TYPE_LABELS, COMPANY_TYPES } from '@/types/apps/clientsTypes'

const typeColor: Record<CompanyType, ThemeColor> = {
  CORPORATE: 'primary',
  INSTITUTION: 'info',
  AGENCY: 'warning',
  OTHER: 'success'
}

const TableFilters = ({
  setData,
  companies
}: {
  setData: (data: Company[]) => void
  companies: Company[]
}) => {
  const [companyType, setCompanyType] = useState<CompanyType | ''>('')

  useEffect(() => {
    const filtered = companies.filter(company => {
      if (companyType && company.companyType !== companyType) {
        return false
      }

      return true
    })

    setData(filtered)
  }, [companyType, companies, setData])

  return (
    <CardContent>
      <div className='flex flex-col gap-2'>
        <Typography variant='body2' color='text.secondary'>
          Tipo de empresa
        </Typography>
        <div className='flex flex-wrap items-center gap-2'>
          <Chip
            clickable
            size='small'
            label='Todas'
            variant={companyType === '' ? 'tonal' : 'outlined'}
            color='default'
            onClick={() => setCompanyType('')}
          />
          {COMPANY_TYPES.map(item => {
            const selected = companyType === item

            return (
              <Chip
                key={item}
                clickable
                size='small'
                label={COMPANY_TYPE_LABELS[item]}
                variant={selected ? 'tonal' : 'outlined'}
                color={typeColor[item]}
                onClick={() => setCompanyType(item)}
              />
            )
          })}
        </div>
      </div>
    </CardContent>
  )
}

export default TableFilters
