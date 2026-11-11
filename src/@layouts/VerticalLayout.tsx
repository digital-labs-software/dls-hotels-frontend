'use client'

// React Imports
import type { ReactNode } from 'react'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import LayoutContent from './components/vertical/LayoutContent'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Util Imports
import { verticalLayoutClasses } from './utils/layoutClasses'

// Styled Component Imports
import StyledContentWrapper from './styles/vertical/StyledContentWrapper'

type VerticalLayoutProps = ChildrenType & {
  navigation?: ReactNode
  navbar?: ReactNode
  footer?: ReactNode
}

const VerticalLayout = (props: VerticalLayoutProps) => {
  // Props
  const { navbar, footer, navigation, children } = props
  const { settings } = useSettings()
  const navOnRight = settings.navSide === 'right'

  return (
    <div className={classnames(verticalLayoutClasses.root, 'flex flex-auto', navOnRight && 'flex-row-reverse')}>
      {navigation || null}
      <StyledContentWrapper
        className={classnames(verticalLayoutClasses.contentWrapper, 'flex flex-col min-is-0 is-full')}
      >
        {navbar || null}
        {/* Content */}
        <LayoutContent>{children}</LayoutContent>
        {footer || null}
      </StyledContentWrapper>
    </div>
  )
}

export default VerticalLayout
