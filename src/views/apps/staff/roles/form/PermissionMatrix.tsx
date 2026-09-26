'use client'

import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Typography from '@mui/material/Typography'

import type { PermissionAction, PermissionGroupNode, PermissionRow } from '@/libs/permissionMatrix'
import {
  PERMISSION_ACTION_LABELS,
  PERMISSION_ACTIONS,
  areAllChecked,
  collectGroupPermissionIds,
  collectRowPermissionIds
} from '@/libs/permissionMatrix'

type Props = {
  groups: PermissionGroupNode[]
  checkedIds: Set<number>
  disabled?: boolean
  onToggle: (permissionId: number, checked: boolean) => void
  onToggleRow: (row: PermissionRow) => void
  onToggleGroup: (group: PermissionGroupNode, checkAll: boolean) => void
}

const PermissionMatrix = ({ groups, checkedIds, disabled, onToggle, onToggleRow, onToggleGroup }: Props) => {
  if (groups.length === 0) {
    return <Typography color='text.secondary'>No hay permisos en el catálogo.</Typography>
  }

  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[640px] border-collapse'>
        <thead>
          <tr>
            <th className='p-3 text-start' />
            {PERMISSION_ACTIONS.map(action => (
              <th key={action} className='p-3 w-[88px] text-center'>
                <Typography variant='caption' className='font-medium uppercase tracking-wide text-textSecondary'>
                  {PERMISSION_ACTION_LABELS[action]}
                </Typography>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(group => {
            const groupIds = collectGroupPermissionIds(group)
            const groupAllChecked = areAllChecked(groupIds, checkedIds)

            return (
              <GroupRows
                key={group.uuid || group.id}
                group={group}
                checkedIds={checkedIds}
                disabled={disabled}
                groupAllChecked={groupAllChecked}
                onToggle={onToggle}
                onToggleRow={onToggleRow}
                onToggleGroup={onToggleGroup}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const GroupRows = ({
  group,
  checkedIds,
  disabled,
  groupAllChecked,
  onToggle,
  onToggleRow,
  onToggleGroup
}: {
  group: PermissionGroupNode
  checkedIds: Set<number>
  disabled?: boolean
  groupAllChecked: boolean
  onToggle: (permissionId: number, checked: boolean) => void
  onToggleRow: (row: PermissionRow) => void
  onToggleGroup: (group: PermissionGroupNode, checkAll: boolean) => void
}) => {
  return (
    <>
      <tr className='bg-actionHover'>
        <td className='px-3 py-2'>
          <Typography variant='body2' className='font-medium uppercase tracking-wide'>
            {group.name}
          </Typography>
        </td>
        <td colSpan={PERMISSION_ACTIONS.length} className='px-3 py-2 text-end'>
          <Button
            size='small'
            color='primary'
            disabled={disabled}
            onClick={() => onToggleGroup(group, !groupAllChecked)}
          >
            {groupAllChecked ? 'quitar todo' : 'marcar todo'}
          </Button>
        </td>
      </tr>
      {group.rows.map(row => (
        <PermissionRowCells
          key={row.key}
          row={row}
          checkedIds={checkedIds}
          disabled={disabled}
          onToggle={onToggle}
          onToggleRow={onToggleRow}
        />
      ))}
    </>
  )
}

const PermissionRowCells = ({
  row,
  checkedIds,
  disabled,
  onToggle,
  onToggleRow
}: {
  row: PermissionRow
  checkedIds: Set<number>
  disabled?: boolean
  onToggle: (permissionId: number, checked: boolean) => void
  onToggleRow: (row: PermissionRow) => void
}) => {
  const viewPermission = row.cells.view
  const viewChecked = viewPermission ? checkedIds.has(viewPermission.id) : true

  return (
    <tr>
      <td className='px-3 py-1.5'>
        <Typography
          component='button'
          type='button'
          color='text.primary'
          className='bg-transparent border-0 p-0 cursor-pointer text-start'
          onClick={() => !disabled && onToggleRow(row)}
        >
          {row.label}
        </Typography>
      </td>
      {PERMISSION_ACTIONS.map(action => (
        <ActionCell
          key={action}
          action={action}
          row={row}
          checkedIds={checkedIds}
          disabled={disabled}
          viewChecked={viewChecked}
          onToggle={onToggle}
        />
      ))}
    </tr>
  )
}

const ActionCell = ({
  action,
  row,
  checkedIds,
  disabled,
  viewChecked,
  onToggle
}: {
  action: PermissionAction
  row: PermissionRow
  checkedIds: Set<number>
  disabled?: boolean
  viewChecked: boolean
  onToggle: (permissionId: number, checked: boolean) => void
}) => {
  const permission = row.cells[action]

  if (!permission) {
    return (
      <td className='px-3 py-1 text-center'>
        <Typography color='text.disabled'>·</Typography>
      </td>
    )
  }

  const lockedByView = action !== 'view' && !viewChecked

  return (
    <td className='px-3 py-1 text-center'>
      <Checkbox
        size='small'
        color='primary'
        checked={checkedIds.has(permission.id) && !lockedByView}
        disabled={disabled || lockedByView}
        onChange={event => onToggle(permission.id, event.target.checked)}
        inputProps={{ 'aria-label': `${PERMISSION_ACTION_LABELS[action]} ${row.label}` }}
      />
    </td>
  )
}

export default PermissionMatrix
