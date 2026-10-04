'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'

import { useParams, useRouter } from 'next/navigation'

import Badge from '@mui/material/Badge'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Divider from '@mui/material/Divider'
import Fade from '@mui/material/Fade'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

import classnames from 'classnames'
import { useSession } from 'next-auth/react'
import PerfectScrollbar from 'react-perfect-scrollbar'

import CustomAvatar from '@core/components/mui/Avatar'
import themeConfig from '@configs/themeConfig'
import { useSettings } from '@core/hooks/useSettings'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'
import type { Stay } from '@/types/apps/frontDeskTypes'
import { STAY_STATUS_LABELS } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import type { Locale } from '@configs/i18n'
import { getLocalizedUrl } from '@/utils/i18n'
import { getInitials } from '@/utils/getInitials'

const ScrollWrapper = ({ children, hidden }: { children: ReactNode; hidden: boolean }) => {
  if (hidden) {
    return <div className='overflow-x-hidden bs-full'>{children}</div>
  }

  return (
    <PerfectScrollbar className='bs-full' options={{ wheelPropagation: false, suppressScrollX: true }}>
      {children}
    </PerfectScrollbar>
  )
}

const guestsLabel = (stay: Stay) => {
  const adults = stay.adults || 1
  const children = stay.children || 0

  if (children > 0) {
    return `${adults} ad. · ${children} niñ.`
  }

  return `${adults} ${adults === 1 ? 'adulto' : 'adultos'}`
}

const TodayAlertsDropdown = () => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [arrivals, setArrivals] = useState<Stay[]>([])
  const [departures, setDepartures] = useState<Stay[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])

  const anchorRef = useRef<HTMLButtonElement>(null)
  const ref = useRef<HTMLDivElement | null>(null)

  const hidden = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))
  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))
  const { settings } = useSettings()
  const { data: session, status } = useSession()
  const router = useRouter()
  const { lang: locale } = useParams()
  const propertyId = session?.user?.propertyId

  const load = useCallback(async () => {
    if (!propertyId) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const desk = await frontDeskApi.overview(propertyId)

      setArrivals(desk.arrivals || [])
      setDepartures(desk.departures || [])
    } catch (loadError) {
      setError(getFrontDeskApiErrorMessage(loadError, 'No se pudo cargar el movimiento de hoy.'))
      setArrivals([])
      setDepartures([])
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    if (status === 'loading' || !propertyId) {
      return
    }

    void load()
  }, [load, propertyId, status])

  const visibleArrivals = useMemo(
    () => arrivals.filter(stay => !dismissed.includes(stay.reservationRoomUuid)),
    [arrivals, dismissed]
  )
  const visibleDepartures = useMemo(
    () => departures.filter(stay => !dismissed.includes(stay.reservationRoomUuid)),
    [departures, dismissed]
  )

  const pendingArrivals = visibleArrivals.filter(stay => stay.status !== 'CHECKED_IN').length
  const badgeCount = pendingArrivals || visibleDepartures.length

  const goToFrontDesk = () => {
    setOpen(false)
    router.push(getLocalizedUrl('/apps/front-desk', locale as Locale))
  }

  const handleRemove = (event: MouseEvent<HTMLElement>, uuid: string) => {
    event.stopPropagation()
    setDismissed(prev => [...prev, uuid])
  }

  const renderStay = (stay: Stay, kind: 'arrival' | 'departure') => {
    const name = stay.guestName || stay.companyName || stay.reservationCode
    const overdue = kind === 'arrival' ? stay.arrivalOverdue : stay.departureOverdue

    return (
      <div
        key={stay.reservationRoomUuid}
        className='flex plb-3 pli-4 gap-3 cursor-pointer hover:bg-actionHover group border-be'
        onClick={goToFrontDesk}
      >
        <CustomAvatar color={kind === 'arrival' ? 'primary' : 'warning'} skin='light-static'>
          {getInitials(name)}
        </CustomAvatar>
        <div className='flex flex-col flex-auto min-is-0'>
          <Typography className='font-medium mbe-1' color='text.primary'>
            {name}
          </Typography>
          <Typography variant='caption' color='text.secondary' className='mbe-1'>
            Hab. {stay.roomNumber || 's/n'} · {stay.roomTypeName} · {guestsLabel(stay)}
          </Typography>
          <Typography variant='caption' color={overdue ? 'error.main' : 'text.disabled'}>
            {kind === 'arrival' ? 'Llegada' : 'Salida'} · {STAY_STATUS_LABELS[stay.status]}
            {stay.reservationBalance > 0 ? ` · Saldo ${formatRoomPrice(stay.reservationBalance)}` : ''}
            {overdue ? ' · Atrasada' : ''}
          </Typography>
        </div>
        <i
          className='ri-close-line text-xl invisible group-hover:visible text-textSecondary'
          onClick={event => handleRemove(event, stay.reservationRoomUuid)}
        />
      </div>
    )
  }

  return (
    <>
      <Tooltip title='Hoy en recepción'>
        <IconButton ref={anchorRef} onClick={() => setOpen(value => !value)} className='!text-textPrimary' aria-label='Hoy en recepción'>
          <Badge
            color='error'
            className='cursor-pointer'
            badgeContent={badgeCount}
            invisible={badgeCount === 0}
            overlap='circular'
          >
            <i className='ri-notification-2-line' />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        ref={ref}
        anchorEl={anchorRef.current}
        {...(isSmallScreen
          ? {
              className: 'is-full !mbs-4 z-[1] max-bs-[550px] bs-[550px]',
              modifiers: [
                {
                  name: 'preventOverflow',
                  options: { padding: themeConfig.layoutPadding }
                }
              ]
            }
          : { className: 'is-96 !mbs-4 z-[1] max-bs-[550px] bs-[550px]' })}
      >
        {({ TransitionProps, placement }) => (
          <Fade {...TransitionProps} style={{ transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top' }}>
            <Paper className={classnames('bs-full', settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg')}>
              <ClickAwayListener onClickAway={() => setOpen(false)}>
                <div className='bs-full flex flex-col'>
                  <div className='flex items-center justify-between plb-2 pli-4 is-full gap-4'>
                    <Typography variant='h5' className='flex-auto'>
                      Hoy en recepción
                    </Typography>
                    {pendingArrivals > 0 ? (
                      <Chip size='small' variant='tonal' color='primary' label={`${pendingArrivals} llegadas`} />
                    ) : null}
                  </div>
                  <Divider />
                  <ScrollWrapper hidden={hidden}>
                    {loading ? (
                      <div className='flex justify-center items-center p-10'>
                        <CircularProgress size={28} />
                      </div>
                    ) : error ? (
                      <div className='p-6'>
                        <Typography color='text.secondary'>{error}</Typography>
                      </div>
                    ) : visibleArrivals.length === 0 && visibleDepartures.length === 0 ? (
                      <div className='p-6'>
                        <Typography color='text.secondary'>No hay llegadas ni salidas programadas hoy.</Typography>
                      </div>
                    ) : (
                      <>
                        <div className='pli-4 plb-2'>
                          <Typography variant='caption' className='uppercase' color='text.disabled'>
                            Llegadas ({visibleArrivals.length})
                          </Typography>
                        </div>
                        {visibleArrivals.length === 0 ? (
                          <Typography variant='body2' color='text.disabled' className='pli-4 pbe-3'>
                            Nadie llega hoy.
                          </Typography>
                        ) : (
                          visibleArrivals.map(stay => renderStay(stay, 'arrival'))
                        )}
                        <div className='pli-4 plb-2'>
                          <Typography variant='caption' className='uppercase' color='text.disabled'>
                            Salidas ({visibleDepartures.length})
                          </Typography>
                        </div>
                        {visibleDepartures.length === 0 ? (
                          <Typography variant='body2' color='text.disabled' className='pli-4 pbe-3'>
                            Nadie sale hoy.
                          </Typography>
                        ) : (
                          visibleDepartures.map(stay => renderStay(stay, 'departure'))
                        )}
                      </>
                    )}
                  </ScrollWrapper>
                  <Divider />
                  <div className='p-4'>
                    <Button fullWidth variant='contained' size='small' onClick={goToFrontDesk}>
                      Ir a recepción
                    </Button>
                  </div>
                </div>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default TodayAlertsDropdown
