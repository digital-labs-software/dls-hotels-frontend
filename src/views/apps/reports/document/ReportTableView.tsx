'use client'

import Typography from '@mui/material/Typography'
import classnames from 'classnames'

import type { CellValue, ColumnKind, ReportDocument, ReportRow, ReportTable, RowTone } from './reportDocument'
import { displayCell, isNumericKind } from './reportDocument'

import tableStyles from '@core/styles/table.module.css'

const ROW_TONE_CLASS: Record<RowTone, string> = {
  warning: 'bg-[var(--mui-palette-warning-lighterOpacity)]',
  error: 'bg-[var(--mui-palette-error-lighterOpacity)]',
  success: 'bg-[var(--mui-palette-success-lighterOpacity)]',
  muted: 'opacity-70'
}

const SECTION_TONE_CLASS: Record<RowTone, string> = {
  warning: 'bg-[var(--mui-palette-warning-lightOpacity)]',
  error: 'bg-[var(--mui-palette-error-lightOpacity)]',
  success: 'bg-[var(--mui-palette-success-lightOpacity)]',
  muted: 'bg-[var(--mui-palette-action-hover)]'
}

export const CheckBoxMark = ({ checked }: { checked?: boolean }) => (
  <span
    aria-hidden
    className='inline-flex items-center justify-center is-[22px] bs-[22px] rounded border-2 border-solid border-[var(--mui-palette-text-secondary)] text-[var(--mui-palette-success-main)]'
  >
    {checked ? <i className='ri-check-line text-base' /> : null}
  </span>
)

const Cell = ({ value, kind, width, bold }: { value: CellValue; kind: ColumnKind; width?: number; bold?: boolean }) => {
  const wide = (width ?? 0) >= 24

  return (
    <td
      align={isNumericKind(kind) ? 'right' : kind === 'check' ? 'center' : undefined}
      className={classnames({ 'whitespace-normal min-is-[200px]': wide, 'font-medium text-textPrimary': bold })}
    >
      {kind === 'check' ? (
        <CheckBoxMark checked={value === true} />
      ) : (
        <span className='whitespace-pre-line'>{displayCell(value, kind)}</span>
      )}
    </td>
  )
}

const BodyRow = ({ table, item }: { table: ReportTable; item: ReportRow }) => {
  if (item.type === 'section') {
    return (
      <tr className={SECTION_TONE_CLASS[item.tone ?? 'muted']}>
        <td colSpan={table.columns.length} className='font-medium text-textPrimary'>
          {item.label}
        </td>
      </tr>
    )
  }

  const isTotal = item.type === 'total'

  return (
    <tr
      className={classnames(
        isTotal ? 'bg-[var(--mui-palette-action-hover)]' : item.tone ? ROW_TONE_CLASS[item.tone] : undefined
      )}
    >
      {table.columns.map((column, index) => (
        <Cell
          key={`${column.header}-${index}`}
          value={item.cells[index]}
          kind={column.kind ?? 'text'}
          width={column.width}
          bold={isTotal}
        />
      ))}
    </tr>
  )
}

const ReportTableView = ({ table }: { table: ReportTable }) => {
  return (
    <div className='flex flex-col gap-2'>
      {table.title ? (
        <Typography variant='h6' className='pli-5 pbs-4'>
          {table.title}
        </Typography>
      ) : null}
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              {table.columns.map((column, index) => (
                <th
                  key={`${column.header}-${index}`}
                  align={isNumericKind(column.kind) ? 'right' : column.kind === 'check' ? 'center' : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.length ? (
              table.rows.map((item, index) => <BodyRow key={index} table={table} item={item} />)
            ) : (
              <tr>
                <td colSpan={table.columns.length} className='text-center'>
                  {table.emptyText ?? 'Sin registros.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const ReportTables = ({ document }: { document: ReportDocument }) => (
  <div className='flex flex-col gap-6 pbe-4'>
    {document.tables.map((table, index) => (
      <ReportTableView key={`${table.title ?? 'table'}-${index}`} table={table} />
    ))}
  </div>
)

export default ReportTableView
