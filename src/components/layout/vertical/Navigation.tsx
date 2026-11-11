'use client'

// React Imports
import { useEffect, useRef } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// MUI Imports
import { styled, useColorScheme, useTheme } from '@mui/material/styles'
import Tooltip from '@mui/material/Tooltip'

// Type Imports
import type { getDictionary } from '@/utils/getDictionary'
import type { Mode } from '@core/types'
import type { Locale } from '@configs/i18n'

// Component Imports
import VerticalNav, { NavHeader, NavCollapseIcons } from '@menu/vertical-menu'
import VerticalMenu from './VerticalMenu'
import Logo from '@components/layout/shared/Logo'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

// Style Imports
import navigationCustomStyles from '@core/styles/vertical/navigationCustomStyles'

type Props = {
  dictionary: Awaited<ReturnType<typeof getDictionary>>
  mode: Mode
}

// Marco con esquinas redondeadas: la barra izquierda va rellena y la derecha queda vacía.
const SidebarToggleIcon = () => (
  <svg viewBox='0 0 24 24' className='block text-xl' width='1em' height='1em' aria-hidden='true'>
    <path
      fill='currentColor'
      fillRule='evenodd'
      d='M6 2h12a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4zm2.25 1.75H18a2.25 2.25 0 0 1 2.25 2.25v12A2.25 2.25 0 0 1 18 20.25H8.25z'
    />
  </svg>
)

const StyledBoxForShadow = styled('div')(({ theme }) => ({
  top: 60,
  left: -8,
  zIndex: 2,
  opacity: 0,
  position: 'absolute',
  pointerEvents: 'none',
  width: 'calc(100% + 15px)',
  height: theme.mixins.toolbar.minHeight,
  transition: 'opacity .15s ease-in-out',
  background: `linear-gradient(var(--mui-palette-background-default) ${
    theme.direction === 'rtl' ? '95%' : '5%'
  }, rgb(var(--mui-palette-background-defaultChannel) / 0.85) 30%, rgb(var(--mui-palette-background-defaultChannel) / 0.5) 65%, rgb(var(--mui-palette-background-defaultChannel) / 0.3) 75%, transparent)`,
  '&.scrolled': {
    opacity: 1
  }
}))

const Navigation = (props: Props) => {
  // Props
  const { dictionary, mode } = props

  // Hooks
  const verticalNavOptions = useVerticalNav()
  const { updateSettings, settings } = useSettings()
  const { lang: locale } = useParams()
  const { mode: muiMode, systemMode: muiSystemMode } = useColorScheme()
  const theme = useTheme()

  // Refs
  const shadowRef = useRef(null)

  // Vars
  const { isCollapsed, isHovered, collapseVerticalNav, isBreakpointReached } = verticalNavOptions
  const isSemiDark = settings.semiDark

  const currentMode = muiMode === 'system' ? muiSystemMode : muiMode || mode

  const isDark = currentMode === 'dark'
  const showRail = isCollapsed && !isHovered && !isBreakpointReached
  const navOnRight = settings.navSide === 'right'
  const sidebarLabel = isCollapsed ? 'Ampliar barra lateral' : 'Minimizar barra lateral'

  const scrollMenu = (container: any, isPerfectScrollbar: boolean) => {
    container = isBreakpointReached || !isPerfectScrollbar ? container.target : container

    if (shadowRef && container.scrollTop > 0) {
      // @ts-ignore
      if (!shadowRef.current.classList.contains('scrolled')) {
        // @ts-ignore
        shadowRef.current.classList.add('scrolled')
      }
    } else {
      // @ts-ignore
      shadowRef.current.classList.remove('scrolled')
    }
  }

  useEffect(() => {
    if (settings.layout === 'collapsed') {
      collapseVerticalNav(true)
    } else {
      collapseVerticalNav(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.layout])

  return (
    // eslint-disable-next-line lines-around-comment
    // Sidebar Vertical Menu
    <VerticalNav
      customStyles={navigationCustomStyles(verticalNavOptions, theme)}
      collapsedWidth={68}
      side={navOnRight ? 'right' : 'left'}
      backgroundColor='var(--mui-palette-background-default)'
      // eslint-disable-next-line lines-around-comment
      // The following condition adds the data-dark attribute to the VerticalNav component
      // when semiDark is enabled and the mode or systemMode is light
      {...(isSemiDark &&
        !isDark && {
          'data-dark': ''
        })}
    >
      {/* Nav Header including Logo & nav toggle icons  */}
      <NavHeader>
        <div
          className={
            showRail
              ? 'flex is-full items-center justify-center'
              : 'grid is-full grid-cols-[1fr_auto_1fr] items-center'
          }
        >
          {showRail ? null : <span className={navOnRight ? 'order-3' : undefined} />}
          {showRail ? null : (
            <Link
              href={getLocalizedUrl('/', locale as Locale)}
              className={navOnRight ? 'order-2 flex justify-center' : 'flex justify-center'}
            >
              <Logo />
            </Link>
          )}
          <div className={showRail ? 'flex justify-center' : navOnRight ? 'order-1 flex justify-start' : 'flex justify-end'}>
            <Tooltip title={sidebarLabel}>
              <span className={navOnRight ? 'inline-flex scale-x-[-1]' : 'inline-flex'}>
                <NavCollapseIcons
                  lockedIcon={<SidebarToggleIcon />}
                  unlockedIcon={<SidebarToggleIcon />}
                  closeIcon={<i className='ri-close-line text-xl' />}
                  className='text-textSecondary'
                  aria-label={sidebarLabel}
                  onClick={() => updateSettings({ layout: !isCollapsed ? 'collapsed' : 'vertical' })}
                />
              </span>
            </Tooltip>
          </div>
        </div>
      </NavHeader>
      <StyledBoxForShadow ref={shadowRef} />
      <VerticalMenu dictionary={dictionary} scrollMenu={scrollMenu} />
    </VerticalNav>
  )
}

export default Navigation
