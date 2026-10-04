'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { lookupDocument } from '@/libs/documentLookupApi'
import type { LookupKind, LookupResultFor, LookupStatus } from '@/types/apps/documentLookupTypes'
import { LOOKUP_LENGTH } from '@/types/apps/documentLookupTypes'

const SOURCE: Record<LookupKind, string> = { DNI: 'RENIEC', RUC: 'SUNAT' }

export const isCompleteDocument = (kind: LookupKind, value: string) =>
  new RegExp(`^\\d{${LOOKUP_LENGTH[kind]}}$`).test(value.trim())

/**
 * Autocompletado por DNI/RUC. Llamar a lookup() desde el onChange del número: consulta solo
 * cuando el número está completo y cambió, así no se dispara al cargar un registro existente.
 */
export const useDocumentLookup = <K extends LookupKind>(kind: K, onFound: (data: LookupResultFor<K>) => void) => {
  const [status, setStatus] = useState<LookupStatus>('idle')
  const [message, setMessage] = useState('')
  const lastQueried = useRef('')
  const controller = useRef<AbortController | null>(null)
  const onFoundRef = useRef(onFound)

  onFoundRef.current = onFound

  const reset = useCallback(() => {
    controller.current?.abort()
    lastQueried.current = ''
    setStatus('idle')
    setMessage('')
  }, [])

  const lookup = useCallback(
    async (raw: string, options: { force?: boolean } = {}) => {
      const number = raw.trim()

      if (!isCompleteDocument(kind, number)) {
        if (lastQueried.current) reset()

        return
      }

      if (!options.force && number === lastQueried.current) return

      controller.current?.abort()
      const current = new AbortController()

      controller.current = current
      lastQueried.current = number
      setStatus('loading')
      setMessage(`Consultando ${SOURCE[kind]}…`)

      try {
        const result = await lookupDocument(kind, number, current.signal)

        if (current.signal.aborted) return

        if (result.found) {
          onFoundRef.current(result)
          setStatus('found')
        } else {
          setStatus(result.reason === 'NOT_FOUND' || result.reason === 'INVALID' ? 'not_found' : 'error')
        }

        setMessage(result.message)
      } catch {
        if (current.signal.aborted) return
        setStatus('error')
        setMessage(`No se pudo consultar ${SOURCE[kind]}. Complete los datos manualmente.`)
      }
    },
    [kind, reset]
  )

  useEffect(() => () => controller.current?.abort(), [])

  return { status, message, lookup, reset }
}

export type DocumentLookupState = ReturnType<typeof useDocumentLookup>
