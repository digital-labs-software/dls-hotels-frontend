'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import type { TextFieldProps } from '@mui/material/TextField'

import classnames from 'classnames'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { ThemeColor } from '@core/types'
import type { Locale } from '@configs/i18n'
import type { Floor } from '@/types/apps/floorTypes'
import type { RoomType } from '@/types/apps/roomTypeTypes'
import type { Room, RoomStatus } from '@/types/apps/roomsTypes'
import { ROOM_STATUS_LABELS } from '@/types/apps/roomsTypes'
import TableFilters from './TableFilters'
import { listFloors } from '@/libs/floorsApi'
import { listRoomTypes } from '@/libs/roomTypesApi'
import { deleteRoom, getRoomsApiErrorMessage, listRooms } from '@/libs/roomsApi'
import { getLocalizedUrl } from '@/utils/i18n'
import tableStyles from '@core/styles/table.module.css'

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type RoomWithAction = Room & {
  action?: string
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)

  addMeta({ itemRank })

  return itemRank.passed
}

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

const statusColor: Record<RoomStatus, ThemeColor> = {
  AVAILABLE: 'success',
  RESERVED: 'warning',
  OCCUPIED: 'error',
  CLEANING: 'info',
  MAINTENANCE: 'secondary'
}

const columnHelper = createColumnHelper<RoomWithAction>()

const RoomListTable = () => {
  const { data: session, status: sessionStatus } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const { lang: locale } = useParams()

  const [rooms, setRooms] = useState<Room[]>([])
  const [filteredData, setFilteredData] = useState<Room[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    try {
      const [roomsRes, floorsRes, typesRes] = await Promise.all([listRooms(), listFloors(), listRoomTypes()])

      const nextRooms = roomsRes.filter(room => room.propertyId === propertyId)
      const nextFloors = floorsRes.filter(floor => floor.propertyId === propertyId)
      const nextTypes = typesRes.filter(type => type.propertyId === propertyId)

      setRooms(nextRooms)
      setFilteredData(nextRooms)
      setFloors(nextFloors)
      setRoomTypes(nextTypes)
    } catch (error) {
      toast.error(getRoomsApiErrorMessage(error, 'No se pudieron cargar las habitaciones.'))
      setRooms([])
      setFilteredData([])
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    if (sessionStatus === 'loading') {
      return
    }

    fetchData()
  }, [fetchData, sessionStatus])

  const floorNameById = useMemo(() => {
    const map = new Map<number, string>()

    floors.forEach(floor => {
      if (typeof floor.id === 'number') {
        map.set(floor.id, floor.name)
      }
    })

    return map
  }, [floors])

  const roomTypeNameById = useMemo(() => {
    const map = new Map<number, string>()

    roomTypes.forEach(type => {
      if (typeof type.id === 'number') {
        map.set(type.id, type.name)
      }
    })

    return map
  }, [roomTypes])

  const handleConfirmDelete = async () => {
    if (!roomToDelete) {
      return
    }

    setDeleting(true)

    try {
      await deleteRoom(roomToDelete.uuid)
      setRooms(prev => prev.filter(item => item.uuid !== roomToDelete.uuid))
      toast.success('Habitación eliminada.')
      setRoomToDelete(null)
    } catch (error) {
      toast.error(getRoomsApiErrorMessage(error, 'No se pudo eliminar la habitación.'))
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo<ColumnDef<RoomWithAction, any>[]>(
    () => [
      columnHelper.accessor('number', {
        header: 'Habitación',
        cell: ({ row }) => (
          <Typography
            component={Link}
            href={getLocalizedUrl(`/apps/rooms/edit/${row.original.uuid}`, locale as Locale)}
            color='text.primary'
            className='font-medium hover:text-primary'
          >
            {row.original.number}
          </Typography>
        )
      }),
      columnHelper.accessor('roomTypeId', {
        header: 'Tipo',
        cell: ({ row }) => (
          <Typography>{roomTypeNameById.get(row.original.roomTypeId) || `#${row.original.roomTypeId}`}</Typography>
        )
      }),
      columnHelper.accessor('floorId', {
        header: 'Nivel',
        cell: ({ row }) => (
          <Typography>{floorNameById.get(row.original.floorId) || `#${row.original.floorId}`}</Typography>
        )
      }),
      columnHelper.accessor('status', {
        header: 'Estado',
        cell: ({ row }) => (
          <Chip
            variant='tonal'
            label={ROOM_STATUS_LABELS[row.original.status]}
            size='small'
            color={statusColor[row.original.status]}
          />
        )
      }),
      columnHelper.accessor('action', {
        header: 'Acciones',
        cell: ({ row }) => (
          <div className='flex items-center'>
            <IconButton
              size='small'
              component={Link}
              href={getLocalizedUrl(`/apps/rooms/edit/${row.original.uuid}?mode=view`, locale as Locale)}
              title='Ver'
            >
              <i className='ri-eye-line text-textSecondary' />
            </IconButton>
            <IconButton
              size='small'
              component={Link}
              href={getLocalizedUrl(`/apps/rooms/edit/${row.original.uuid}`, locale as Locale)}
              title='Editar'
            >
              <i className='ri-edit-box-line text-textSecondary' />
            </IconButton>
            <IconButton size='small' onClick={() => setRoomToDelete(row.original)} title='Eliminar'>
              <i className='ri-delete-bin-7-line text-textSecondary' />
            </IconButton>
          </div>
        ),
        enableSorting: false
      })
    ],
    [floorNameById, locale, roomTypeNameById]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      globalFilter
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    },
    enableRowSelection: false,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues()
  })

  return (
    <>
      <Card>
        <CardHeader title='Filtros' className='pbe-4' />
        <TableFilters setData={setFilteredData} rooms={rooms} floors={floors} roomTypes={roomTypes} />
        <Divider />
        <div className='flex justify-between flex-col items-start sm:flex-row sm:items-center gap-y-4 p-5'>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Buscar habitación'
            className='max-sm:is-full'
          />
          <div className='flex items-center max-sm:flex-col gap-4 max-sm:is-full is-auto'>
            <Button
              color='secondary'
              variant='outlined'
              className='max-sm:is-full is-auto'
              startIcon={<i className='ri-refresh-line' />}
              onClick={fetchData}
              disabled={loading}
            >
              Actualizar
            </Button>
            <Button
              variant='contained'
              component={Link}
              href={getLocalizedUrl('/apps/rooms/add', locale as Locale)}
              startIcon={<i className='ri-add-line' />}
              className='max-sm:is-full is-auto'
            >
              Agregar habitación
            </Button>
          </div>
        </div>

        {loading ? (
          <div className='flex justify-center items-center p-10'>
            <CircularProgress size={32} />
          </div>
        ) : (
          <>
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id}>
                          {header.isPlaceholder ? null : (
                            <div
                              className={classnames({
                                'flex items-center': header.column.getIsSorted(),
                                'cursor-pointer select-none': header.column.getCanSort()
                              })}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {{
                                asc: <i className='ri-arrow-up-s-line text-xl' />,
                                desc: <i className='ri-arrow-down-s-line text-xl' />
                              }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                {table.getFilteredRowModel().rows.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                        No hay habitaciones registradas
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody>
                    {table
                      .getRowModel()
                      .rows.slice(0, table.getState().pagination.pageSize)
                      .map(row => (
                        <tr key={row.id}>
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                )}
              </table>
            </div>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component='div'
              className='border-bs'
              count={table.getFilteredRowModel().rows.length}
              rowsPerPage={table.getState().pagination.pageSize}
              page={table.getState().pagination.pageIndex}
              labelRowsPerPage='Filas:'
              onPageChange={(_, page) => {
                table.setPageIndex(page)
              }}
              onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
            />
          </>
        )}
      </Card>

      <Dialog open={Boolean(roomToDelete)} onClose={() => !deleting && setRoomToDelete(null)}>
        <DialogTitle>Eliminar habitación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar la habitación {roomToDelete ? `"${roomToDelete.number}"` : ''}? Dejará de aparecer en el listado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' color='secondary' disabled={deleting} onClick={() => setRoomToDelete(null)}>
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

export default RoomListTable
