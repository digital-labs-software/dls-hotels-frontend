'use client'

import { useEffect, useMemo, useState } from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { Company } from '@/types/apps/clientsTypes'
import { COMPANY_TYPE_LABELS } from '@/types/apps/clientsTypes'
import { reservationsApi } from '@/libs/reservationsApi'

type Props = {
  propertyId: number
  label?: string
  placeholder?: string
  disabled?: boolean
  onSelect: (company: Company | null) => void
}

const companyLabel = (company: Company) => {
  const ruc = company.taxNumber ? `RUC ${company.taxNumber}` : ''
  const trade = company.tradeName && company.tradeName !== company.businessName ? company.tradeName : ''

  return [company.businessName, ruc, trade].filter(Boolean).join(' · ')
}

const CompanyPicker = ({
  propertyId,
  label = 'Buscar empresa',
  placeholder = 'Razón social o RUC',
  disabled,
  onSelect
}: Props) => {
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [value, setValue] = useState<Company | null>(null)

  const canSearch = useMemo(() => inputValue.trim().length >= 2, [inputValue])

  useEffect(() => {
    if (!canSearch || disabled) {
      setOptions([])

      return
    }

    const timeout = setTimeout(async () => {
      setLoading(true)

      try {
        const page = await reservationsApi.searchCompanies(propertyId, inputValue.trim(), 10)

        setOptions(page.data)
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [canSearch, disabled, inputValue, propertyId])

  return (
    <Autocomplete
      value={value}
      options={options}
      loading={loading}
      disabled={disabled}
      filterOptions={x => x}
      getOptionLabel={companyLabel}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      inputValue={inputValue}
      noOptionsText={canSearch ? 'Sin resultados → Crear empresa' : 'Escribe al menos 2 caracteres'}
      onInputChange={(_, next) => setInputValue(next)}
      onChange={(_, company) => {
        setValue(company)
        onSelect(company)
      }}
      renderOption={(props, option) => (
        <li {...props} key={option.uuid}>
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-2'>
              <Typography>{option.businessName}</Typography>
              <Chip size='small' label={COMPANY_TYPE_LABELS[option.companyType] ?? option.companyType} />
            </div>
            <Typography variant='body2' color='text.secondary'>
              {[option.taxNumber ? `RUC ${option.taxNumber}` : null, option.tradeName].filter(Boolean).join(' · ')}
            </Typography>
          </div>
        </li>
      )}
      renderInput={params => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color='inherit' size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              )
            }
          }}
        />
      )}
    />
  )
}

export default CompanyPicker
