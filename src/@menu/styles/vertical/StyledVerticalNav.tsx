// Third-party Imports
import styled from '@emotion/styled'

// Type Imports
import type { VerticalNavState } from '../../contexts/verticalNavContext'
import type { VerticalNavProps } from '../../components/vertical-menu/VerticalNav'

// Util Imports
import { horizontalNavClasses, menuClasses, verticalNavClasses } from '../../utils/menuClasses'

type StyledVerticalNavProps = VerticalNavProps &
  Pick<VerticalNavState, 'isBreakpointReached' | 'collapsing' | 'expanding' | 'transitionDuration'>

const StyledVerticalNav = styled.aside<StyledVerticalNavProps>`
  ${({ scrollWithContent }) =>
    !scrollWithContent &&
    `
    position: sticky;
    inset-block-start: 0;
    block-size: 100dvh;
  `}
  z-index: 9;

  /* Transition */
  transition-property: inline-size, min-inline-size, margin-inline-start, margin-inline-end, inset-inline-start,
    inset-inline-end;
  transition-duration: ${({ transitionDuration }) => `${transitionDuration}ms`};
  transition-timing-function: ease-in-out;

  /* Width & Min Width & Margin */
  inline-size: ${({ width }) => `${width}px`};
  min-inline-size: ${({ width }) => `${width}px`};
  &.${verticalNavClasses.collapsed} {
    inline-size: ${({ collapsedWidth }) => `${collapsedWidth}px`};
    min-inline-size: ${({ collapsedWidth }) => `${collapsedWidth}px`};
  }

  &.${verticalNavClasses.collapsing}, &.${verticalNavClasses.expanding} {
    pointer-events: none;
  }

  /* Collapsed & Toggled */
  ${({ side, width, collapsedWidth }) => {
    const edge = side === 'right' ? 'inset-inline-end' : 'inset-inline-start'
    const opposite = side === 'right' ? 'inset-inline-start' : 'inset-inline-end'

    return `
    &.${verticalNavClasses.breakpointReached} {
      position: fixed;
      block-size: 100%;
      inset-block-start: 0;
      ${opposite}: auto;
      ${edge}: -${width}px;
      z-index: 100;
      margin: 0;
      &.${verticalNavClasses.collapsed} {
        ${edge}: -${collapsedWidth}px;
      }
      &.${verticalNavClasses.toggled} {
        ${edge}: 0;
      }
    }
  `
  }}

  ${({ width, isBreakpointReached, side }) =>
    !isBreakpointReached &&
    `
    &.${verticalNavClasses.toggled} {
      ${side === 'right' ? 'margin-inline-end' : 'margin-inline-start'}: -${width}px;
    }
  `}

  &.${horizontalNavClasses.root} .${menuClasses.root} > ul {
    flex-direction: column;
    align-items: stretch;
  }

  /* User Styles */
  ${({ customStyles }) => customStyles}
`

export default StyledVerticalNav
