'use client'

import Chip from '@mui/material/Chip'

import { reservationBalanceTone } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'

const BalanceChip = ({ balance, size = 'small' }: { balance: number; size?: 'small' | 'medium' }) => {
  const tone = reservationBalanceTone(balance)

  if (tone === 'paid') {
    return <Chip size={size} color='success' label='Pagada' />
  }

  if (tone === 'due') {
    return <Chip size={size} color='error' label={`Saldo ${formatRoomPrice(balance)}`} />
  }

  return <Chip size={size} color='info' label={`A favor ${formatRoomPrice(Math.abs(balance))}`} />
}

export default BalanceChip
