'use client'

import { useEffect, useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import { addMonths, format, lastDayOfMonth, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { registerLocale } from 'react-datepicker'

import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'
import { dateToIso, isoToDate } from '@/components/date-picker/DateField'
import { listRates } from '@/libs/ratesApi'
import { limaToday } from '@/types/apps/frontDeskTypes'
import type { HotelRate } from '@/types/apps/rateTypes'
import { RateDayCell, RateToneLegend, rateToneSx, toneOf, withRateTones } from './rateTones'

registerLocale('es', es)

type Props = {
  open: boolean
  propertyId: number
  onClose: () => void
}

const monthLabel = (date: Date) => {
  const text = format(date, 'MMMM yyyy', { locale: es })

  return text.charAt(0).toUpperCase() + text.slice(1)
}

const RateYearDialog = ({ open, propertyId, onClose }: Props) => {
  const [rates, setRates] = useState<HotelRate[]>([])
  const [loading, setLoading] = useState(false)

  const windowStart = useMemo(() => startOfMonth(isoToDate(limaToday()) ?? new Date()), [])
  const windowEnd = useMemo(() => lastDayOfMonth(addMonths(windowStart, 11)), [windowStart])
  const startIso = dateToIso(windowStart)
  const endIso = dateToIso(windowEnd)

  useEffect(() => {
    if (!open || !propertyId) return

    let cancel = false

    setLoading(true)

    listRates(propertyId, { page: 1, limit: 100, isActive: true })
      .then(page => {
        if (!cancel) setRates(page.data)
      })
      .catch(() => {
        if (!cancel) setRates([])
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })

    return () => {
      cancel = true
    }
  }, [open, propertyId])

  const colored = useMemo(() => withRateTones(rates), [rates])

  const visible = useMemo(
    () => colored.filter(rate => rate.validTo >= startIso && rate.validFrom <= endIso),
    [colored, endIso, startIso]
  )

  const dayHit = (iso: string) => colored.find(rate => rate.validFrom <= iso && iso <= rate.validTo)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      scroll='paper'
      sx={{ '& .MuiDialog-paper': { width: 'min(1120px, calc(100vw - 32px))', maxWidth: 'none' } }}
    >
      <DialogTitle className='flex flex-col gap-1'>
        Tarifas del año
        <Typography variant='body2' color='text.secondary' fontWeight={400}>
          {monthLabel(windowStart)} – {monthLabel(windowEnd)}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <div className='flex justify-center p-10'>
            <CircularProgress size={32} />
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            <AppReactDatepicker
              inline
              monthsShown={12}
              calendarStartDay={1}
              locale='es'
              openToDate={windowStart}
              readOnly
              onChange={() => undefined}
              previousMonthAriaLabel='Mes anterior'
              nextMonthAriaLabel='Mes siguiente'
              chooseDayAriaLabelPrefix='Elegir'
              dayClassName={date => {
                const hit = dayHit(dateToIso(date))

                return hit ? `rate-day-taken rate-day-tone-${toneOf(hit, 0)}` : ''
              }}
              renderDayContents={(day, date) => (
                <RateDayCell day={day} name={date ? dayHit(dateToIso(date))?.name ?? '' : ''} />
              )}
              boxProps={{
                sx: {
                  '& .react-datepicker': {
                    display: 'flex',
                    flexWrap: 'wrap',
                    width: '100%',
                    boxShadow: 'none',
                    border: '1px solid var(--mui-palette-divider)',
                    backgroundColor: 'transparent'
                  },
                  '& .react-datepicker__navigation': {
                    display: 'none'
                  },
                  '& .react-datepicker__month-container': {
                    float: 'none',
                    flex: '0 0 25%',
                    width: '25%',
                    maxWidth: '25%'
                  },
                  '@media (max-width:899.95px)': {
                    '& .react-datepicker__month-container': {
                      flex: '0 0 50%',
                      width: '50%',
                      maxWidth: '50%'
                    }
                  },
                  '@media (max-width:599.95px)': {
                    '& .react-datepicker__month-container': {
                      flex: '0 0 100%',
                      width: '100%',
                      maxWidth: '100%'
                    }
                  },
                  '& .react-datepicker__current-month': {
                    padding: '10px 4px 2px'
                  },
                  '& .react-datepicker__month': {
                    margin: '4px 0 12px'
                  },
                  '& .react-datepicker__day, & .react-datepicker__day-name': {
                    width: '2rem',
                    lineHeight: '2rem',
                    margin: 0
                  },
                  '& .react-datepicker__day': {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '2rem',
                    padding: 0
                  },
                  '& .react-datepicker__day--outside-month': {
                    visibility: 'hidden',
                    pointerEvents: 'none'
                  },
                  '& .react-datepicker__day:not(.rate-day-taken)': {
                    cursor: 'default'
                  },
                  '& .react-datepicker__day.react-datepicker__day--selected:not(.rate-day-taken), & .react-datepicker__day.react-datepicker__day--selected:not(.rate-day-taken):hover, & .react-datepicker__day.react-datepicker__day--keyboard-selected:not(.rate-day-taken), & .react-datepicker__day.react-datepicker__day--keyboard-selected:not(.rate-day-taken):hover, & .react-datepicker__day.react-datepicker__day--today:not(.rate-day-taken)':
                    {
                      backgroundColor: 'transparent !important',
                      color: 'var(--mui-palette-text-primary) !important',
                      boxShadow: 'none !important'
                    },
                  ...rateToneSx('', true)
                }
              }}
            />
            <RateToneLegend rates={visible} />
            {visible.length === 0 ? (
              <Typography variant='body2' color='text.secondary'>
                No hay tarifas activas en estos doce meses.
              </Typography>
            ) : null}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RateYearDialog
