'use client'

import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

export type PayerKind = 'person' | 'company'

type Props = {
  value: PayerKind
  onChange: (kind: PayerKind) => void
  disabled?: boolean
}

const PayerKindToggle = ({ value, onChange, disabled }: Props) => (
  <ToggleButtonGroup
    exclusive
    fullWidth
    size='small'
    color='primary'
    disabled={disabled}
    value={value}
    onChange={(_, next: PayerKind | null) => {
      if (next) onChange(next)
    }}
  >
    <ToggleButton value='person'>Persona</ToggleButton>
    <ToggleButton value='company'>Empresa</ToggleButton>
  </ToggleButtonGroup>
)

export default PayerKindToggle
