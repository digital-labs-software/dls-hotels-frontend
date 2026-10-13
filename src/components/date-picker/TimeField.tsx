'use client'

import type { ReactNode } from 'react'

import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import { format, isValid, parse } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { registerLocale } from 'react-datepicker'

import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'

registerLocale('en', enUS)

/** Valor guardado (API). */
const VALUE_FORMAT = 'HH:mm'

/** Lo que ve el usuario: 02:00 PM. */
const DISPLAY_FORMAT = 'hh:mm a'

const toDate = (value?: string | null) => {
  if (!value) {
    return null
  }

  const date = parse(value.slice(0, 5), VALUE_FORMAT, new Date())

  return isValid(date) ? date : null
}

type Props = {

  /** Hora en formato HH:mm (24 horas) para el API. En pantalla se muestra AM/PM. */
  value: string | null | undefined
  onChange: (value: string) => void
  onBlur?: () => void
  label?: ReactNode
  disabled?: boolean
  error?: boolean
  helperText?: ReactNode
  size?: 'small' | 'medium'
  fullWidth?: boolean
  name?: string
  intervalMinutes?: number
}

const TimeField = ({
  value,
  onChange,
  onBlur,
  label,
  disabled,
  error,
  helperText,
  size,
  fullWidth,
  name,
  intervalMinutes = 30
}: Props) => {
  return (
    <AppReactDatepicker
      boxProps={{ sx: fullWidth ? { inlineSize: '100%' } : undefined }}
      selected={toDate(value)}
      onChange={(date: Date | null) => onChange(date && isValid(date) ? format(date, VALUE_FORMAT) : '')}
      onBlur={onBlur}
      disabled={disabled}
      name={name}
      locale='en'
      showTimeSelect
      showTimeSelectOnly
      timeIntervals={intervalMinutes}
      timeCaption='Hora'
      timeFormat={DISPLAY_FORMAT}
      dateFormat={DISPLAY_FORMAT}
      placeholderText='hh:mm AM'
      popperProps={{ strategy: 'fixed' }}
      autoComplete='off'
      customInputRef='inputRef'
      customInput={
        <TextField
          fullWidth={fullWidth}
          size={size}
          label={label}
          error={error}
          helperText={helperText}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='ri-time-line text-xl' />
                </InputAdornment>
              )
            }
          }}
        />
      }
    />
  )
}

export default TimeField
