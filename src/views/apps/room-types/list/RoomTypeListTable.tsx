'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import TablePagination from '@mui/material/TablePagination'
import IconButton from '@mui/material/IconButton'
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

import type { RoomType } from '@/types/apps/roomTypeTypes'
import RoomTypeFormDrawer from './RoomTypeFormDrawer'
import type { RoomTypeDrawerMode } from './RoomTypeFormDrawer'
import {
  deleteRoomType,
  getRoomType,
  getRoomTypesApiErrorMessage,
  listRoomTypes
} from '@/libs/roomTypesApi'
import tableStyles from '@core/styles/table.module.css'

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type RoomTypeWithAction = RoomType & {
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

const columnHelper = createColumnHelper<RoomTypeWithAction>()

const RoomTypeListTable = () => {
  const { data: session, status } = useSession()
  const propertyId = session?.user?.propertyId ?? 1

  const [data, setData] = useState<RoomType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<RoomTypeDrawerMode>('create')
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null)
  const [roomTypeToDelete, setRoomTypeToDelete] = useState<RoomType | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchRoomTypes = useCallback(async () => {
    setLoading(true)

    try {
      const items = await listRoomTypes()
      const filtered = items.filter(item => item.propertyId === propertyId)

      setData(filtered)
    } catch (error) {
      toast.error(getRoomTypesApiErrorMessage(error, 'No se pudieron cargar los tipos de habitación.'))
      setData([])
    } finally {
      setLoading(false)
    }
  }, [propertyId])

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
        const latest = await getRoomType(roomType.uuid)

        setSelectedRoomType(latest)
      } catch (error) {
        toast.error(getRoomTypesApiErrorMessage(error, 'No se encontró el tipo de habitación solicitado.'))
        setDrawerOpen(false)
      }
    }
  }

  const handleConfirmDelete = async () => {
    if (!roomTypeToDelete) {
      return
    }

    setDeleting(true)

    try {
      await deleteRoomType(roomTypeToDelete.uuid)
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
    setData(prev => {
      const exists = prev.some(item => item.uuid === roomType.uuid)

      if (exists) {
        return prev
          .map(item => (item.uuid === roomType.uuid ? roomType : item))
          .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
      }

      return [...prev, roomType].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
    })
  }

  const columns = useMemo<ColumnDef<RoomTypeWithAction, any>[]>(
    () => [
      columnHelper.accessor('name', {
        header: 'Tipo',
        cell: ({ row }) => (
          <Typography
            color='text.primary'
            className='font-medium cursor-pointer hover:text-primary'
            onClick={() => openDrawer('view', row.original)}
          >
            {row.original.name}
          </Typography>
        )
      }),
      columnHelper.accessor('description', {
        header: 'Descripción',
        cell: ({ row }) => (
          <Typography variant='body2' className='max-is-[280px] truncate' title={row.original.description ?? ''}>
            {row.original.description || '—'}
          </Typography>
        )
      }),
      columnHelper.accessor('displayOrder', {
        header: 'Orden',
        cell: ({ row }) => <Typography>{row.original.displayOrder}</Typography>
      }),
      columnHelper.accessor('action', {
        header: 'Acciones',
        cell: ({ row }) => (
          <div className='flex items-center'>
            <IconButton size='small' onClick={() => openDrawer('view', row.original)} title='Ver'>
              <i className='ri-eye-line text-textSecondary' />
            </IconButton>
            <IconButton size='small' onClick={() => openDrawer('edit', row.original)} title='Editar'>
              <i className='ri-edit-box-line text-textSecondary' />
            </IconButton>
            <IconButton size='small' onClick={() => setRoomTypeToDelete(row.original)} title='Eliminar'>
              <i className='ri-delete-bin-7-line text-textSecondary' />
            </IconButton>
          </div>
        ),
        enableSorting: false
      })
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  )

  const table = useReactTable({
    data,
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
              Agregar tipo
            </Button>
          </div>
        </CardContent>

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
                        No hay tipos de habitación registrados
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
              rowsPerPageOptions={[10, 25, 50, 100]}
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

      <RoomTypeFormDrawer
        open={drawerOpen}
        mode={drawerMode}
        propertyId={propertyId}
        roomType={selectedRoomType}
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
