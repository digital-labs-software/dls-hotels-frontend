'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import type { TextFieldProps } from '@mui/material/TextField'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { Locale } from '@configs/i18n'
import type { Role } from '@/types/apps/staffTypes'
import { employeesApi, getStaffApiErrorMessage, permissionsApi, rolesApi } from '@/libs/staffApi'
import { getLocalizedUrl } from '@/utils/i18n'

type RoleFilter = 'all' | 'withEmployees' | 'withoutEmployees'

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

const RoleListTable = () => {
  const { data: session, status: sessionStatus } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const { lang: locale } = useParams()

  const [roles, setRoles] = useState<Role[]>([])
  const [employeeCountByRoleId, setEmployeeCountByRoleId] = useState<Record<number, number>>({})
  const [catalogCount, setCatalogCount] = useState(0)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<RoleFilter>('all')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)

    try {
      const [nextRoles, employees, permissions] = await Promise.all([
        rolesApi.list(propertyId),
        employeesApi.list(propertyId),
        permissionsApi.list()
      ])

      const counts: Record<number, number> = {}

      employees.forEach(employee => {
        employee.roles.forEach(role => {
          counts[role.id] = (counts[role.id] ?? 0) + 1
        })
      })

      setRoles(nextRoles)
      setEmployeeCountByRoleId(counts)
      setCatalogCount(permissions.length)
    } catch (error) {
      toast.error(getStaffApiErrorMessage(error, 'No se pudieron cargar los roles.'))
      setRoles([])
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

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase()

    return roles.filter(role => {
      const employeeCount = employeeCountByRoleId[role.id] ?? 0
      const matchesFilter =
        filter === 'all' ||
        (filter === 'withEmployees' && employeeCount > 0) ||
        (filter === 'withoutEmployees' && employeeCount === 0)
      const matchesSearch =
        !query ||
        role.name.toLowerCase().includes(query) ||
        (role.description ?? '').toLowerCase().includes(query)

      return matchesFilter && matchesSearch
    })
  }, [employeeCountByRoleId, filter, roles, search])

  return (
    <Card>
      <div className='flex justify-between flex-col items-start sm:flex-row sm:items-center gap-y-4 p-5'>
        <DebouncedInput
          value={search}
          onChange={value => setSearch(String(value))}
          placeholder='Buscar...'
          className='max-sm:is-full'
        />
        <div className='flex items-center max-sm:flex-col gap-4 max-sm:is-full is-auto'>
          <FormControl size='small' className='min-is-[140px] max-sm:is-full'>
            <Select value={filter} onChange={event => setFilter(event.target.value as RoleFilter)}>
              <MenuItem value='all'>Todos</MenuItem>
              <MenuItem value='withEmployees'>Con empleados</MenuItem>
              <MenuItem value='withoutEmployees'>Sin empleados</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant='contained'
            component={Link}
            href={getLocalizedUrl('/apps/staff/roles/add', locale as Locale)}
            startIcon={<i className='ri-add-line' />}
            className='max-sm:is-full is-auto'
          >
            Nuevo rol
          </Button>
        </div>
      </div>
      <Divider />

      {loading ? (
        <div className='flex justify-center items-center p-10'>
          <CircularProgress size={32} />
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[640px]'>
            <thead>
              <tr>
                <th className='px-5 py-3 text-start'>
                  <Typography variant='caption' className='font-medium uppercase tracking-wide text-textSecondary'>
                    Rol
                  </Typography>
                </th>
                <th className='px-5 py-3 text-start'>
                  <Typography variant='caption' className='font-medium uppercase tracking-wide text-textSecondary'>
                    Permisos
                  </Typography>
                </th>
                <th className='px-5 py-3 text-start'>
                  <Typography variant='caption' className='font-medium uppercase tracking-wide text-textSecondary'>
                    Empleados
                  </Typography>
                </th>
                <th className='px-5 py-3' />
              </tr>
            </thead>
            <tbody>
              {filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={4} className='px-5 py-8 text-center'>
                    <Typography color='text.secondary'>No hay roles registrados</Typography>
                  </td>
                </tr>
              ) : (
                filteredRoles.map(role => {
                  const assigned = role.permissions.length
                  const employeeCount = employeeCountByRoleId[role.id] ?? 0
                  const href = getLocalizedUrl(`/apps/staff/roles/edit/${role.uuid}`, locale as Locale)

                  return (
                    <tr key={role.uuid} className='border-bs'>
                      <td className='px-5 py-4'>
                        <Typography
                          component={Link}
                          href={href}
                          color='text.primary'
                          className='font-medium hover:text-primary'
                        >
                          {role.name}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {role.description || 'Sin descripción'}
                        </Typography>
                      </td>
                      <td className='px-5 py-4'>
                        <Typography>
                          {assigned} de {catalogCount}
                        </Typography>
                      </td>
                      <td className='px-5 py-4'>
                        <Typography>{employeeCount}</Typography>
                      </td>
                      <td className='px-5 py-4 text-end'>
                        <Button component={Link} href={href} size='small'>
                          Editar
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

export default RoleListTable
