'use client'

import { useMemo, useRef } from 'react'

import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { differenceInCalendarDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { registerLocale } from 'react-datepicker'

import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'
import { dateToIso, isoToDate } from '@/components/date-picker/DateField'
import { formatRateDate } from '@/types/apps/rateTypes'
import { RateDayCell, RateToneLegend, rateToneSx, toneOf, type RateSpan } from './rateTones'

registerLocale('es', es)

export type TakenRate = RateSpan

type Props = {
  from: string
  to: string
  taken: TakenRate[]
  /** Si está apagado, los días ocupados se ven pero se pueden elegir. */
  blockTaken: boolean
  /** En edición, un clic mueve el extremo más cercano. En nueva, vuelve a elegir inicio y fin. */
  adjustEnds?: boolean
  disabled?: boolean
  error?: string
  onChange: (from: string, to: string) => void
  onBlocked?: (message: string) => void
}

const freeDay =
  ':not(.react-datepicker__day--selected):not(.react-datepicker__day--range-start):not(.react-datepicker__day--range-end):not(.react-datepicker__day--in-range):not(.react-datepicker__day--in-selecting-range)'

const rateIndex = (taken: TakenRate[], iso: string) =>
  taken.findIndex(rate => rate.validFrom <= iso && iso <= rate.validTo)

const dayName = (taken: TakenRate[], iso: string) => {
  const index = rateIndex(taken, iso)

  return index < 0 ? '' : taken[index].name
}

const rangeClash = (taken: TakenRate[], from: string, to: string) =>
  taken.find(rate => rate.validFrom <= to && rate.validTo >= from)

const RateRangeCalendar = ({
  from,
  to,
  taken,
  blockTaken,
  adjustEnds = false,
  disabled,
  error,
  onChange,
  onBlocked
}: Props) => {
  const theme = useTheme()
  const narrow = useMediaQuery(theme.breakpoints.down('md'))
  const today = useRef(new Date())
  const start = isoToDate(from)
  const end = isoToDate(to)

  const sorted = useMemo(
    () => [...taken].sort((a, b) => a.validFrom.localeCompare(b.validFrom) || a.name.localeCompare(b.name, 'es')),
    [taken]
  )

  const rangeLabel = from && to ? `Desde ${formatRateDate(from)} hasta ${formatRateDate(to)}` : ''

  const commitRange = (rangeFrom: string, rangeTo: string) => {
    if (rangeTo < rangeFrom) return

    const clash = blockTaken ? rangeClash(sorted, rangeFrom, rangeTo) : undefined

    if (clash) {
      onBlocked?.(`Ese tramo pisa ${clash.name}`)

      return
    }

    onChange(rangeFrom, rangeTo)
  }

  /** Con el tramo ya marcado, un clic mueve el extremo más cercano. */
  const moveNearestEnd = (clicked: Date) => {
    if (!start || !end) return

    const fromStart = differenceInCalendarDays(clicked, start)
    const length = differenceInCalendarDays(end, start)

    if (fromStart === 0 || fromStart === length) return

    let nextFrom = start
    let nextTo = end

    if (fromStart < 0) nextFrom = clicked
    else if (fromStart > length) nextTo = clicked
    else if (fromStart < length - fromStart) nextFrom = clicked
    else nextTo = clicked

    commitRange(dateToIso(nextFrom), dateToIso(nextTo))
  }

  const apply = (dates: [Date | null, Date | null]) => {
    if (disabled) return

    const [nextStart, nextEnd] = dates

    if (adjustEnds && from && to) {
      if (nextStart) moveNearestEnd(nextStart)

      return
    }

    if (!nextStart) {
      onChange('', '')

      return
    }

    const startIso = dateToIso(nextStart)
    const startTaken = blockTaken ? dayName(sorted, startIso) : ''

    if (startTaken) {
      onBlocked?.(`Ese día es de ${startTaken}`)

      return
    }

    if (!nextEnd) {
      if (from && startIso === from) {
        commitRange(startIso, startIso)

        return
      }

      onChange(startIso, '')

      return
    }

    const endIso = dateToIso(nextEnd)
    const [rangeFrom, rangeTo] = startIso <= endIso ? [startIso, endIso] : [endIso, startIso]

    commitRange(rangeFrom, rangeTo)
  }

  const toneSx = rateToneSx(freeDay)

  return (
    <div className='flex w-full max-w-full flex-col gap-2 md:w-max'>
      <Typography variant='caption' color='text.secondary'>
        Vigencia
      </Typography>
      {error || rangeLabel ? (
        <Typography
          variant='body2'
          fontWeight={600}
          color={error ? 'error.main' : 'text.primary'}
          align='center'
          className='w-0 min-w-full'
          sx={{ mt: 0.5, mb: 1 }}
        >
          {error || rangeLabel}
        </Typography>
      ) : null}
      <div className='flex w-fit max-w-full flex-col items-end'>
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
        allowSameDay
        disabled={disabled}
        selected={start}
        startDate={start}
        endDate={end}
        openToDate={start ?? today.current}
        shouldCloseOnSelect={false}
        previousMonthAriaLabel='Mes anterior'
        nextMonthAriaLabel='Mes siguiente'
        chooseDayAriaLabelPrefix='Elegir'
        onChange={apply}
        dayClassName={date => {
          const index = rateIndex(sorted, dateToIso(date))

          return index < 0 ? '' : `rate-day-taken rate-day-tone-${toneOf(sorted[index], index)}`
        }}
        renderDayContents={(day, date) => (
          <RateDayCell day={day} name={date ? dayName(sorted, dateToIso(date)) : ''} />
        )}
        boxProps={{
          sx: {
            width: 'fit-content',
            maxWidth: '100%',
            '& .react-datepicker': {
              boxShadow: 'none',
              border: '1px solid var(--mui-palette-divider)'
            },
            '& .react-datepicker__day': {
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '2.25rem',
              padding: 0
            },
            '& .react-datepicker__day.react-datepicker__day--range-start.react-datepicker__day--range-end, & .react-datepicker__day.react-datepicker__day--range-start.react-datepicker__day--range-end:hover, & .react-datepicker__day.react-datepicker__day--selected.react-datepicker__day--range-start.react-datepicker__day--range-end.react-datepicker__day--in-range, & .react-datepicker__day.react-datepicker__day--selected.react-datepicker__day--range-start.react-datepicker__day--range-end.react-datepicker__day--in-range:hover':
              {
                borderRadius: '50% !important',
                backgroundColor: 'var(--mui-palette-primary-main) !important',
                color: 'var(--mui-palette-common-white) !important'
              },
            ...toneSx,
            '& .react-datepicker__day.react-datepicker__day--outside-month': {
              backgroundColor: 'transparent !important',
              color: 'var(--mui-palette-text-disabled) !important',
              borderRadius: '0 !important',
              boxShadow: 'none !important',
              pointerEvents: 'none',
              '&, &:hover, &.react-datepicker__day--selected, &.react-datepicker__day--selected:hover, &.react-datepicker__day--keyboard-selected, &.react-datepicker__day--range-start, &.react-datepicker__day--range-end, &.react-datepicker__day--range-start.react-datepicker__day--in-range, &.react-datepicker__day--range-end.react-datepicker__day--in-range, &.react-datepicker__day--selected.react-datepicker__day--range-start.react-datepicker__day--in-range, &.react-datepicker__day--selected.react-datepicker__day--range-start.react-datepicker__day--in-range:hover, &.react-datepicker__day--selected.react-datepicker__day--in-selecting-range.react-datepicker__day--selecting-range-start, &.react-datepicker__day--selected.react-datepicker__day--in-selecting-range.react-datepicker__day--selecting-range-start:hover, &.react-datepicker__day--in-range, &.react-datepicker__day--in-selecting-range, &.react-datepicker__day--selecting-range-start, &.react-datepicker__day--selecting-range-end, &.rate-day-taken':
                {
                  backgroundColor: 'transparent !important',
                  backgroundImage: 'none !important',
                  color: 'var(--mui-palette-text-disabled) !important',
                  borderRadius: '0 !important',
                  boxShadow: 'none !important'
                }
            }
          }
        }}
      />
      {adjustEnds && from && to && !disabled ? (
        <Button type='button' size='small' onClick={() => onChange('', '')}>
          Elegir otras fechas
        </Button>
      ) : null}
      </div>
      <div className='w-0 min-w-full'>
        <RateToneLegend rates={sorted} />
      </div>
    </div>
  )
}

export default RateRangeCalendar
