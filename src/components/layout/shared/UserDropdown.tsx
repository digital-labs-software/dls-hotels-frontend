'use client'

// React Imports
import { useRef, useState } from 'react'
import type { MouseEvent } from 'react'

// Next Imports
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import MenuList from '@mui/material/MenuList'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'

// Third-party Imports
import { useSession } from 'next-auth/react'

// Type Imports
import type { Locale } from '@configs/i18n'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'
import useHotelLogout from '@components/layout/shared/useHotelLogout'

const UserDropdown = () => {
  // States
  const [open, setOpen] = useState(false)

  // Refs
  const anchorRef = useRef<HTMLButtonElement>(null)

  // Hooks
  const router = useRouter()
  const { data: session } = useSession()
  const { me, canViewProfile } = useSubscriptionAccess()
  const { settings } = useSettings()
  const { lang: locale } = useParams()
  const handleUserLogout = useHotelLogout()
  const displayName = me?.name || session?.user?.name || ''
  const displayEmail = me?.email || session?.user?.email || ''
  const displayImage = me?.image || session?.user?.image || ''
  const displayHotel = me?.propertyName || session?.user?.propertyName || ''

  const handleDropdownOpen = () => {
    !open ? setOpen(true) : setOpen(false)
  }

  const handleDropdownClose = (event?: MouseEvent<HTMLLIElement> | (MouseEvent | TouchEvent), url?: string) => {
    if (url) {
      router.push(getLocalizedUrl(url, locale as Locale))
    }

    if (anchorRef.current && anchorRef.current.contains(event?.target as HTMLElement)) {
      return
    }

    setOpen(false)
  }

  return (
    <>
      <IconButton
        ref={anchorRef}
        onClick={handleDropdownOpen}
        aria-label='Abrir el menú de la cuenta'
        aria-expanded={open}
        className='mis-2 cursor-pointer p-1'
      >
        <Avatar alt={displayName} src={displayImage} className='pointer-events-none bs-[38px] is-[38px]' />
      </IconButton>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        className='min-is-[240px] !mbs-4 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top'
            }}
          >
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}>
              <ClickAwayListener onClickAway={e => handleDropdownClose(e as MouseEvent | TouchEvent)}>
                <MenuList>
                  <div className='flex items-center plb-2 pli-4 gap-2' tabIndex={-1}>
                    <Avatar alt={displayName} src={displayImage} />
                    <div className='flex items-start flex-col'>
                      <Typography className='font-medium' color='text.primary'>
                        {displayName}
                      </Typography>
                      <Typography variant='caption'>{displayEmail}</Typography>
                      {displayHotel ? (
                        <Typography variant='caption' color='text.secondary'>
                          {displayHotel}
                        </Typography>
                      ) : null}
                    </div>
                  </div>
                  <Divider className='mlb-1' />
                  {canViewProfile ? (
                    <MenuItem className='gap-3' onClick={e => handleDropdownClose(e, '/apps/profile')}>
                      <i className='ri-user-3-line' />
                      <Typography color='text.primary'>Mi perfil</Typography>
                    </MenuItem>
                  ) : null}
                  {/* Settings, Pricing y FAQ de la plantilla: no se usan en v1 (billing está en Suscripción). */}
                  <div className='flex items-center plb-2 pli-4'>
                    <Button
                      fullWidth
                      variant='contained'
                      color='error'
                      size='small'
                      endIcon={<i className='ri-logout-box-r-line' />}
                      onClick={handleUserLogout}
                      sx={{ '& .MuiButton-endIcon': { marginInlineStart: 1.5 } }}
                    >
                      Cerrar sesión
                    </Button>
                  </div>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default UserDropdown
