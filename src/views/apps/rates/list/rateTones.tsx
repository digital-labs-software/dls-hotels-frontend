'use client'

import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

export type RateSpan = {
  name: string
  validFrom: string
  validTo: string
  tone?: number
}

/** 0 azul Bootstrap, 1 celeste (info), 2 verde (success), 3 ámbar (warning). */
export const RATE_TONES = [
  { text: '#0D6EFD', bg: 'rgb(13 110 253 / 0.16)' },
  { text: 'var(--mui-palette-info-main)', bg: 'var(--mui-palette-info-lightOpacity)' },
  { text: 'var(--mui-palette-success-main)', bg: 'var(--mui-palette-success-lightOpacity)' },
  { text: 'var(--mui-palette-warning-main)', bg: 'var(--mui-palette-warning-lightOpacity)' }
] as const

/** Azul, verde, celeste, ámbar, y otra vez el azul. */
const TONE_CYCLE = [0, 2, 1, 3] as const

export const withRateTones = <T extends { name: string; validFrom: string; validTo: string }>(rates: T[]) =>
  [...rates]
    .sort((a, b) => a.validFrom.localeCompare(b.validFrom) || a.name.localeCompare(b.name, 'es'))
    .map((rate, index) => ({ ...rate, tone: TONE_CYCLE[index % TONE_CYCLE.length] }))

export const toneOf = (rate: RateSpan, fallbackIndex: number) =>
  (rate.tone ?? fallbackIndex) % RATE_TONES.length

export const rateToneSx = (suffix = '', important = false) =>
  Object.fromEntries(
    RATE_TONES.map((tone, index) => [
      `& .react-datepicker__day.rate-day-tone-${index}${suffix}`,
      {
        color: important ? `${tone.text} !important` : tone.text,
        backgroundColor: important ? `${tone.bg} !important` : tone.bg,
        borderRadius: '50%',
        cursor: 'help'
      }
    ])
  )

export const RateDayCell = ({ day, name }: { day: number; name: string }) => {
  const cell = <span className='flex h-full w-full items-center justify-center'>{day}</span>

  if (!name) return cell

  return (
    <Tooltip title={name} placement='top' arrow enterDelay={200} enterNextDelay={0}>
      {cell}
    </Tooltip>
  )
}

export const RateToneLegend = ({ rates }: { rates: RateSpan[] }) => {
  if (rates.length === 0) return null

  return (
    <div className='flex w-full min-w-0 flex-wrap gap-x-4 gap-y-1'>
      {rates.map(rate => (
        <span key={`${rate.validFrom}-${rate.validTo}-${rate.name}`} className='flex max-w-full min-w-0 items-center gap-1.5'>
          <span
            className='inline-block rounded-full'
            style={{ width: 8, height: 8, backgroundColor: RATE_TONES[toneOf(rate, 0)].text }}
          />
          <Typography variant='caption' color='text.secondary' className='min-w-0 whitespace-normal'>
            {rate.name}
          </Typography>
        </span>
      ))}
    </div>
  )
}
