'use client'

import type { ReactNode } from 'react'

import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import { format, isValid, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import { registerLocale } from 'react-datepicker'

import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'

registerLocale('es', es)

const ISO_DATE = 'yyyy-MM-dd'

export const isoToDate = (value?: string | null) => {
  if (!value) {
    return null
  }

  const date = parse(value.slice(0, 10), ISO_DATE, new Date())

  return isValid(date) ? date : null
}

export const dateToIso = (date: Date | null) => (date && isValid(date) ? format(date, ISO_DATE) : '')

export const todayIso = () => dateToIso(new Date())

type Props = {

  /** Fecha en formato AAAA-MM-DD; vacío = sin fecha. */
  value: string | null | undefined
  onChange: (value: string) => void
  onBlur?: () => void
  label?: ReactNode
  minDate?: string
  maxDate?: string
  disabled?: boolean
  error?: boolean
  helperText?: ReactNode
  size?: 'small' | 'medium'
  fullWidth?: boolean
  required?: boolean
  name?: string
  id?: string
  className?: string
  clearable?: boolean

  /** Muestra listas de mes y año, útil para fechas lejanas como la de nacimiento. */
  yearDropdown?: boolean
}

const DateField = ({
  value,
  onChange,
  onBlur,
  label,
  minDate,
  maxDate,
  disabled,
  error,
  helperText,
  size,
  fullWidth,
  required,
  name,
  id,
  className,
  clearable,
  yearDropdown
}: Props) => {
  const today = todayIso()
  const todayAllowed = (!minDate || today >= minDate) && (!maxDate || today <= maxDate)

  return (
    <AppReactDatepicker
      boxProps={{ className, sx: fullWidth ? { inlineSize: '100%' } : undefined }}
      selected={isoToDate(value)}
      onChange={(date: Date | null) => onChange(dateToIso(date))}
      onBlur={onBlur}
      minDate={isoToDate(minDate) ?? undefined}
      maxDate={isoToDate(maxDate) ?? undefined}
      disabled={disabled}
      required={required}
      name={name}
      id={id}
      locale='es'
      dateFormat='dd/MM/yyyy'
      placeholderText='dd/mm/aaaa'
      todayButton={todayAllowed ? 'Hoy' : undefined}
      previousMonthAriaLabel='Mes anterior'
      nextMonthAriaLabel='Mes siguiente'
      chooseDayAriaLabelPrefix='Elegir'
      disabledDayAriaLabelPrefix='No disponible:'
      showYearDropdown={yearDropdown}
      showMonthDropdown={yearDropdown}
      scrollableYearDropdown={yearDropdown}
      yearDropdownItemNumber={yearDropdown ? 100 : undefined}
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
                  <i className='ri-calendar-line text-xl' />
                </InputAdornment>
              ),
              endAdornment:
                clearable && value && !disabled ? (
                  <InputAdornment position='end'>
                    <IconButton
                      size='small'
                      edge='end'
                      aria-label='Quitar fecha'
                      onClick={event => {
                        event.stopPropagation()
                        onChange('')
                      }}
                    >
                      <i className='ri-close-line text-lg' />
                    </IconButton>
                  </InputAdornment>
                ) : undefined
            }
          }}
        />
      }
    />
  )
}

export default DateField
