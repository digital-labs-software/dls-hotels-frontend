'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
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
  getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { Rate } from '@/types/apps/rateTypes'
import { formatRateValidity } from '@/types/apps/rateTypes'
import type { RoomType } from '@/types/apps/roomTypeTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import RateFormDrawer from './RateFormDrawer'
import type { RateDrawerMode } from './RateFormDrawer'
import { deleteRate, getRate, getRatesApiErrorMessage, listRates } from '@/libs/ratesApi'
import { listRoomTypes } from '@/libs/roomTypesApi'
import tableStyles from '@core/styles/table.module.css'

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type RateWithAction = Rate & {
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

const columnHelper = createColumnHelper<RateWithAction>()

const RateListTable = () => {
  const { data: session, status } = useSession()
  const propertyId = session?.user?.propertyId ?? 1

  const [data, setData] = useState<Rate[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<RateDrawerMode>('create')
  const [selectedRate, setSelectedRate] = useState<Rate | null>(null)
  const [rateToDelete, setRateToDelete] = useState<Rate | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [roomTypeFilter, setRoomTypeFilter] = useState<number | ''>('')
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('')

  const fetchRates = useCallback(async () => {
    setLoading(true)

    try {
      const [ratesRes, typesRes] = await Promise.all([
        listRates(propertyId, {
          page: page + 1,
          limit: pageSize,
          roomTypeId: roomTypeFilter === '' ? undefined : roomTypeFilter,
          isActive: activeFilter === '' ? undefined : activeFilter === 'true'
        }),
        listRoomTypes(propertyId, { limit: 100 })
      ])

      setData(ratesRes.data)
      setTotal(ratesRes.meta.total)
      setRoomTypes(typesRes.data)
    } catch (error) {
      toast.error(getRatesApiErrorMessage(error, 'No se pudieron cargar las tarifas.'))
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [activeFilter, page, pageSize, propertyId, roomTypeFilter])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    fetchRates()
  }, [fetchRates, status])

  const openDrawer = async (mode: RateDrawerMode, rate?: Rate) => {
    setDrawerMode(mode)
    setSelectedRate(rate ?? null)
    setDrawerOpen(true)

    if ((mode === 'view' || mode === 'edit') && rate?.uuid) {
      try {
        setSelectedRate(await getRate(propertyId, rate.uuid))
      } catch (error) {
        toast.error(getRatesApiErrorMessage(error, 'No se encontró la tarifa solicitada.'))
        setDrawerOpen(false)
      }
    }
  }

  const handleConfirmDelete = async () => {
    if (!rateToDelete) {
      return
    }

    setDeleting(true)

    try {
      await deleteRate(propertyId, rateToDelete.uuid)
      toast.success('Tarifa eliminada.')
      setRateToDelete(null)
      await fetchRates()
    } catch (error) {
      toast.error(getRatesApiErrorMessage(error, 'No se pudo eliminar la tarifa.'))
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo<ColumnDef<RateWithAction, any>[]>(
    () => [
      columnHelper.accessor('name', {
        header: 'Tarifa',
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
      columnHelper.accessor('roomTypeName', {
        header: 'Tipo',
        cell: ({ row }) => <Typography>{row.original.roomTypeName || `#${row.original.roomTypeId}`}</Typography>
      }),
      columnHelper.accessor('price', {
        header: 'Precio',
        cell: ({ row }) => <Typography>{formatRoomPrice(row.original.price)}</Typography>
      }),
      columnHelper.accessor('validFrom', {
        header: 'Vigencia',
        cell: ({ row }) => (
          <Typography>{formatRateValidity(row.original.validFrom, row.original.validTo)}</Typography>
        )
      }),
      columnHelper.accessor('isActive', {
        header: 'Estado',
        cell: ({ row }) => (
          <Chip
            variant='tonal'
            size='small'
            color={row.original.isActive ? 'success' : 'secondary'}
            label={row.original.isActive ? 'Activa' : 'Inactiva'}
          />
        )
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
            <IconButton size='small' onClick={() => setRateToDelete(row.original)} title='Eliminar'>
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
    enableRowSelection: false,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  return (
    <>
      <Card>
        <CardContent>
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel id='rate-type-filter'>Tipo</InputLabel>
                <Select
                  label='Tipo'
                  labelId='rate-type-filter'
                  value={roomTypeFilter}
                  onChange={e => {
                    setPage(0)
                    setRoomTypeFilter(e.target.value === '' ? '' : Number(e.target.value))
                  }}
                >
                  <MenuItem value=''>Todos</MenuItem>
                  {roomTypes.map(type => (
                    <MenuItem key={type.uuid} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel id='rate-active-filter'>Estado</InputLabel>
                <Select
                  label='Estado'
                  labelId='rate-active-filter'
                  value={activeFilter}
                  onChange={e => {
                    setPage(0)
                    setActiveFilter(e.target.value as '' | 'true' | 'false')
                  }}
                >
                  <MenuItem value=''>Todas</MenuItem>
                  <MenuItem value='true'>Activas</MenuItem>
                  <MenuItem value='false'>Inactivas</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
        <CardContent className='flex justify-between flex-wrap max-sm:flex-col sm:items-center gap-4'>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Buscar tarifa'
            className='max-sm:is-full'
          />
          <div className='flex gap-4 max-sm:flex-col max-sm:is-full'>
            <Button
              variant='outlined'
              className='max-sm:is-full'
              color='secondary'
              startIcon={<i className='ri-refresh-line' />}
              onClick={fetchRates}
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
              Agregar tarifa
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
                        No hay tarifas registradas
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody>
                    {table.getRowModel().rows.map(row => (
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
              rowsPerPageOptions={[10, 20, 50, 100]}
              component='div'
              className='border-bs'
              count={total}
              rowsPerPage={pageSize}
              page={page}
              labelRowsPerPage='Filas:'
              onPageChange={(_, nextPage) => setPage(nextPage)}
              onRowsPerPageChange={e => {
                setPage(0)
                setPageSize(Number(e.target.value))
              }}
            />
          </>
        )}
      </Card>

      <RateFormDrawer
        open={drawerOpen}
        mode={drawerMode}
        propertyId={propertyId}
        rate={selectedRate}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          fetchRates()
        }}
      />

      <Dialog open={Boolean(rateToDelete)} onClose={() => !deleting && setRateToDelete(null)}>
        <DialogTitle>Eliminar tarifa</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar la tarifa {rateToDelete ? `"${rateToDelete.name}"` : ''}? Las reservas que ya la usaron conservan
            su precio. Para dejar de ofrecerla temporalmente, desactívala.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' color='secondary' disabled={deleting} onClick={() => setRateToDelete(null)}>
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

export default RateListTable
