'use client'

// React Imports
import { useCallback, useEffect, useRef, useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import type { TextFieldProps } from '@mui/material/TextField'

// Third-party Imports
import { rankItem } from '@tanstack/match-sorter-utils'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

// Type Imports
import type { Floor } from '@/types/apps/floorTypes'
import { numberedFloorName } from '@/types/apps/floorTypes'

// Component Imports
import FloorFormDrawer from './FloorFormDrawer'
import type { FloorDrawerMode } from './FloorFormDrawer'
import { MoveButtons, ReorderHint, RowPosition } from '@/components/reorder/ReorderControls'

// Hook Imports
import { REORDER_ROW_CLASS, useReorderableRows } from '@/hooks/useReorderableRows'

// API Imports
import {
  createFloorSequence,
  deleteFloor,
  getFloor,
  getFloorsApiErrorMessage,
  listFloors,
  reorderFloors
} from '@/libs/floorsApi'

// Util Imports
import { sameCatalogName } from '@/utils/string'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<TextFieldProps, 'onChange'>) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <TextField {...props} value={value} onChange={e => setValue(e.target.value)} size='small' />
}

const FloorListTable = () => {
  const { data: session, status } = useSession()
  const propertyId = session?.user?.propertyId ?? 1

  const [globalFilter, setGlobalFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<FloorDrawerMode>('create')
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null)
  const [floorToDelete, setFloorToDelete] = useState<Floor | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [sequenceOpen, setSequenceOpen] = useState(false)
  const [sequenceCount, setSequenceCount] = useState('3')
  const [creatingSequence, setCreatingSequence] = useState(false)

  const searching = globalFilter.trim() !== ''

  const saveOrder = useCallback((uuids: string[]) => reorderFloors(propertyId, uuids), [propertyId])

  const reloadRef = useRef<() => void>(() => {})

  const handleOrderError = useCallback((error: unknown) => {
    toast.error(getFloorsApiErrorMessage(error, 'No se pudo guardar el orden. Se recargará la lista.'))
    reloadRef.current()
  }, [])

  const {
    listRef,
    rows: data,
    setRows: setData,
    moveRow,
    saving
  } = useReorderableRows<Floor>({ save: saveOrder, onError: handleOrderError, disabled: searching })

  const isVisible = (floor: Floor) => !searching || rankItem(floor.name, globalFilter.trim()).passed
  const visibleCount = data.filter(isVisible).length

  const count = Number(sequenceCount)
  const countValid = Number.isInteger(count) && count >= 1 && count <= 50
  const sequenceNames = countValid ? Array.from({ length: count }, (_, index) => numberedFloorName(index + 1)) : []
  const existingNames = sequenceNames.filter(name => data.some(item => sameCatalogName(item.name, name)))
  const newNames = sequenceNames.filter(name => !existingNames.includes(name))

  const fetchFloors = useCallback(async () => {
    setLoading(true)

    try {
      const page = await listFloors(propertyId, { limit: 100 })

      setData(page.data)
    } catch (error) {
      toast.error(getFloorsApiErrorMessage(error, 'No se pudieron cargar los pisos.'))
      setData([])
    } finally {
      setLoading(false)
    }
  }, [propertyId, setData])

  useEffect(() => {
    reloadRef.current = fetchFloors
  }, [fetchFloors])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    fetchFloors()
  }, [fetchFloors, status])

  const openDrawer = async (mode: FloorDrawerMode, floor?: Floor) => {
    setDrawerMode(mode)
    setSelectedFloor(floor ?? null)
    setDrawerOpen(true)

    if ((mode === 'view' || mode === 'edit') && floor?.uuid) {
      try {
        const latest = await getFloor(propertyId, floor.uuid)

        setSelectedFloor(latest)
      } catch (error) {
        toast.error(getFloorsApiErrorMessage(error, 'No se encontró el piso solicitado.'))
        setDrawerOpen(false)
      }
    }
  }

  const handleConfirmDelete = async () => {
    if (!floorToDelete) {
      return
    }

    setDeleting(true)

    try {
      await deleteFloor(propertyId, floorToDelete.uuid)
      setData(prev => prev.filter(item => item.uuid !== floorToDelete.uuid))
      toast.success('Piso eliminado correctamente.')
      setFloorToDelete(null)
    } catch (error) {
      toast.error(getFloorsApiErrorMessage(error, 'No se pudo eliminar el piso.'))
    } finally {
      setDeleting(false)
    }
  }

  const handleCreateSequence = async () => {
    setCreatingSequence(true)

    try {
      const { created } = await createFloorSequence(propertyId, count)

      toast.success(created.length === 1 ? 'Se creó 1 piso.' : `Se crearon ${created.length} pisos.`)
      setSequenceOpen(false)
      await fetchFloors()
    } catch (error) {
      toast.error(getFloorsApiErrorMessage(error, 'No se pudieron crear los pisos.'))
    } finally {
      setCreatingSequence(false)
    }
  }

  const handleDrawerSuccess = (floor: Floor) => {
    setData(prev =>
      prev.some(item => item.uuid === floor.uuid)
        ? prev.map(item => (item.uuid === floor.uuid ? floor : item))
        : [...prev, floor]
    )
  }

  return (
    <>
      <Card>
        <CardContent className='flex justify-between flex-wrap max-sm:flex-col sm:items-center gap-4'>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Buscar piso'
            className='max-sm:is-full'
          />
          <div className='flex gap-4 max-sm:flex-col max-sm:is-full'>
            <Button
              variant='outlined'
              className='max-sm:is-full'
              color='secondary'
              startIcon={<i className='ri-refresh-line' />}
              onClick={fetchFloors}
              disabled={loading}
            >
              Actualizar
            </Button>
            <Button
              variant='outlined'
              className='max-sm:is-full'
              startIcon={<i className='ri-stack-line' />}
              onClick={() => setSequenceOpen(true)}
              disabled={loading}
            >
              Crear varios pisos
            </Button>
            <Button
              variant='contained'
              color='primary'
              className='max-sm:is-full'
              startIcon={<i className='ri-add-line' />}
              onClick={() => openDrawer('create')}
            >
              Nuevo piso
            </Button>
          </div>
        </CardContent>

        <ReorderHint searching={searching} saving={saving} count={data.length} />

        {loading && data.length === 0 ? (
          <div className='flex justify-center items-center p-10'>
            <CircularProgress size={32} />
          </div>
        ) : null}

        <div className='overflow-x-auto' style={loading && data.length === 0 ? { display: 'none' } : undefined}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th className='is-[110px]'>#</th>
                <th>Piso</th>
                <th className='is-[110px]'>Mover</th>
                <th className='is-[150px]'>Acciones</th>
              </tr>
            </thead>
            <tbody ref={listRef}>
              {data.map((floor, index) => (
                <tr
                  key={floor.uuid}
                  className={REORDER_ROW_CLASS}
                  style={isVisible(floor) ? undefined : { display: 'none' }}
                >
                  <td>
                    <RowPosition position={index + 1} disabled={searching} />
                  </td>
                  <td>
                    <Typography
                      color='text.primary'
                      className='font-medium cursor-pointer hover:text-primary'
                      onClick={() => openDrawer('view', floor)}
                    >
                      {floor.name}
                    </Typography>
                  </td>
                  <td>
                    <MoveButtons index={index} count={data.length} disabled={searching} onMove={moveRow} />
                  </td>
                  <td>
                    <div className='flex items-center'>
                      <IconButton size='small' onClick={() => openDrawer('view', floor)} title='Ver'>
                        <i className='ri-eye-line text-textSecondary' />
                      </IconButton>
                      <IconButton size='small' onClick={() => openDrawer('edit', floor)} title='Editar'>
                        <i className='ri-edit-box-line text-textSecondary' />
                      </IconButton>
                      <IconButton size='small' onClick={() => setFloorToDelete(floor)} title='Eliminar'>
                        <i className='ri-delete-bin-7-line text-textSecondary' />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleCount === 0 ? (
                <tr>
                  <td colSpan={4} className='text-center'>
                    {data.length > 0
                      ? 'Ningún piso coincide con la búsqueda.'
                      : 'No hay pisos registrados. Con «Crear varios pisos» crea Piso 1, Piso 2… de una vez.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <FloorFormDrawer
        open={drawerOpen}
        mode={drawerMode}
        propertyId={propertyId}
        floor={selectedFloor}
        floors={data}
        onClose={() => setDrawerOpen(false)}
        onSuccess={handleDrawerSuccess}
      />

      <Dialog
        open={sequenceOpen}
        onClose={() => !creatingSequence && setSequenceOpen(false)}
        fullWidth
        maxWidth='xs'
      >
        <DialogTitle>Crear varios pisos</DialogTitle>
        <DialogContent className='flex flex-col gap-4'>
          <Typography>
            Crea Piso 1, Piso 2… de una vez. Después puede agregar Planta baja, Sótano u otros con «Nuevo piso».
          </Typography>
          <TextField
            fullWidth
            autoFocus
            type='number'
            label='¿Cuántos pisos?'
            value={sequenceCount}
            disabled={creatingSequence}
            onChange={e => setSequenceCount(e.target.value)}
            slotProps={{ htmlInput: { min: 1, max: 50, step: 1 } }}
            error={!countValid}
            helperText={countValid ? 'Por ejemplo: 3 crea Piso 1, Piso 2 y Piso 3.' : 'Entre 1 y 50 pisos.'}
          />
          {newNames.length > 0 ? (
            <Typography variant='body2' color='text.primary'>
              Se crearán: {newNames.join(', ')}.
            </Typography>
          ) : null}
          {existingNames.length > 0 ? (
            <Typography variant='body2' color='text.secondary'>
              Ya existen y no se repiten: {existingNames.join(', ')}.
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            color='secondary'
            disabled={creatingSequence}
            onClick={() => setSequenceOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            variant='contained'
            disabled={creatingSequence || newNames.length === 0}
            onClick={handleCreateSequence}
          >
            {creatingSequence ? <CircularProgress size={20} color='inherit' /> : 'Crear pisos'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(floorToDelete)} onClose={() => !deleting && setFloorToDelete(null)}>
        <DialogTitle>Eliminar piso</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar el piso {floorToDelete ? `"${floorToDelete.name}"` : ''}? Dejará de aparecer en el listado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' color='secondary' disabled={deleting} onClick={() => setFloorToDelete(null)}>
            Cancelar
          </Button>
          <Button variant='contained' color='error' disabled={deleting} onClick={handleConfirmDelete}>
            {deleting ? <CircularProgress size={20} color='inherit' /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default FloorListTable
