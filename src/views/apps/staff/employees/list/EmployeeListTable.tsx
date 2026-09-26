'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import Card from '@mui/material/Card'
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

import type { Locale } from '@configs/i18n'
import { DOCUMENT_TYPE_LABELS } from '@/types/apps/clientsTypes'
import type { Employee } from '@/types/apps/staffTypes'
import { employeesApi, getStaffApiErrorMessage } from '@/libs/staffApi'
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

type EmployeeWithAction = Employee & {
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

const formatDocument = (employee: Employee) => {
  const { documentType, documentNumber } = employee.person

  if (!documentType || !documentNumber) {
    return '—'
  }

  return `${DOCUMENT_TYPE_LABELS[documentType]} ${documentNumber}`
}

const isTerminated = (terminationDate: string | null) => {
  if (!terminationDate) {
    return false
  }

  const today = new Date()

  today.setHours(0, 0, 0, 0)

  const date = new Date(terminationDate)

  date.setHours(0, 0, 0, 0)

  return date <= today
}

const columnHelper = createColumnHelper<EmployeeWithAction>()

const EmployeeListTable = () => {
  const { data: session, status: sessionStatus } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const { lang: locale } = useParams()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    try {
      setEmployees(await employeesApi.list(propertyId))
    } catch (error) {
      toast.error(getStaffApiErrorMessage(error, 'No se pudieron cargar los empleados.'))
      setEmployees([])
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

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) {
      return
    }

    setDeleting(true)

    try {
      await employeesApi.remove(propertyId, employeeToDelete.uuid)
      setEmployees(prev => prev.filter(item => item.uuid !== employeeToDelete.uuid))
      toast.success('Empleado eliminado.')
      setEmployeeToDelete(null)
    } catch (error) {
      toast.error(getStaffApiErrorMessage(error, 'No se pudo eliminar el empleado.'))
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo<ColumnDef<EmployeeWithAction, any>[]>(
    () => [
      columnHelper.accessor(row => `${row.person.lastName}, ${row.person.firstName}`, {
        id: 'fullName',
        header: 'Nombre',
        cell: ({ row }) => (
          <Typography
            component={Link}
            href={getLocalizedUrl(`/apps/staff/employees/edit/${row.original.uuid}`, locale as Locale)}
            color='text.primary'
            className='font-medium hover:text-primary'
          >
            {row.original.person.lastName}, {row.original.person.firstName}
          </Typography>
        )
      }),
      columnHelper.accessor(row => formatDocument(row), {
        id: 'document',
        header: 'Documento',
        cell: ({ row }) => <Typography>{formatDocument(row.original)}</Typography>
      }),
      columnHelper.accessor(row => row.jobTitle ?? '', {
        id: 'jobTitle',
        header: 'Cargo',
        cell: ({ row }) => <Typography>{row.original.jobTitle || 'Sin cargo'}</Typography>
      }),
      columnHelper.accessor(row => row.roles.map(role => role.name).join(', '), {
        id: 'access',
        header: 'Acceso',
        cell: ({ row }) =>
          row.original.roles.length === 0 ? (
            <Typography>—</Typography>
          ) : (
            <div className='flex flex-wrap gap-1'>
              {row.original.roles.map(role => (
                <Chip
                  key={role.uuid}
                  size='small'
                  variant='tonal'
                  color={role.isPrimary ? 'primary' : 'secondary'}
                  label={role.name}
                />
              ))}
            </div>
          )
      }),
      columnHelper.accessor(row => row.user?.email ?? row.person.email ?? '', {
        id: 'email',
        header: 'Correo',
        cell: ({ row }) => <Typography>{row.original.user?.email || row.original.person.email || '—'}</Typography>
      }),
      columnHelper.accessor(row => (isTerminated(row.terminationDate) ? 'Cesado' : 'Activo'), {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const terminated = isTerminated(row.original.terminationDate)

          return <Chip size='small' variant='tonal' color={terminated ? 'error' : 'success'} label={terminated ? 'Cesado' : 'Activo'} />
        }
      }),
      columnHelper.accessor('action', {
        header: 'Acciones',
        cell: ({ row }) => (
          <div className='flex items-center'>
            <IconButton
              size='small'
              component={Link}
              href={getLocalizedUrl(`/apps/staff/employees/edit/${row.original.uuid}?mode=view`, locale as Locale)}
              title='Ver'
            >
              <i className='ri-eye-line text-textSecondary' />
            </IconButton>
            <IconButton
              size='small'
              component={Link}
              href={getLocalizedUrl(`/apps/staff/employees/edit/${row.original.uuid}`, locale as Locale)}
              title='Editar'
            >
              <i className='ri-edit-box-line text-textSecondary' />
            </IconButton>
            <IconButton size='small' onClick={() => setEmployeeToDelete(row.original)} title='Eliminar'>
              <i className='ri-delete-bin-7-line text-textSecondary' />
            </IconButton>
          </div>
        ),
        enableSorting: false
      })
    ],
    [locale]
  )

  const table = useReactTable({
    data: employees,
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
        <div className='flex justify-between flex-col items-start sm:flex-row sm:items-center gap-y-4 p-5'>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Buscar empleado'
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
              href={getLocalizedUrl('/apps/staff/employees/add', locale as Locale)}
              startIcon={<i className='ri-add-line' />}
              className='max-sm:is-full is-auto'
            >
              Nuevo empleado
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
                        No hay empleados registrados
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

      <Dialog open={Boolean(employeeToDelete)} onClose={() => !deleting && setEmployeeToDelete(null)}>
        <DialogTitle>Eliminar empleado</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar a{' '}
            {employeeToDelete ? `"${employeeToDelete.person.lastName}, ${employeeToDelete.person.firstName}"` : ''}?
            Dejará de poder iniciar sesión en este hotel.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' color='secondary' disabled={deleting} onClick={() => setEmployeeToDelete(null)}>
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

export default EmployeeListTable
