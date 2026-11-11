'use client'

// React Imports
import type { ReactNode } from 'react'

// MUI Imports
import Zoom from '@mui/material/Zoom'
import { styled } from '@mui/material/styles'
import useScrollTrigger from '@mui/material/useScrollTrigger'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

interface ScrollToTopProps {
  className?: string
  children: ReactNode
}

const ScrollToTopStyled = styled('div', {
  shouldForwardProp: prop => prop !== 'navOnRight'
})<{ navOnRight?: boolean }>(({ theme, navOnRight }) => ({
  zIndex: 'var(--mui-zIndex-fab)',
  position: 'fixed',
  insetInlineEnd: navOnRight ? 'auto' : theme.spacing(10),
  insetInlineStart: navOnRight ? theme.spacing(10) : 'auto',
  insetBlockEnd: theme.spacing(14)
}))

const ScrollToTop = (props: ScrollToTopProps) => {
  // Props
  const { children, className } = props
  const { settings } = useSettings()
  const navOnRight = settings.navSide === 'right'

  // Hooks
  // init trigger
  const trigger = useScrollTrigger({
    threshold: 400,
    disableHysteresis: true
  })

  const handleClick = () => {
    const anchor = document.querySelector('body')

    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <Zoom in={trigger}>
      <ScrollToTopStyled className={className} navOnRight={navOnRight} onClick={handleClick} role='presentation'>
        {children}
      </ScrollToTopStyled>
    </Zoom>
  )
}

export default ScrollToTop
