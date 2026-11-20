'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { personsApi, type SalePerson } from '@/libs/personsApi'

type Props = {
  propertyId: number
  selected: SalePerson | null
  onSelect: (person: SalePerson | null) => void
  onCreate?: (query: string) => void
}

const personLabel = (person: SalePerson) => `${person.firstName} ${person.lastName} · DNI ${person.documentNumber}`

const PersonPicker = ({ propertyId, selected, onSelect, onCreate }: Props) => {
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<SalePerson[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selected) return

    setInputValue(personLabel(selected))
    setListOpen(false)
  }, [selected])

  const query = inputValue.trim()
  const canSearch = useMemo(() => query.length >= 3 && !selected, [query, selected])
  const notFound = Boolean(onCreate) && !selected && searched === query && query.length >= 3 && !loading && options.length === 0

  useEffect(() => {
    if (!canSearch) {
      setOptions([])
      setSearched('')

      return
    }

    const nextQuery = query
    const timeout = setTimeout(async () => {
      setLoading(true)

      try {
        setOptions(await personsApi.search(propertyId, nextQuery))
        setSearched(nextQuery)
      } catch {
        setOptions([])
        setSearched(nextQuery)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [canSearch, propertyId, query])

  return (
    <div ref={rootRef} className='flex flex-col gap-1'>
      <div className='flex items-stretch gap-2'>
        <Autocomplete
          className='min-is-0 flex-1'
          fullWidth
          open={listOpen && options.length > 0}
          onOpen={() => setListOpen(true)}
          onClose={() => setListOpen(false)}
          value={selected}
          options={options}
          loading={loading}
          filterOptions={items => items}
          getOptionLabel={personLabel}
          isOptionEqualToValue={(option, current) => option.uuid === current.uuid}
          inputValue={inputValue}
          onInputChange={(_, next, reason) => {
            setInputValue(next)
            if (reason === 'input' && selected) onSelect(null)
          }}
          onChange={(_, person) => {
            onSelect(person)
            setListOpen(false)
          }}
          renderOption={(props, option) => (
            <li {...props} key={option.uuid}>
              <div className='flex flex-col'>
                <Typography>
                  {option.firstName} {option.lastName}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  DNI {option.documentNumber}
                </Typography>
              </div>
            </li>
          )}
          renderInput={params => (
            <TextField
              {...params}
              label='Buscar persona'
              placeholder='DNI o nombre'
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
          <Button className='shrink-0 self-stretch' variant='outlined' onMouseDown={event => event.preventDefault()} onClick={() => onCreate?.(query)}>
            Agregar
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export default PersonPicker
