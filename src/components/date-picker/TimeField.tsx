'use client'

import type { ReactNode } from 'react'

import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import { format, isValid, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import { registerLocale } from 'react-datepicker'

import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'

registerLocale('es', es)

const TIME_FORMAT = 'HH:mm'

const toDate = (value?: string | null) => {
  if (!value) {
    return null
  }

  const date = parse(value.slice(0, 5), TIME_FORMAT, new Date())

  return isValid(date) ? date : null
}

type Props = {

  /** Hora en formato HH:mm (24 horas); vacío = sin hora. */
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
      onChange={(date: Date | null) => onChange(date && isValid(date) ? format(date, TIME_FORMAT) : '')}
      onBlur={onBlur}
      disabled={disabled}
      name={name}
      locale='es'
      showTimeSelect
      showTimeSelectOnly
      timeIntervals={intervalMinutes}
      timeCaption='Hora'
      timeFormat={TIME_FORMAT}
      dateFormat={TIME_FORMAT}
      placeholderText='hh:mm'
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
