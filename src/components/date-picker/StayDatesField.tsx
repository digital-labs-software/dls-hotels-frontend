'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import Link from '@mui/material/Link'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { addDays, differenceInCalendarDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { registerLocale } from 'react-datepicker'

import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'

import DateField, { dateToIso, isoToDate } from './DateField'

registerLocale('es', es)

type Props = {
  checkIn: string
  checkOut: string
  onChange: (checkIn: string, checkOut: string) => void
  error?: boolean
  helperText?: ReactNode
}

const StayDatesField = ({ checkIn, checkOut, onChange, error, helperText }: Props) => {
  const theme = useTheme()
  const narrow = useMediaQuery(theme.breakpoints.down('sm'))
  const [open, setOpen] = useState(false)
  const [draftIn, setDraftIn] = useState<Date | null>(null)
  const [draftOut, setDraftOut] = useState<Date | null>(null)

  const nights = draftIn && draftOut ? differenceInCalendarDays(draftOut, draftIn) : 0
  const summary = !draftIn
    ? 'Elija el día de ingreso'
    : !draftOut
      ? 'Ahora elija el día de salida'
      : nights < 1
        ? 'La salida tiene que ser después del ingreso.'
        : `${nights} noche${nights === 1 ? '' : 's'}`

  const openCalendar = () => {
    setDraftIn(isoToDate(checkIn))
    setDraftOut(null)
    setOpen(true)
  }

  const closeCalendar = () => setOpen(false)

  const accept = () => {
    if (!draftIn || !draftOut || nights < 1) return

    onChange(dateToIso(draftIn), dateToIso(draftOut))
    setOpen(false)
  }

  const changeCheckIn = (value: string) => {
    if (!value) return

    const start = isoToDate(checkIn)
    const end = isoToDate(checkOut)
    const kept = start && end ? Math.max(differenceInCalendarDays(end, start), 1) : 1
    const nextOut = checkOut > value ? checkOut : dateToIso(addDays(isoToDate(value) as Date, kept))

    onChange(value, nextOut)
  }

  return (
    <>
      <div className='grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 items-end'>
        <DateField fullWidth size='small' label='Ingreso (check-in)' value={checkIn} onChange={changeCheckIn} />
        <DateField
          fullWidth
          size='small'
          label='Salida (check-out)'
          value={checkOut}
          minDate={checkIn ? dateToIso(addDays(isoToDate(checkIn) as Date, 1)) : undefined}
          error={error}
          helperText={helperText}
          onChange={value => value && onChange(checkIn, value)}
        />
        <Link
          component='button'
          type='button'
          variant='caption'
          className='justify-self-start sm:mb-1'
          onClick={openCalendar}
        >
          Elegir varias noches
        </Link>
      </div>

      <Dialog open={open} onClose={closeCalendar} maxWidth={false}>
        <DialogTitle>Elegir varias noches</DialogTitle>
        <DialogContent className='flex flex-col gap-4 pt-2'>
          <AppReactDatepicker
            inline
            selectsRange
            swapRange
            monthsShown={narrow ? 1 : 2}
            showMonthDropdown
            showYearDropdown
            dropdownMode='scroll'
            scrollableYearDropdown
            yearDropdownItemNumber={6}
            calendarStartDay={1}
            locale='es'
            selected={draftIn}
            startDate={draftIn}
            endDate={draftOut}
            openToDate={draftIn ?? undefined}
            shouldCloseOnSelect={false}
            previousMonthAriaLabel='Mes anterior'
            nextMonthAriaLabel='Mes siguiente'
            chooseDayAriaLabelPrefix='Elegir'
            onChange={(dates: [Date | null, Date | null]) => {
              setDraftIn(dates[0])
              setDraftOut(dates[1])
            }}
            boxProps={{
              sx: {
                '& .react-datepicker': {
                  boxShadow: 'none',
                  border: '1px solid var(--mui-palette-divider)'
                }
              }
            }}
          />
          <Typography variant='body2' fontWeight={600} color={nights < 1 ? 'text.secondary' : 'text.primary'}>
            {summary}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCalendar}>Cancelar</Button>
          <Button variant='contained' disabled={!draftIn || !draftOut || nights < 1} onClick={accept}>
            Aceptar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default StayDatesField
