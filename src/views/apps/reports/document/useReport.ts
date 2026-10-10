'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import { getReportsApiErrorMessage } from '@/libs/reportsApi'

/** Carga un reporte cada vez que cambia `fetcher` (memorizado con useCallback por quien lo usa). */
export const useReport = <T>(fetcher: (propertyId: number) => Promise<T>, errorMessage: string) => {
  const { data: session, status } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current

    setLoading(true)

    try {
      const result = await fetcher(propertyId)

      if (current === requestId.current) {
        setData(result)
      }
    } catch (error) {
      if (current === requestId.current) {
        toast.error(getReportsApiErrorMessage(error, errorMessage))
      }
    } finally {
      if (current === requestId.current) {
        setLoading(false)
      }
    }
  }, [errorMessage, fetcher, propertyId])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    reload()
  }, [reload, status])

  return { data, loading, reload, propertyId }
}
