'use client'

import { useEffect, useMemo, useState } from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { Guest } from '@/types/apps/clientsTypes'
import { DOCUMENT_TYPE_LABELS } from '@/types/apps/clientsTypes'
import { guestFullName } from '@/types/apps/frontDeskTypes'
import { frontDeskApi } from '@/libs/frontDeskApi'

type Props = {
  propertyId: number
  label?: string
  placeholder?: string
  disabled?: boolean
  minChars?: number
  limit?: number
  onSelect: (guest: Guest | null) => void
}

const guestLabel = (guest: Guest) => {
  const name = guestFullName(guest.person.firstName, guest.person.lastName)
  const document = guest.person.documentNumber
    ? `${DOCUMENT_TYPE_LABELS[guest.person.documentType ?? 'OTHER'] ?? ''} ${guest.person.documentNumber}`.trim()
    : ''

  return document ? `${name} · ${document}` : name
}

const GuestPicker = ({
  propertyId,
  label = 'Buscar huésped',
  placeholder = 'DNI o nombre',
  disabled,
  minChars = 3,
  limit = 5,
  onSelect
}: Props) => {
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<Guest[]>([])
  const [loading, setLoading] = useState(false)
  const [value, setValue] = useState<Guest | null>(null)

  const canSearch = useMemo(() => inputValue.trim().length >= minChars, [inputValue, minChars])

  useEffect(() => {
    if (!canSearch || disabled) {
      setOptions([])

      return
    }

    const timeout = setTimeout(async () => {
      setLoading(true)

      try {
        const page = await frontDeskApi.searchGuests(propertyId, inputValue.trim(), limit)

        setOptions(page.data)
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [canSearch, disabled, inputValue, limit, propertyId])

  return (
    <Autocomplete
      value={value}
      options={options}
      loading={loading}
      disabled={disabled}
      filterOptions={x => x}
      getOptionLabel={guestLabel}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      inputValue={inputValue}
      noOptionsText={
        canSearch
          ? 'Sin coincidencias. Completa los datos para crear uno nuevo.'
          : `Escribe al menos ${minChars} caracteres`
      }
      onInputChange={(_, next) => setInputValue(next)}
      onChange={(_, guest) => {
        setValue(guest)
        onSelect(guest)
      }}
      renderOption={(props, option) => (
        <li {...props} key={option.uuid}>
          <div className='flex flex-col'>
            <Typography>{guestFullName(option.person.firstName, option.person.lastName)}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {[
                option.person.documentNumber
                  ? `${DOCUMENT_TYPE_LABELS[option.person.documentType ?? 'OTHER'] ?? ''} ${option.person.documentNumber}`.trim()
                  : null,
                option.person.phone
              ]
                .filter(Boolean)
                .join(' · ')}
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

export default GuestPicker
