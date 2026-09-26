'use client'

import { useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

import Breadcrumbs from '@mui/material/Breadcrumbs'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { Controller, useForm } from 'react-hook-form'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { Locale } from '@configs/i18n'
import type { Permission, PermissionGroup } from '@/types/apps/staffTypes'
import {
  areAllChecked,
  buildPermissionTree,
  collectGroupPermissionIds,
  collectRowPermissionIds,
  type PermissionGroupNode,
  type PermissionRow
} from '@/libs/permissionMatrix'
import {
  employeesApi,
  getStaffApiErrorMessage,
  permissionGroupsApi,
  permissionsApi,
  rolesApi
} from '@/libs/staffApi'
import { getLocalizedUrl } from '@/utils/i18n'
import PermissionMatrix from '@views/apps/staff/roles/form/PermissionMatrix'

type FormValues = {
  name: string
  description: string
}

type Props = {
  uuid?: string
}

const RoleForm = ({ uuid }: Props) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const { data: session, status: sessionStatus } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const isView = searchParams.get('mode') === 'view'
  const isEdit = Boolean(uuid) && !isView
  const [loading, setLoading] = useState(true)
  const [employeeCount, setEmployeeCount] = useState(0)
  const [groups, setGroups] = useState<PermissionGroup[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      description: ''
    }
  })

  const roleName = watch('name')

  useEffect(() => {
    if (sessionStatus === 'loading') {
      return
    }

    const load = async () => {
      try {
        const [catalogGroups, catalogPermissions, role, employees] = await Promise.all([
          permissionGroupsApi.list(),
          permissionsApi.list(),
          uuid ? rolesApi.get(propertyId, uuid) : Promise.resolve(null),
          employeesApi.list(propertyId)
        ])

        setGroups(catalogGroups)
        setPermissions(catalogPermissions)

        if (role) {
          reset({
            name: role.name,
            description: role.description ?? ''
          })
          setCheckedIds(new Set(role.permissions.map(permission => permission.id)))
          setEmployeeCount(employees.filter(employee => employee.roles.some(item => item.id === role.id)).length)
        } else {
          setCheckedIds(new Set())
          setEmployeeCount(0)
        }
      } catch (error) {
        toast.error(getStaffApiErrorMessage(error, 'No se pudieron cargar los datos del rol.'))
        router.replace(getLocalizedUrl('/apps/staff?tab=roles', locale as Locale))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [locale, propertyId, reset, router, sessionStatus, uuid])

  const tree = useMemo(() => buildPermissionTree(groups, permissions), [groups, permissions])
  const assignedCount = checkedIds.size
  const catalogCount = permissions.length

  const goBack = () => {
    router.push(getLocalizedUrl('/apps/staff?tab=roles', locale as Locale))
  }

  const handleToggle = (permissionId: number, checked: boolean) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      const row = tree.flatMap(group => group.rows).find(item => collectRowPermissionIds(item).includes(permissionId))

      if (checked) {
        next.add(permissionId)

        if (row?.cells.view && permissionId !== row.cells.view.id) {
          next.add(row.cells.view.id)
        }
      } else {
        next.delete(permissionId)

        if (row?.cells.view?.id === permissionId) {
          collectRowPermissionIds(row).forEach(id => next.delete(id))
        }
      }

      return next
    })
  }

  const handleToggleRow = (row: PermissionRow) => {
    const ids = collectRowPermissionIds(row)

    setCheckedIds(prev => {
      const next = new Set(prev)
      const shouldCheck = !areAllChecked(ids, prev)

      ids.forEach(id => {
        if (shouldCheck) {
          next.add(id)
        } else {
          next.delete(id)
        }
      })

      return next
    })
  }

  const handleToggleGroup = (group: PermissionGroupNode, checkAll: boolean) => {
    const ids = collectGroupPermissionIds(group)

    setCheckedIds(prev => {
      const next = new Set(prev)

      ids.forEach(id => {
        if (checkAll) {
          next.add(id)
        } else {
          next.delete(id)
        }
      })

      return next
    })
  }

  const onSubmit = async (data: FormValues) => {
    if (isView) {
      return
    }

    const permissionIds = [...checkedIds]

    try {
      if (isEdit && uuid) {
        await rolesApi.update(propertyId, uuid, {
          name: data.name.trim(),
          description: data.description.trim() || null,
          permissionIds
        })
        toast.success('Rol actualizado.')
      } else {
        await rolesApi.create(propertyId, {
          name: data.name.trim(),
          description: data.description.trim() || null,
          permissionIds
        })
        toast.success('Rol creado.')
      }

      goBack()
    } catch (error) {
      toast.error(getStaffApiErrorMessage(error, 'No se pudo guardar el rol.'))
    }
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center p-10'>
        <CircularProgress size={32} />
      </div>
    )
  }

  const title = isEdit || isView ? roleName.trim() || 'Rol' : 'Nuevo rol'

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Breadcrumbs className='mbe-3'>
            <Typography
              component={Link}
              href={getLocalizedUrl('/apps/staff', locale as Locale)}
              color='text.primary'
              className='hover:text-primary'
            >
              Personal
            </Typography>
            <Typography
              component={Link}
              href={getLocalizedUrl('/apps/staff?tab=roles', locale as Locale)}
              color='text.primary'
              className='hover:text-primary'
            >
              Roles y permisos
            </Typography>
            <Typography color='text.primary'>{title}</Typography>
          </Breadcrumbs>
          <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-6'>
            <div>
              <Typography variant='h4' className='mbe-1'>
                {title}
              </Typography>
              <Typography>
                {uuid
                  ? `${employeeCount} empleado${employeeCount === 1 ? '' : 's'} con este rol`
                  : 'Crea un rol y marca los permisos que podrá usar'}
              </Typography>
            </div>
            <div className='flex flex-wrap max-sm:flex-col gap-4'>
              <Button variant='outlined' color='secondary' type='button' onClick={goBack}>
                Cancelar
              </Button>
              {!isView ? (
                <Button variant='contained' type='submit' disabled={isSubmitting}>
                  {isSubmitting ? <CircularProgress size={20} color='inherit' /> : 'Guardar'}
                </Button>
              ) : null}
            </div>
          </div>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent className='flex flex-col gap-6'>
              <Grid container spacing={5}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Controller
                    name='name'
                    control={control}
                    rules={{
                      required: 'El nombre es obligatorio.',
                      maxLength: { value: 100, message: 'Máximo 100 caracteres.' }
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Nombre del rol'
                        placeholder='Recepcionista'
                        disabled={isView || isSubmitting}
                        {...(errors.name && { error: true, helperText: errors.name.message })}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Controller
                    name='description'
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='Descripción'
                        placeholder='Check-in, reservas y huéspedes'
                        disabled={isView || isSubmitting}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <div className='flex flex-wrap items-center justify-between gap-2'>
                <Typography variant='h6'>Permisos</Typography>
                <Typography color='text.secondary'>
                  {assignedCount} de {catalogCount} permisos asignados
                </Typography>
              </div>

              <PermissionMatrix
                groups={tree}
                checkedIds={checkedIds}
                disabled={isView || isSubmitting}
                onToggle={handleToggle}
                onToggleRow={handleToggleRow}
                onToggleGroup={handleToggleGroup}
              />

              <Typography variant='caption' color='text.secondary'>
                Clic en el permiso marca toda su fila. Sin Ver, el resto se desactiva.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </form>
  )
}

export default RoleForm
