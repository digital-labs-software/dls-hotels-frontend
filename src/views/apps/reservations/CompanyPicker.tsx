'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
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
  error?: boolean
  autoFocus?: boolean
  /** Empresa ya elegida, incluso si se creó en el diálogo y no salió de la lista. */
  selected?: Company | null
  onSelect: (company: Company | null) => void
  /** Cuando la búsqueda no encuentra a nadie. Recibe lo escrito (RUC o razón social). */
  onCreate?: (query: string) => void
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
  error,
  autoFocus,
  selected,
  onSelect,
  onCreate
}: Props) => {
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState('')
  const [innerCompany, setInnerCompany] = useState<Company | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const value = selected !== undefined ? selected : innerCompany
  const selectedId = selected?.id ?? null

  useEffect(() => {
    if (!selected) return

    setInputValue(companyLabel(selected))
    setListOpen(false)
  }, [selected, selectedId])

  useEffect(() => {
    if (!autoFocus) return

    const timer = window.setTimeout(() => rootRef.current?.querySelector('input')?.focus(), 0)

    return () => window.clearTimeout(timer)
  }, [autoFocus])

  const canSearch = useMemo(() => inputValue.trim().length >= 2, [inputValue])
  const query = inputValue.trim()
  const notFound = Boolean(onCreate) && !value && searched === query && query.length >= 2 && !loading && options.length === 0
  const showOptions = listOpen && options.length > 0

  useEffect(() => {
    if (!canSearch || disabled || value) {
      setOptions([])
      setSearched('')

      return
    }

    const nextQuery = inputValue.trim()
    const timeout = setTimeout(async () => {
      setLoading(true)

      try {
        const page = await reservationsApi.searchCompanies(propertyId, nextQuery, 10)

        setOptions(page.data)
        setSearched(nextQuery)
      } catch {
        setOptions([])
        setSearched(nextQuery)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [canSearch, disabled, inputValue, propertyId, value])

  return (
    <div ref={rootRef} className='flex flex-col gap-1'>
      <div className='flex items-stretch gap-2'>
        <Autocomplete
          className='min-is-0 flex-1'
          fullWidth
          open={showOptions}
          onOpen={() => setListOpen(true)}
          onClose={() => setListOpen(false)}
          value={value}
          options={options}
          loading={loading}
          disabled={disabled}
          filterOptions={x => x}
          getOptionLabel={companyLabel}
          isOptionEqualToValue={(option, current) => option.id === current.id}
          inputValue={inputValue}
          onInputChange={(_, next, reason) => {
            setInputValue(next)

            if (reason === 'input' && value) {
              if (selected === undefined) setInnerCompany(null)
              onSelect(null)
            }
          }}
          onChange={(_, company) => {
            if (selected === undefined) setInnerCompany(company)
            onSelect(company)
            setListOpen(false)
          }}
          slotProps={{
            popper: { placement: 'bottom-start' },
            paper: { sx: { width: '100%', minWidth: 0, boxSizing: 'border-box' } }
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
              autoFocus={autoFocus}
              label={label}
              placeholder={placeholder}
              error={error}
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
        {notFound ? (
          <Button
            className='shrink-0 self-stretch'
            variant='outlined'
            onMouseDown={event => event.preventDefault()}
            onClick={() => onCreate?.(query)}
          >
            Agregar
          </Button>
        ) : null}
      </div>
      {notFound ? (
        <Typography variant='caption' color='text.secondary'>
          Sin coincidencias
        </Typography>
      ) : null}
    </div>
  )
}

export default CompanyPicker
