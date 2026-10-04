'use client'

import type { CSSProperties } from 'react'

import classnames from 'classnames'

import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'
import themeConfig from '@configs/themeConfig'

const Logo = ({ color }: { color?: CSSProperties['color'] }) => {
  const { isHovered, isBreakpointReached } = useVerticalNav()
  const { settings } = useSettings()
  const collapsed = settings.layout === 'collapsed' && !isBreakpointReached && !isHovered

  return (
    <div className='flex items-center justify-center'>
      <div
        className={classnames(
          'flex items-center justify-center rounded-md bg-white',
          collapsed ? 'pli-1 plb-0.5' : 'pli-2 plb-1'
        )}
        style={{ color }}
      >
        <img
          src='/images/logos/dls-hoteles-logo.svg?v=5'
          alt={themeConfig.templateName}
          style={{
            display: 'block',
            width: collapsed ? 40 : 124,
            height: 'auto',
            maxBlockSize: collapsed ? 36 : 68
          }}
        />
      </div>
    </div>
  )
}

export default Logo
