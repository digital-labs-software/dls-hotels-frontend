// Third-party Imports
import styled from '@emotion/styled'

// Type Imports
import type { VerticalNavProps } from '../../components/vertical-menu/VerticalNav'

// Util Imports
import { verticalNavClasses } from '../../utils/menuClasses'

type StyledVerticalNavContainerProps = Pick<VerticalNavProps, 'width' | 'transitionDuration' | 'side'>

const StyledVerticalNavContainer = styled.div<StyledVerticalNavContainerProps>`
  position: relative;
  block-size: 100%;
  inline-size: 100%;
  ${({ side }) =>
    side === 'right'
      ? 'border-inline-start: 1px solid #efefef;'
      : 'border-inline-end: 1px solid #efefef;'}
  .${verticalNavClasses.hovered} &,
  .${verticalNavClasses.expanding} & {
    inline-size: ${({ width }) => `${width}px`};
    ${({ side }) =>
      side === 'right'
        ? `
      position: absolute;
      inset-inline-end: 0;
      inset-block-start: 0;
      block-size: 100%;
    `
        : ''}
  }

  /* Transition */
  transition-property: inline-size, inset-inline-start;
  transition-duration: ${({ transitionDuration }) => `${transitionDuration}ms`};
  transition-timing-function: ease-in-out;
`

export default StyledVerticalNavContainer
