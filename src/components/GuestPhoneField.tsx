'use client'

import { useEffect, useRef, useState } from 'react'

import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'

import {
  formatPeruGroups,
  peruNationalDigits,
  parseGuestPhone,
  storedGuestPhone,
  type GuestPhoneCountry
} from '@/utils/guestPhone'

type Props = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  error?: boolean
  helperText?: string
  label?: string
}

const GuestPhoneField = ({ value, onChange, onBlur, disabled, error, helperText, label = 'Celular' }: Props) => {
  const parsed = parseGuestPhone(value)
  const [country, setCountry] = useState<GuestPhoneCountry>(parsed.country)
  const [text, setText] = useState(parsed.country === 'PE' ? formatPeruGroups(parsed.national) : parsed.national)
  const emitted = useRef(value)

  useEffect(() => {
    if (value === emitted.current) return

    emitted.current = value
    const next = parseGuestPhone(value)

    setCountry(next.country)
    setText(next.country === 'PE' ? formatPeruGroups(next.national) : next.national)
  }, [value])

  const emit = (nextCountry: GuestPhoneCountry, nextText: string) => {
    const stored = storedGuestPhone(nextCountry, nextText)

    emitted.current = stored
    onChange(stored)
  }

  const changeCountry = (nextCountry: GuestPhoneCountry) => {
    if (nextCountry === country) return

    if (nextCountry === 'OTHER') {
      const national = peruNationalDigits(text)
      const free = national ? `+51${national}` : ''

      setCountry('OTHER')
      setText(free)
      emit('OTHER', free)

      return
    }

    const national = peruNationalDigits(text)

    setCountry('PE')
    setText(formatPeruGroups(national))
    emit('PE', national)
  }

  return (
    <TextField
      fullWidth
      label={label}
      placeholder={country === 'PE' ? '987 654 321' : 'Código y número'}
      value={text}
      disabled={disabled}
      error={error}
      helperText={helperText}
      onBlur={onBlur}
      onChange={event => {
        const raw = event.target.value

        if (country === 'PE') {
          const national = peruNationalDigits(raw)
          const grouped = formatPeruGroups(national)

          setText(grouped)
          emit('PE', national)

          return
        }

        const free = raw.slice(0, 20)

        setText(free)
        emit('OTHER', free)
      }}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: { inputMode: country === 'PE' ? 'numeric' : 'tel', maxLength: country === 'PE' ? 11 : 20 },
        input: {
          startAdornment: (
            <InputAdornment position='start' sx={{ mr: 1.5 }}>
              <Select
                variant='standard'
                disableUnderline
                value={country}
                disabled={disabled}
                onChange={event => changeCountry(event.target.value as GuestPhoneCountry)}
                renderValue={selected => (selected === 'PE' ? '+51' : 'Otro')}
                MenuProps={{ slotProps: { paper: { sx: { minWidth: 148 } } } }}
                sx={{
                  minWidth: 76,
                  '& .MuiSelect-select': {
                    py: 0,
                    pl: 0,
                    pr: '28px !important',
                    minWidth: '3.2ch'
                  },
                  '& .MuiSelect-icon': { right: 0 }
                }}
              >
                <MenuItem value='PE'>+51 Perú</MenuItem>
                <MenuItem value='OTHER'>Otro país</MenuItem>
              </Select>
            </InputAdornment>
          )
        }
      }}
    />
  )
}

export default GuestPhoneField
