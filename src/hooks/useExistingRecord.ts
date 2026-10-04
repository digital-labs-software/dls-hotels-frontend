'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Avisa si el documento ya está registrado en el hotel antes de crear un duplicado.
 * check() resuelve el registro existente o null; resuelve undefined si otra consulta más
 * reciente lo reemplazó, y en ese caso el llamador no debe hacer nada.
 */
export const useExistingRecord = <Q, T>(find: (query: Q) => Promise<T | null>) => {
  const [record, setRecord] = useState<T | null>(null)
  const [checking, setChecking] = useState(false)
  const requestId = useRef(0)
  const findRef = useRef(find)

  findRef.current = find

  const clear = useCallback(() => {
    requestId.current += 1
    setRecord(null)
    setChecking(false)
  }, [])

  const check = useCallback(async (query: Q): Promise<T | null | undefined> => {
    const id = ++requestId.current

    setChecking(true)

    try {
      const found = await findRef.current(query)

      if (id !== requestId.current) return undefined
      setRecord(found)

      return found
    } catch {
      if (id !== requestId.current) return undefined
      setRecord(null)

      return null
    } finally {
      if (id === requestId.current) setChecking(false)
    }
  }, [])

  useEffect(
    () => () => {
      requestId.current += 1
    },
    []
  )

  return { record, checking, check, clear }
}
