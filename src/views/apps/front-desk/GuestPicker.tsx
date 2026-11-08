'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
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
  error?: boolean
  autoFocus?: boolean
  minChars?: number
  limit?: number
  onSelect: (guest: Guest | null) => void
  /** Huésped ya elegido, incluso si se creó en el diálogo y no salió de la lista. */
  selected?: Guest | null
  /** Cuando la búsqueda no encuentra a nadie. Recibe lo escrito (DNI o nombre). */
  onCreate?: (query: string) => void
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
  error,
  autoFocus,
  minChars = 3,
  limit = 5,
  onSelect,
  selected,
  onCreate
}: Props) => {
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<Guest[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState('')
  const [innerGuest, setInnerGuest] = useState<Guest | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const value = selected !== undefined ? selected : innerGuest
  const selectedId = selected?.id ?? null

  useEffect(() => {
    if (!selected) return

    setInputValue(guestLabel(selected))
    setListOpen(false)
  }, [selected, selectedId])

  useEffect(() => {
    if (!autoFocus) return

    const timer = window.setTimeout(() => rootRef.current?.querySelector('input')?.focus(), 0)

    return () => window.clearTimeout(timer)
  }, [autoFocus])

  const canSearch = useMemo(() => inputValue.trim().length >= minChars, [inputValue, minChars])
  const query = inputValue.trim()
  const notFound = Boolean(onCreate) && !value && searched === query && query.length >= minChars && !loading && options.length === 0
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
        const page = await frontDeskApi.searchGuests(propertyId, nextQuery, limit)

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
  }, [canSearch, disabled, inputValue, limit, propertyId, value])

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
          getOptionLabel={guestLabel}
          isOptionEqualToValue={(option, selected) => option.id === selected.id}
          inputValue={inputValue}
          onInputChange={(_, next, reason) => {
            setInputValue(next)

            if (reason === 'input' && value) {
              if (selected === undefined) setInnerGuest(null)
              onSelect(null)
            }
          }}
          onChange={(_, guest) => {
            if (selected === undefined) setInnerGuest(guest)
            onSelect(guest)
            setListOpen(false)
          }}
          slotProps={{
            popper: { placement: 'bottom-start' },
            paper: { sx: { width: '100%', minWidth: 0, boxSizing: 'border-box' } }
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

export default GuestPicker
