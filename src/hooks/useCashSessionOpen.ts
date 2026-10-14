'use client'

import { useEffect, useState } from 'react'

import { cashApi } from '@/libs/cashApi'

export const CASH_REQUIRED_MESSAGE = 'Abre la caja antes de cobrar.'

/** true si hay caja abierta, false si no, null mientras se consulta. */
export const useCashSessionOpen = (propertyId: number, enabled: boolean) => {
  const [open, setOpen] = useState<boolean | null>(null)

  useEffect(() => {
    if (!enabled || !propertyId) {
      setOpen(null)

      return
    }

    let cancelled = false

    setOpen(null)

    cashApi
      .current(propertyId)
      .then(session => {
        if (!cancelled) {
          setOpen(session != null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOpen(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [enabled, propertyId])

  return open
}
