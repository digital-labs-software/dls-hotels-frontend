import type { Permission, PermissionGroup } from '@/types/apps/staffTypes'

export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'] as const

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Eliminar'
}

const ACTION_ALIASES: Record<string, PermissionAction> = {
  view: 'view',
  read: 'view',
  create: 'create',
  add: 'create',
  edit: 'edit',
  update: 'edit',
  delete: 'delete',
  remove: 'delete'
}

export interface PermissionRow {
  key: string
  resource: string
  label: string
  displayOrder: number
  cells: Record<PermissionAction, Permission | null>
}

export interface PermissionGroupNode {
  id: number
  uuid: string
  name: string
  displayOrder: number
  rows: PermissionRow[]
}

const parsePermission = (name: string) => {
  const lastDot = name.lastIndexOf('.')

  if (lastDot <= 0) {
    return { resource: name, action: 'view' as PermissionAction }
  }

  const suffix = name.slice(lastDot + 1).toLowerCase()
  const action = ACTION_ALIASES[suffix]

  if (!action) {
    return { resource: name, action: 'view' as PermissionAction }
  }

  return { resource: name.slice(0, lastDot), action }
}

const emptyCells = (): Record<PermissionAction, Permission | null> => ({
  view: null,
  create: null,
  edit: null,
  delete: null
})

export const buildPermissionTree = (
  groups: PermissionGroup[],
  permissions: Permission[]
): PermissionGroupNode[] => {
  return [...groups]
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
    .map(group => {
      const rowsByResource = new Map<string, PermissionRow>()

      permissions
        .filter(permission => permission.permissionGroupId === group.id)
        .sort((a, b) => a.displayOrder - b.displayOrder || a.displayName.localeCompare(b.displayName))
        .forEach(permission => {
          const { resource, action } = parsePermission(permission.name)
          const current = rowsByResource.get(resource)

          if (!current) {
            rowsByResource.set(resource, {
              key: `${group.id}:${resource}`,
              resource,
              label: permission.displayName,
              displayOrder: permission.displayOrder,
              cells: { ...emptyCells(), [action]: permission }
            })

            return
          }

          current.cells[action] = permission
          current.displayOrder = Math.min(current.displayOrder, permission.displayOrder)

          if (action === 'view' || !current.cells.view) {
            current.label = permission.displayName
          }
        })

      return {
        id: group.id,
        uuid: group.uuid,
        name: group.name,
        displayOrder: group.displayOrder,
        rows: [...rowsByResource.values()].sort(
          (a, b) => a.displayOrder - b.displayOrder || a.label.localeCompare(b.label)
        )
      }
    })
    .filter(group => group.rows.length > 0)
}

export const collectRowPermissionIds = (row: PermissionRow) => {
  return PERMISSION_ACTIONS.map(action => row.cells[action]?.id).filter((id): id is number => typeof id === 'number')
}

export const collectGroupPermissionIds = (group: PermissionGroupNode) => {
  return group.rows.flatMap(collectRowPermissionIds)
}

export const areAllChecked = (ids: number[], checkedIds: Set<number>) => {
  return ids.length > 0 && ids.every(id => checkedIds.has(id))
}
