'use client'

// MUI Imports
import MuiTabList from '@mui/lab/TabList'
import useMediaQuery from '@mui/material/useMediaQuery'
import { styled, useTheme } from '@mui/material/styles'
import type { TabListProps } from '@mui/lab/TabList'

// Type Imports
import type { ThemeColor } from '@core/types'

export type CustomTabListProps = TabListProps & {
  color?: ThemeColor
  pill?: 'true' | 'false'
  wrap?: 'true' | 'false'
}

const TabList = styled(MuiTabList, {
  shouldForwardProp: prop =>
    prop !== 'wrap' && prop !== 'pill' && prop !== 'color' && prop !== 'ownerState' && prop !== 'theme' && prop !== 'sx' && prop !== 'as'
})<CustomTabListProps>(({ color, pill, wrap, theme, orientation }) => ({
  ...(pill === 'true' && {
    minHeight: 38,
    ...(orientation === 'vertical'
      ? {
          borderInlineEnd: 0
        }
      : {
          borderBlockEnd: 0
        }),
    '&, & .MuiTabs-scroller': {
      ...(orientation === 'vertical' && {
        boxSizing: 'content-box'
      }),
      margin: `${theme.spacing(-1, -1, -1.5, -1)} !important`,
      padding: theme.spacing(1, 1, 1.5, 1)
    },
    '& .MuiTabs-indicator': {
      display: 'none'
    },
    '& .MuiTabs-flexContainer': {
      gap: theme.spacing(1)
    },
    '& .Mui-selected': {
      backgroundColor: `var(--mui-palette-${color}-main) !important`,
      color: `var(--mui-palette-${color}-contrastText) !important`,
      boxShadow: 'var(--mui-customShadows-xs)'
    },
    '& .MuiTab-root': {
      minHeight: 38,
      padding: theme.spacing(2, 5.5),
      borderRadius: 'var(--mui-shape-borderRadius)',
      '&:hover': {
        border: 0,
        backgroundColor: `var(--mui-palette-${color}-lightOpacity)`,
        color: `var(--mui-palette-${color}-main)`,
        ...(orientation === 'vertical'
          ? {
              paddingInlineEnd: theme.spacing(5.5)
            }
          : {
              paddingBlockEnd: theme.spacing(2)
            })
      }
    }
  }),
  ...(wrap === 'true' && {
    [theme.breakpoints.down('md')]: {
      minHeight: 'unset',
      overflow: 'visible',
      '& .MuiTabs-scroller': {
        overflow: 'visible !important'
      },
      '& .MuiTabs-flexContainer': {
        flexWrap: 'wrap'
      },
      '& .MuiTab-root': {
        flex: '1 1 calc(50% - 4px)',
        maxWidth: 'calc(50% - 4px)',
        minWidth: 0,
        height: 'auto',
        whiteSpace: 'normal',
        paddingInline: theme.spacing(3),
        textAlign: 'center'
      }
    }
  })
}))

const CustomTabList = (props: CustomTabListProps) => {
  const { color = 'primary', wrap, variant, ...rest } = props
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const resolvedVariant = wrap === 'true' && isMobile ? 'standard' : variant

  return <TabList color={color} wrap={wrap} variant={resolvedVariant} {...rest} />
}

export default CustomTabList
