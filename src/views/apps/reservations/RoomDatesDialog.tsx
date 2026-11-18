'use client'

import { useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { differenceInCalendarDays } from 'date-fns'

import { dateToIso, isoToDate } from '@/components/date-picker/DateField'
import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'

const stayDayShort = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' })

const formatStayDayShort = (day: string) =>
  day ? stayDayShort.format(new Date(`${day}T00:00:00Z`)).replace(/\./g, '') : '—'

const dayCountLabel = (count: number) => `${count} día${count === 1 ? '' : 's'}`

const roomDateShift = (roomIn: string, roomOut: string, groupIn: string, groupOut: string) => {
  const roomStart = isoToDate(roomIn)
  const roomEnd = isoToDate(roomOut)
  const groupStart = isoToDate(groupIn)
  const groupEnd = isoToDate(groupOut)

  if (!roomStart || !roomEnd || !groupStart || !groupEnd) {
    return ''
  }

  const inShift = differenceInCalendarDays(roomStart, groupStart)
  const outShift = differenceInCalendarDays(roomEnd, groupEnd)
  const parts: string[] = []

  if (inShift > 0) parts.push(`entra ${dayCountLabel(inShift)} después`)
  if (inShift < 0) parts.push(`entra ${dayCountLabel(-inShift)} antes`)
  if (outShift > 0) parts.push(`sale ${dayCountLabel(outShift)} después`)
  if (outShift < 0) parts.push(`sale ${dayCountLabel(-outShift)} antes`)

  if (parts.length === 0) {
    return ''
  }

  const sentence = parts.join(' y ')

  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}`
}

type Props = {
  open: boolean
  title: string
  roomCheckIn: string
  roomCheckOut: string
  stayCheckIn: string
  stayCheckOut: string
  onClose: () => void
  onAccept: (checkIn: string, checkOut: string) => void
}

const RoomDatesDialog = ({
  open,
  title,
  roomCheckIn,
  roomCheckOut,
  stayCheckIn,
  stayCheckOut,
  onClose,
  onAccept
}: Props) => {
  const theme = useTheme()
  const narrow = useMediaQuery(theme.breakpoints.down('sm'))
  const [draftIn, setDraftIn] = useState<Date | null>(isoToDate(roomCheckIn))
  const [draftOut, setDraftOut] = useState<Date | null>(isoToDate(roomCheckOut))
  const [selectingNew, setSelectingNew] = useState(false)
  const draftInIso = dateToIso(draftIn)
  const draftOutIso = dateToIso(draftOut)
  const nights = draftIn && draftOut ? differenceInCalendarDays(draftOut, draftIn) : 0
  const rangeReady = Boolean(draftIn && draftOut && nights > 0 && !selectingNew)
  const shift = draftInIso && draftOutIso && nights > 0 ? roomDateShift(draftInIso, draftOutIso, stayCheckIn, stayCheckOut) : ''

  /** Con el tramo ya marcado, un clic mueve el extremo más cercano. No vuelve a pedir las dos fechas. */
  const moveNearestEnd = (clicked: Date) => {
    if (!draftIn || !draftOut) return

    const fromStart = differenceInCalendarDays(clicked, draftIn)
    const length = differenceInCalendarDays(draftOut, draftIn)

    if (fromStart === 0 || fromStart === length) return

    if (fromStart < 0) {
      setDraftIn(clicked)

      return
    }

    if (fromStart > length) {
      setDraftOut(clicked)

      return
    }

    const fromEnd = length - fromStart

    if (fromStart < fromEnd) setDraftIn(clicked)
    else setDraftOut(clicked)
  }

  const onCalendarChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates

    if (!rangeReady) {
      setDraftIn(start)
      setDraftOut(end)

      if (start && end && differenceInCalendarDays(end, start) > 0) setSelectingNew(false)

      return
    }

    if (start) moveNearestEnd(start)
  }

  const alreadyGroup = Boolean(draftInIso && draftOutIso && draftInIso === stayCheckIn && draftOutIso === stayCheckOut)

  const applyGroupDates = () => {
    setSelectingNew(false)
    setDraftIn(isoToDate(stayCheckIn))
    setDraftOut(isoToDate(stayCheckOut))
  }

  const summary =
    !draftIn
      ? 'Elija el día de ingreso'
      : !draftOut
        ? 'Ahora elija el día de salida'
        : nights < 1
          ? 'La salida tiene que ser después del ingreso.'
          : shift
            ? `${shift} · ${nights} noche${nights === 1 ? '' : 's'}`
            : `Igual que el grupo · ${nights} noche${nights === 1 ? '' : 's'}`

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent className='flex flex-col gap-4 pt-2'>
        <Typography variant='body2' color='text.secondary'>
          El grupo entra el {formatStayDayShort(stayCheckIn)} y sale el {formatStayDayShort(stayCheckOut)}. Esta habitación
          puede entrar o salir otro día.
        </Typography>
        <div className='flex w-fit flex-col items-end'>
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
            onChange={onCalendarChange}
            boxProps={{
              sx: {
                width: 'fit-content',
                '& .react-datepicker': {
                  boxShadow: 'none',
                  border: '1px solid var(--mui-palette-divider)'
                }
              }
            }}
          />
          {rangeReady ? (
            <Button
              size='small'
              onClick={() => {
                setSelectingNew(true)
                setDraftIn(null)
                setDraftOut(null)
              }}
            >
              Elegir otras fechas
            </Button>
          ) : null}
        </div>
        <Typography variant='body2' fontWeight={600} color={nights < 1 ? 'text.secondary' : 'text.primary'}>
          {summary}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        {alreadyGroup ? null : (
          <Button onClick={applyGroupDates}>Usar las fechas del grupo</Button>
        )}
        <Button
          variant='contained'
          disabled={!draftIn || !draftOut || nights < 1}
          onClick={() => draftInIso && draftOutIso && onAccept(draftInIso, draftOutIso)}
        >
          Aceptar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RoomDatesDialog
