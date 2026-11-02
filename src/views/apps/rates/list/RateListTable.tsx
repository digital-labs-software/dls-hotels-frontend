'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useParams, useRouter, useSearchParams } from 'next/navigation'

import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Switch from '@mui/material/Switch'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

import DeleteReasonDialog from '@/components/dialogs/DeleteReasonDialog'
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

import type { Locale } from '@configs/i18n'
import type { HotelRate } from '@/types/apps/rateTypes'
import { formatRateValidity } from '@/types/apps/rateTypes'
import { limaToday } from '@/types/apps/frontDeskTypes'
import { deleteRate, getRate, getRatesApiErrorMessage, listRates, updateRate } from '@/libs/ratesApi'
import RateFormDrawer from './RateFormDrawer'
import type { RateDrawerMode } from './RateFormDrawer'
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

type RateWithAction = HotelRate & {
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const { data: session, status } = useSession()
  const propertyId = session?.user?.propertyId ?? 1

  const [data, setData] = useState<HotelRate[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [rateToDelete, setRateToDelete] = useState<HotelRate | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all')
  const [pendingUuid, setPendingUuid] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<RateDrawerMode>('create')
  const [selectedRate, setSelectedRate] = useState<HotelRate | null>(null)

  const openDrawer = useCallback((mode: RateDrawerMode, rate?: HotelRate | null) => {
    setDrawerMode(mode)
    setSelectedRate(rate ?? null)
    setDrawerOpen(true)
  }, [])

  const fetchRates = useCallback(async () => {
    setLoading(true)

    try {
      const ratesRes = await listRates(propertyId, {
        page: page + 1,
        limit: pageSize,
        isActive: activeFilter === 'all' ? undefined : activeFilter === 'true'
      })

      setData(ratesRes.data)
      setTotal(ratesRes.meta.total)
    } catch (error) {
      toast.error(getRatesApiErrorMessage(error, 'No se pudieron cargar las tarifas.'))
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [activeFilter, page, pageSize, propertyId])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    fetchRates()
  }, [fetchRates, status])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    const nueva = searchParams.get('nueva')
    const uuid = searchParams.get('tarifa')

    if (!nueva && !uuid) {
      return
    }

    if (nueva) {
      openDrawer('create')
    } else if (uuid) {
      const mode = searchParams.get('ver') === '1' ? 'view' : 'edit'

      openDrawer(mode)
      void getRate(propertyId, uuid)
        .then(rate => setSelectedRate(rate))
        .catch(error => {
          toast.error(getRatesApiErrorMessage(error, 'No se pudo abrir la tarifa.'))
          setDrawerOpen(false)
        })
    }

    router.replace(getLocalizedUrl('/apps/rooms?tab=rates', locale as Locale))
  }, [locale, openDrawer, propertyId, router, searchParams, status])

  const handleToggleActive = async (rate: HotelRate, isActive: boolean) => {
    setPendingUuid(rate.uuid)
    setData(prev => prev.map(item => (item.uuid === rate.uuid ? { ...item, isActive } : item)))

    try {
      const updated = await updateRate(propertyId, rate.uuid, { isActive })

      setData(prev => prev.map(item => (item.uuid === updated.uuid ? updated : item)))
    } catch (error) {
      setData(prev => prev.map(item => (item.uuid === rate.uuid ? rate : item)))
      toast.error(getRatesApiErrorMessage(error, 'No se pudo cambiar el estado de la tarifa.'))
    } finally {
      setPendingUuid(null)
    }
  }

  const handleConfirmDelete = async (reason: string) => {
    if (!rateToDelete) {
      return
    }

    setDeleting(true)

    try {
      await deleteRate(propertyId, rateToDelete.uuid, reason)
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
      columnHelper.accessor('validFrom', {
        header: 'Vigencia',
        cell: ({ row }) => {
          const expired = row.original.expired || row.original.validTo < limaToday()

          return (
            <div className='flex items-center gap-2'>
              <Typography>{formatRateValidity(row.original.validFrom, row.original.validTo)}</Typography>
              {expired ? <Chip size='small' color='warning' label='Vencida' /> : null}
            </div>
          )
        }
      }),
      columnHelper.accessor('isActive', {
        header: 'Estado',
        cell: ({ row }) => (
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Switch
                size='small'
                checked={row.original.isActive}
                disabled={pendingUuid === row.original.uuid}
                onChange={(_, checked) => handleToggleActive(row.original, checked)}
              />
            }
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
    [data, openDrawer, pendingUuid]
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
        <div className='flex justify-between flex-col items-start sm:flex-row sm:items-center gap-y-4 p-5'>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Buscar tarifa'
            className='max-sm:is-full'
          />
          <div className='flex items-center max-sm:flex-col gap-4 max-sm:is-full is-auto'>
            <FormControl size='small' className='min-is-[140px] max-sm:is-full'>
              <Select
                value={activeFilter}
                onChange={e => {
                  setPage(0)
                  setActiveFilter(e.target.value as 'all' | 'true' | 'false')
                }}
              >
                <MenuItem value='all'>Todas</MenuItem>
                <MenuItem value='true'>Activas</MenuItem>
                <MenuItem value='false'>Inactivas</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant='contained'
              color='primary'
              className='max-sm:is-full is-auto'
              onClick={() => openDrawer('create')}
              startIcon={<i className='ri-add-line' />}
            >
              Nueva tarifa
            </Button>
          </div>
        </div>
        <Divider />

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
        onSuccess={() => void fetchRates()}
      />
      <DeleteReasonDialog
        open={Boolean(rateToDelete)}
        title='Eliminar tarifa'
        description={`¿Eliminar la tarifa ${rateToDelete ? `"${rateToDelete.name}"` : ''}? Las reservas que ya la usaron conservan su precio. Para dejar de ofrecerla temporalmente, desactívala.`}
        placeholder='Terminó la temporada'
        confirming={deleting}
        onClose={() => setRateToDelete(null)}
        onConfirm={reason => void handleConfirmDelete(reason)}
      />
    </>
  )
}

export default RateListTable
