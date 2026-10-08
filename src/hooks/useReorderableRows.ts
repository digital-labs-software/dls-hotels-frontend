'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { animations } from '@formkit/drag-and-drop'
import { useDragAndDrop } from '@formkit/drag-and-drop/react'

type Orderable = { uuid: string; displayOrder: number }

type Options<T extends Orderable> = {
  initialRows?: T[]

  /** Guarda el orden completo en el servidor (todos los uuid, el primero queda en 1). */
  save: (uuids: string[]) => Promise<unknown>

  /** Se llama si el servidor rechaza el orden: avisar y recargar la lista. */
  onError: (error: unknown) => void

  /** Mientras se busca, las filas ocultas no permiten un orden fiable. */
  disabled?: boolean
}

/** Clase del ícono por el que se arrastra la fila; arrastrar desde otra parte no mueve nada y deja hacer scroll. */
export const ROW_DRAG_HANDLE_CLASS = 'row-drag-handle'

/** Clase de las filas que se pueden mover; las filas de "sin resultados" no la llevan. */
export const REORDER_ROW_CLASS = 'reorder-row'

const SAVE_DELAY_MS = 500

const renumber = <T extends Orderable>(rows: T[]) =>
  rows.map((row, index) => (row.displayOrder === index + 1 ? row : { ...row, displayOrder: index + 1 }))

const orderOf = (rows: Orderable[]) => rows.map(row => row.uuid).join(',')

/**
 * Lista ordenable por arrastre o con flechas. Cambia el orden en pantalla al instante y lo guarda en una sola
 * petición cuando el usuario deja de mover filas por medio segundo.
 */
export const useReorderableRows = <T extends Orderable>({
  save,
  onError,
  disabled = false,
  initialRows = []
}: Options<T>) => {
  const [saving, setSaving] = useState(false)

  const rowsRef = useRef<T[]>(initialRows)
  const handlersRef = useRef({ save, onError })
  const dragStartOrderRef = useRef('')
  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const versionRef = useRef(0)
  const dragEndRef = useRef<(values: T[]) => void>(() => {})

  const dragConfig = {
    dragHandle: `.${ROW_DRAG_HANDLE_CLASS}`,
    draggable: (el: HTMLElement) => el.classList.contains(REORDER_ROW_CLASS),
    plugins: [animations()],
    disabled,
    onDragstart: (data: { values: unknown[] }) => {
      dragStartOrderRef.current = orderOf(data.values as T[])
    },
    onDragend: (data: { values: unknown[] }) => dragEndRef.current(data.values as T[])
  }

  const [listRef, rows, setRows, updateConfig] = useDragAndDrop<HTMLTableSectionElement, T>(initialRows, dragConfig)

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  useEffect(() => {
    handlersRef.current = { save, onError }
  }, [save, onError])

  useEffect(() => {
    updateConfig(dragConfig)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled])

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (!dirtyRef.current) {
      setSaving(false)

      return
    }

    dirtyRef.current = false

    const version = ++versionRef.current

    try {
      await handlersRef.current.save(rowsRef.current.map(row => row.uuid))
    } catch (error) {
      if (version === versionRef.current) {
        handlersRef.current.onError(error)
      }
    } finally {
      if (version === versionRef.current && !timerRef.current) {
        setSaving(false)
      }
    }
  }, [])

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true
    setSaving(true)

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(flush, SAVE_DELAY_MS)
  }, [flush])

  useEffect(() => {
    dragEndRef.current = values => {
      if (orderOf(values) === dragStartOrderRef.current) {
        return
      }

      setRows(renumber(values))
      scheduleSave()
    }
  }, [scheduleSave, setRows])

  useEffect(
    () => () => {
      if (timerRef.current) {
        flush()
      }
    },
    [flush]
  )

  /** Mueve la fila `index` una posición arriba (-1) o abajo (+1). */
  const moveRow = useCallback(
    (index: number, delta: -1 | 1) => {
      const target = index + delta
      const current = rowsRef.current

      if (disabled || target < 0 || target >= current.length) {
        return
      }

      const next = [...current]

      ;[next[index], next[target]] = [next[target], next[index]]
      rowsRef.current = renumber(next)
      setRows(rowsRef.current)
      scheduleSave()
    },
    [disabled, scheduleSave, setRows]
  )

  /** Reemplaza las filas con datos del servidor (carga inicial, alta, edición o baja). */
  const replaceRows = useCallback(
    (next: T[] | ((prev: T[]) => T[])) => {
      const value = typeof next === 'function' ? next(rowsRef.current) : next

      rowsRef.current = renumber(value)
      setRows(rowsRef.current)
    },
    [setRows]
  )

  return { listRef, rows, setRows: replaceRows, moveRow, saving }
}
