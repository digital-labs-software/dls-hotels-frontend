'use client'

import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import { format, isValid, parse } from 'date-fns'

import DateField from '@/components/date-picker/DateField'
import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'
import { limaToday } from '@/types/apps/frontDeskTypes'

const shiftDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T12:00:00`)

  date.setDate(date.getDate() + days)

  return format(date, 'yyyy-MM-dd')
}

export const currentMonth = () => limaToday().slice(0, 7)

export const monthStart = () => `${currentMonth()}-01`

const previousMonthRange = () => {
  const firstOfThisMonth = new Date(`${monthStart()}T12:00:00`)
  const lastOfPrevious = new Date(firstOfThisMonth)

  lastOfPrevious.setDate(0)

  return { from: format(lastOfPrevious, 'yyyy-MM-01'), to: format(lastOfPrevious, 'yyyy-MM-dd') }
}

/** Un día, con botones rápidos de ayer / hoy / mañana. */
export const DayFilter = ({
  value,
  onChange,
  allowTomorrow = true
}: {
  value: string
  onChange: (value: string) => void
  allowTomorrow?: boolean
}) => {
  const today = limaToday()

  return (
    <>
      <DateField label='Fecha' value={value} onChange={next => onChange(next || today)} size='small' />
      <ButtonGroup variant='outlined' size='small' color='secondary'>
        <Button onClick={() => onChange(shiftDays(today, -1))} variant={value === shiftDays(today, -1) ? 'contained' : 'outlined'}>
          Ayer
        </Button>
        <Button onClick={() => onChange(today)} variant={value === today ? 'contained' : 'outlined'}>
          Hoy
        </Button>
        {allowTomorrow ? (
          <Button onClick={() => onChange(shiftDays(today, 1))} variant={value === shiftDays(today, 1) ? 'contained' : 'outlined'}>
            Mañana
          </Button>
        ) : null}
      </ButtonGroup>
    </>
  )
}

export type DateRange = { from: string; to: string }

export const thisMonthRange = (): DateRange => ({ from: monthStart(), to: limaToday() })

/** Rango desde / hasta con atajos de periodo. */
export const RangeFilter = ({ value, onChange }: { value: DateRange; onChange: (value: DateRange) => void }) => {
  const today = limaToday()
  const thisMonth = thisMonthRange()
  const lastMonth = previousMonthRange()

  const presets = [
    { label: 'Hoy', range: { from: today, to: today } },
    { label: 'Este mes', range: thisMonth },
    { label: 'Mes pasado', range: lastMonth }
  ]

  return (
    <>
      <DateField
        label='Desde'
        value={value.from}
        maxDate={value.to}
        onChange={from => onChange({ ...value, from: from || thisMonth.from })}
        size='small'
      />
      <DateField
        label='Hasta'
        value={value.to}
        minDate={value.from}
        onChange={to => onChange({ ...value, to: to || today })}
        size='small'
      />
      <ButtonGroup variant='outlined' size='small' color='secondary'>
        {presets.map(preset => (
          <Button
            key={preset.label}
            onClick={() => onChange(preset.range)}
            variant={value.from === preset.range.from && value.to === preset.range.to ? 'contained' : 'outlined'}
          >
            {preset.label}
          </Button>
        ))}
      </ButtonGroup>
    </>
  )
}

/** Mes en formato AAAA-MM. */
export const MonthFilter = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const selected = parse(`${value}-01`, 'yyyy-MM-dd', new Date())

  return (
    <AppReactDatepicker
      selected={isValid(selected) ? selected : null}
      onChange={(date: Date | null) => onChange(date && isValid(date) ? format(date, 'yyyy-MM') : currentMonth())}
      showMonthYearPicker
      locale='es'
      dateFormat='MMMM yyyy'
      maxDate={new Date()}
      popperProps={{ strategy: 'fixed' }}
      customInputRef='inputRef'
      customInput={
        <TextField
          size='small'
          label='Mes'
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='ri-calendar-2-line text-xl' />
                </InputAdornment>
              )
            }
          }}
        />
      }
    />
  )
}
