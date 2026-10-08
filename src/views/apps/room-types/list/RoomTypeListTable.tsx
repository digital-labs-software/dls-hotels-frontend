'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Switch from '@mui/material/Switch'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import type { TextFieldProps } from '@mui/material/TextField'

import { rankItem } from '@tanstack/match-sorter-utils'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { RoomType } from '@/types/apps/roomTypeTypes'
import { capacityLabel } from '@/types/apps/roomTypeTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import RoomTypeFormDrawer from './RoomTypeFormDrawer'
import type { RoomTypeDrawerMode } from './RoomTypeFormDrawer'
import { MoveButtons, ReorderHint, RowPosition } from '@/components/reorder/ReorderControls'
import { REORDER_ROW_CLASS, useReorderableRows } from '@/hooks/useReorderableRows'
import {
  deleteRoomType,
  getRoomType,
  getRoomTypesApiErrorMessage,
  listRoomTypes,
  reorderRoomTypes,
  updateRoomType
} from '@/libs/roomTypesApi'
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

const RoomTypeListTable = () => {
  const { data: session, status } = useSession()
  const propertyId = session?.user?.propertyId ?? 1

  const [globalFilter, setGlobalFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<RoomTypeDrawerMode>('create')
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null)
  const [roomTypeToDelete, setRoomTypeToDelete] = useState<RoomType | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pendingUuid, setPendingUuid] = useState<string | null>(null)

  const searching = globalFilter.trim() !== ''

  const saveOrder = useCallback((uuids: string[]) => reorderRoomTypes(propertyId, uuids), [propertyId])

  const reloadRef = useRef<() => void>(() => {})

  const handleOrderError = useCallback((error: unknown) => {
    toast.error(getRoomTypesApiErrorMessage(error, 'No se pudo guardar el orden. Se recargará la lista.'))
    reloadRef.current()
  }, [])

  const {
    listRef,
    rows: data,
    setRows: setData,
    moveRow,
    saving
  } = useReorderableRows<RoomType>({ save: saveOrder, onError: handleOrderError, disabled: searching })

  const isVisible = (roomType: RoomType) => {
    const search = globalFilter.trim()

    return !search || rankItem(roomType.name, search).passed || rankItem(roomType.code, search).passed
  }

  const visibleCount = data.filter(isVisible).length

  const fetchRoomTypes = useCallback(async () => {
    setLoading(true)

    try {
      const page = await listRoomTypes(propertyId, { limit: 100 })

      setData(page.data)
    } catch (error) {
      toast.error(getRoomTypesApiErrorMessage(error, 'No se pudieron cargar los tipos de habitación.'))
      setData([])
    } finally {
      setLoading(false)
    }
  }, [propertyId, setData])

  useEffect(() => {
    reloadRef.current = fetchRoomTypes
  }, [fetchRoomTypes])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    fetchRoomTypes()
  }, [fetchRoomTypes, status])

  const openDrawer = async (mode: RoomTypeDrawerMode, roomType?: RoomType) => {
    setDrawerMode(mode)
    setSelectedRoomType(roomType ?? null)
    setDrawerOpen(true)

    if ((mode === 'view' || mode === 'edit') && roomType?.uuid) {
      try {
        const latest = await getRoomType(propertyId, roomType.uuid)

        setSelectedRoomType(latest)
      } catch (error) {
        toast.error(getRoomTypesApiErrorMessage(error, 'No se encontró el tipo de habitación solicitado.'))
        setDrawerOpen(false)
      }
    }
  }

  const handleToggleActive = async (roomType: RoomType, isActive: boolean) => {
    setPendingUuid(roomType.uuid)
    setData(prev => prev.map(item => (item.uuid === roomType.uuid ? { ...item, isActive } : item)))

    try {
      const updated = await updateRoomType(propertyId, roomType.uuid, { isActive })

      setData(prev => prev.map(item => (item.uuid === updated.uuid ? updated : item)))
    } catch (error) {
      setData(prev => prev.map(item => (item.uuid === roomType.uuid ? roomType : item)))
      toast.error(getRoomTypesApiErrorMessage(error, 'No se pudo cambiar el estado del tipo de habitación.'))
    } finally {
      setPendingUuid(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!roomTypeToDelete) {
      return
    }

    setDeleting(true)

    try {
      await deleteRoomType(propertyId, roomTypeToDelete.uuid)
      setData(prev => prev.filter(item => item.uuid !== roomTypeToDelete.uuid))
      toast.success('Tipo de habitación eliminado.')
      setRoomTypeToDelete(null)
    } catch (error) {
      toast.error(getRoomTypesApiErrorMessage(error, 'No se pudo eliminar el tipo de habitación.'))
    } finally {
      setDeleting(false)
    }
  }

  const handleDrawerSuccess = (roomType: RoomType) => {
    setData(prev =>
      prev.some(item => item.uuid === roomType.uuid)
        ? prev.map(item => (item.uuid === roomType.uuid ? roomType : item))
        : [...prev, roomType]
    )
  }

  return (
    <>
      <Card>
        <CardContent className='flex justify-between flex-wrap max-sm:flex-col sm:items-center gap-4'>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Buscar tipo'
            className='max-sm:is-full'
          />
          <div className='flex gap-4 max-sm:flex-col max-sm:is-full'>
            <Button
              variant='outlined'
              className='max-sm:is-full'
              color='secondary'
              startIcon={<i className='ri-refresh-line' />}
              onClick={fetchRoomTypes}
              disabled={loading}
            >
              Actualizar
            </Button>
            <Button
              variant='contained'
              color='primary'
              className='max-sm:is-full'
              startIcon={<i className='ri-add-line' />}
              onClick={() => openDrawer('create')}
            >
              Nuevo tipo
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
                <th>Tipo</th>
                <th>Abreviatura</th>
                <th>Precio</th>
                <th>Capacidad</th>
                <th>Estado</th>
                <th className='is-[110px]'>Mover</th>
                <th className='is-[150px]'>Acciones</th>
              </tr>
            </thead>
            <tbody ref={listRef}>
              {data.map((roomType, index) => (
                <tr
                  key={roomType.uuid}
                  className={REORDER_ROW_CLASS}
                  style={isVisible(roomType) ? undefined : { display: 'none' }}
                >
                  <td>
                    <RowPosition position={index + 1} disabled={searching} />
                  </td>
                  <td>
                    <Typography
                      color='text.primary'
                      className='font-medium cursor-pointer hover:text-primary'
                      onClick={() => openDrawer('view', roomType)}
                    >
                      {roomType.name}
                    </Typography>
                  </td>
                  <td>
                    <Chip variant='tonal' size='small' color='primary' label={roomType.code} />
                  </td>
                  <td>
                    <Typography>{formatRoomPrice(roomType.basePrice)}</Typography>
                  </td>
                  <td>
                    <Typography>{capacityLabel(roomType)}</Typography>
                  </td>
                  <td>
                    <FormControlLabel
                      sx={{ m: 0 }}
                      control={
                        <Switch
                          size='small'
                          checked={roomType.isActive}
                          disabled={pendingUuid === roomType.uuid}
                          onChange={(_, checked) => handleToggleActive(roomType, checked)}
                        />
                      }
                      label={roomType.isActive ? 'Activo' : 'Inactivo'}
                      title='Un tipo inactivo no aparece al crear habitaciones ni reservas'
                    />
                  </td>
                  <td>
                    <MoveButtons index={index} count={data.length} disabled={searching} onMove={moveRow} />
                  </td>
                  <td>
                    <div className='flex items-center'>
                      <IconButton size='small' onClick={() => openDrawer('view', roomType)} title='Ver'>
                        <i className='ri-eye-line text-textSecondary' />
                      </IconButton>
                      <IconButton size='small' onClick={() => openDrawer('edit', roomType)} title='Editar'>
                        <i className='ri-edit-box-line text-textSecondary' />
                      </IconButton>
                      <IconButton size='small' onClick={() => setRoomTypeToDelete(roomType)} title='Eliminar'>
                        <i className='ri-delete-bin-7-line text-textSecondary' />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleCount === 0 ? (
                <tr>
                  <td colSpan={8} className='text-center'>
                    {data.length > 0
                      ? 'Ningún tipo coincide con la búsqueda.'
                      : 'No hay tipos de habitación registrados.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <RoomTypeFormDrawer
        open={drawerOpen}
        mode={drawerMode}
        propertyId={propertyId}
        roomType={selectedRoomType}
        roomTypes={data}
        onClose={() => setDrawerOpen(false)}
        onSuccess={handleDrawerSuccess}
      />

      <Dialog open={Boolean(roomTypeToDelete)} onClose={() => !deleting && setRoomTypeToDelete(null)}>
        <DialogTitle>Eliminar tipo de habitación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar el tipo {roomTypeToDelete ? `"${roomTypeToDelete.name}"` : ''}? Dejará de aparecer en el listado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' color='secondary' disabled={deleting} onClick={() => setRoomTypeToDelete(null)}>
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

export default RoomTypeListTable
