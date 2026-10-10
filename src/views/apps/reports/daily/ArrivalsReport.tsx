'use client'

import { Fragment, useCallback, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import classnames from 'classnames'
import { toast } from 'react-toastify'

import { reportsApi } from '@/libs/reportsApi'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'
import { limaToday } from '@/types/apps/frontDeskTypes'
import type { MovementGroup, MovementLine, MovementReport } from '@/types/apps/reportTypes'
import type { ReportColumn, ReportDocument } from '../document/reportDocument'
import { displayCell, formatLongDate, formatMoney, formatShortDate, formatTime, row } from '../document/reportDocument'
import ReportLayout from '../document/ReportLayout'
import { DayFilter } from '../document/ReportFilters'
import { CheckBoxMark } from '../document/ReportTableView'
import { useReport } from '../document/useReport'
import { agencyText, eachMovementRow, groupHeading, paxText } from './movementShared'

import tableStyles from '@core/styles/table.module.css'

const COLUMNS: ReportColumn[] = [
  { header: 'Llegó', kind: 'check', width: 6 },
  { header: 'Hab.', kind: 'write', width: 7 },
  { header: 'Tipo', width: 12 },
  { header: 'Huésped', width: 26 },
  { header: 'Documento', width: 14 },
  { header: 'Pax', width: 7 },
  { header: 'Sale', width: 12 },
  { header: 'Reserva', width: 10 },
  { header: 'Empresa / agencia', width: 24 },
  { header: 'Saldo', kind: 'money', width: 11 },
  { header: 'Hora', kind: 'write', width: 7 },
  { header: 'Observaciones', kind: 'write', width: 24 }
]

const arrivalCells = (group: MovementGroup, line: MovementLine, first: boolean) => [
  line.status === 'CHECKED_IN',
  line.roomNumber ?? '',
  line.roomTypeName,
  line.guestNames ?? group.holderName,
  line.primaryDocument ?? '',
  paxText(line),
  `${formatShortDate(line.checkOutDate)} (${line.nights} n.)`,
  group.reservationCode,
  agencyText(group),
  first && group.balance > 0 ? group.balance : null,
  formatTime(line.actualCheckInAt),
  first ? (group.notes ?? '') : ''
]

export const buildArrivalsDocument = (report: MovementReport): ReportDocument => ({
  fileName: `llegadas-${report.date}`,
  title: 'Llegadas del día',
  hotelName: report.hotelName,
  period: formatLongDate(report.date),
  orientation: 'landscape',
  showShift: true,
  summary: [
    { label: 'Habitaciones', value: String(report.summary.rooms) },
    { label: 'Personas', value: String(report.summary.pax) },
    { label: 'Ya llegaron', value: String(report.summary.done) },
    { label: 'Faltan', value: String(report.summary.pending) },
    { label: 'Sin habitación', value: String(report.summary.unassigned) },
    { label: 'Por cobrar', value: formatMoney(report.summary.balanceDue) }
  ],
  tables: [
    {
      columns: COLUMNS,
      rows: eachMovementRow(report.groups, (group, line, first) =>
        row(arrivalCells(group, line, first), line.status === 'CHECKED_IN' ? 'success' : !line.roomNumber ? 'warning' : undefined)
      ),
      emptyText: 'No hay llegadas para este día.'
    }
  ],
  notes: [
    'Marca la casilla cuando el huésped llegue, anota la hora y la habitación si aún no tiene.',
    'Cobra el saldo al ingreso cuando corresponda y registra el ingreso en el sistema.'
  ],
  signatures: ['Recepcionista']
})

const blockReason = (line: MovementLine, isToday: boolean) => {
  if (line.status === 'CHECKED_IN') return null
  if (!isToday) return 'El ingreso se registra el mismo día de llegada.'
  if (!line.roomNumber) return 'Falta asignar la habitación.'
  if (!line.hasPrimaryGuest) return 'Falta registrar al huésped titular de la habitación.'
  if (line.roomStatus === 'OCCUPIED') return 'La habitación todavía está ocupada.'
  if (line.roomStatus === 'MAINTENANCE') return 'La habitación está en mantenimiento.'

  return null
}

const ArrivalsReport = () => {
  const [date, setDate] = useState(limaToday())
  const fetcher = useCallback((propertyId: number) => reportsApi.arrivals(propertyId, date), [date])
  const { data, loading, reload, propertyId } = useReport(fetcher, 'No se pudieron cargar las llegadas.')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const document = useMemo(() => (data ? buildArrivalsDocument(data) : null), [data])
  const isToday = data?.date === limaToday()

  const eligible = useMemo(() => {
    const map = new Map<string, { group: MovementGroup; line: MovementLine }>()

    data?.groups.forEach(group =>
      group.lines.forEach(line => {
        if (line.status !== 'CHECKED_IN' && !blockReason(line, isToday)) {
          map.set(line.reservationRoomUuid, { group, line })
        }
      })
    )

    return map
  }, [data, isToday])

  const selectedEligible = [...selected].filter(uuid => eligible.has(uuid))

  const toggle = (uuids: string[], checked: boolean) => {
    setSelected(previous => {
      const next = new Set(previous)

      uuids.forEach(uuid => (checked ? next.add(uuid) : next.delete(uuid)))

      return next
    })
  }

  const handleDateChange = (value: string) => {
    setDate(value)
    setSelected(new Set())
    setErrors({})
  }

  const registerSelected = async () => {
    const targets = selectedEligible.map(uuid => eligible.get(uuid)!)
    const nextErrors: Record<string, string> = {}
    let registered = 0

    setProgress({ done: 0, total: targets.length })

    for (const [index, { group, line }] of targets.entries()) {
      try {
        await reservationsApi.checkIn(propertyId, group.reservationUuid, line.reservationRoomUuid)
        registered += 1
      } catch (error) {
        nextErrors[line.reservationRoomUuid] = getReservationsApiErrorMessage(error, 'No se pudo registrar el ingreso.')
      }

      setProgress({ done: index + 1, total: targets.length })
    }

    setProgress(null)
    setErrors(nextErrors)
    setSelected(new Set(Object.keys(nextErrors)))

    if (registered) {
      toast.success(
        registered === 1 ? 'Se registró el ingreso de 1 habitación.' : `Se registró el ingreso de ${registered} habitaciones.`
      )
    }

    const failed = Object.keys(nextErrors).length

    if (failed) {
      toast.warning(
        failed === 1
          ? '1 habitación no se pudo registrar. Revisa el motivo en la lista.'
          : `${failed} habitaciones no se pudieron registrar. Revisa el motivo en la lista.`
      )
    }

    await reload()
  }

  const allEligible = [...eligible.keys()]
  const allChecked = allEligible.length > 0 && allEligible.every(uuid => selected.has(uuid))
  const someChecked = allEligible.some(uuid => selected.has(uuid))

  const lineRow = (group: MovementGroup, line: MovementLine, first: boolean) => {
    const cells = arrivalCells(group, line, first)
    const reason = blockReason(line, isToday)
    const done = line.status === 'CHECKED_IN'
    const canSelect = !done && !reason
    const error = errors[line.reservationRoomUuid]

    return (
      <Fragment key={line.reservationRoomUuid}>
        <tr
          className={classnames({
            'bg-[var(--mui-palette-success-lighterOpacity)]': done,
            'bg-[var(--mui-palette-warning-lighterOpacity)]': !done && !line.roomNumber
          })}
        >
          <td align='center'>
            {done ? (
              <Tooltip title={`Ingresó ${formatTime(line.actualCheckInAt)}`}>
                <span>
                  <CheckBoxMark checked />
                </span>
              </Tooltip>
            ) : canSelect ? (
              <Checkbox
                checked={selected.has(line.reservationRoomUuid)}
                onChange={event => toggle([line.reservationRoomUuid], event.target.checked)}
                slotProps={{ input: { 'aria-label': `Seleccionar habitación ${line.roomNumber}` } }}
                disabled={Boolean(progress)}
              />
            ) : (
              <Tooltip title={reason}>
                <span>
                  <Checkbox disabled />
                </span>
              </Tooltip>
            )}
          </td>
          <td>
            <div className='flex flex-col items-start gap-1'>
              <Typography className='font-medium' color='text.primary'>
                {line.roomNumber ?? 'Sin asignar'}
              </Typography>
              {line.roomStatus === 'CLEANING' && !done ? (
                <Chip size='small' variant='tonal' color='warning' label='En limpieza' />
              ) : null}
            </div>
          </td>
          {COLUMNS.slice(2).map((column, offset) => (
            <td
              key={column.header}
              align={column.kind === 'money' ? 'right' : undefined}
              className={classnames({ 'whitespace-normal min-is-[200px]': (column.width ?? 0) >= 24 })}
            >
              {displayCell(cells[offset + 2], column.kind)}
            </td>
          ))}
        </tr>
        {reason && !done && isToday ? (
          <tr>
            <td />
            <td colSpan={COLUMNS.length - 1} className='!pbs-0'>
              <Typography variant='body2' color='warning.main'>
                <i className='ri-information-line align-middle mie-1' />
                {reason} Hazlo desde Recepción o Reservas.
              </Typography>
            </td>
          </tr>
        ) : null}
        {error ? (
          <tr>
            <td />
            <td colSpan={COLUMNS.length - 1} className='!pbs-0'>
              <Typography variant='body2' color='error.main'>
                <i className='ri-error-warning-line align-middle mie-1' />
                {error}
              </Typography>
            </td>
          </tr>
        ) : null}
      </Fragment>
    )
  }

  return (
    <ReportLayout
      title='Llegadas del día'
      description='Quiénes llegan, a qué habitación y cuánto deben. Marca a los que llegaron y registra su ingreso de una sola vez.'
      filters={<DayFilter value={date} onChange={handleDateChange} />}
      loading={loading}
      onRefresh={reload}
      document={document}
      stats={
        data
          ? [
              { title: 'Habitaciones que llegan', stats: String(data.summary.rooms), icon: 'ri-door-open-line' },
              { title: 'Personas', stats: String(data.summary.pax), icon: 'ri-group-line', color: 'info' },
              { title: 'Ya llegaron', stats: String(data.summary.done), icon: 'ri-checkbox-circle-line', color: 'success' },
              { title: 'Sin habitación asignada', stats: String(data.summary.unassigned), icon: 'ri-error-warning-line', color: 'warning' },
              { title: 'Saldo por cobrar', stats: formatMoney(data.summary.balanceDue), icon: 'ri-money-dollar-circle-line', color: 'error' }
            ]
          : undefined
      }
      actions={
        isToday ? (
          <Button
            variant='contained'
            color='primary'
            startIcon={progress ? <CircularProgress size={16} color='inherit' /> : <i className='ri-login-box-line' />}
            disabled={!selectedEligible.length || Boolean(progress)}
            onClick={registerSelected}
          >
            {progress
              ? `Registrando ${progress.done} de ${progress.total}…`
              : `Registrar ingreso de los seleccionados${selectedEligible.length ? ` (${selectedEligible.length})` : ''}`}
          </Button>
        ) : null
      }
    >
      {data ? (
        <div className='flex flex-col'>
          {!isToday ? (
            <Alert severity='info' className='m-5'>
              Estás viendo otro día. El ingreso solo se registra el día de llegada; puedes imprimir la lista.
            </Alert>
          ) : null}
          <div className='overflow-x-auto'>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th align='center'>
                    {isToday ? (
                      <Tooltip title='Seleccionar todas las que se pueden registrar'>
                        <span>
                          <Checkbox
                            checked={allChecked}
                            indeterminate={someChecked && !allChecked}
                            disabled={!allEligible.length || Boolean(progress)}
                            onChange={event => toggle(allEligible, event.target.checked)}
                            slotProps={{ input: { 'aria-label': 'Seleccionar todas' } }}
                          />
                        </span>
                      </Tooltip>
                    ) : (
                      COLUMNS[0].header
                    )}
                  </th>
                  {COLUMNS.slice(1).map(column => (
                    <th key={column.header} align={column.kind === 'money' ? 'right' : undefined}>
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.groups.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className='text-center'>
                      No hay llegadas para este día.
                    </td>
                  </tr>
                ) : (
                  data.groups.map(group => {
                    const groupEligible = group.lines
                      .map(line => line.reservationRoomUuid)
                      .filter(uuid => eligible.has(uuid))

                    return (
                      <Fragment key={group.reservationUuid}>
                        {group.lines.length > 1 ? (
                          <tr className='bg-[var(--mui-palette-action-hover)]'>
                            <td align='center'>
                              {isToday && groupEligible.length ? (
                                <Tooltip title='Seleccionar todo el grupo'>
                                  <span>
                                    <Checkbox
                                      checked={groupEligible.every(uuid => selected.has(uuid))}
                                      indeterminate={
                                        groupEligible.some(uuid => selected.has(uuid)) &&
                                        !groupEligible.every(uuid => selected.has(uuid))
                                      }
                                      onChange={event => toggle(groupEligible, event.target.checked)}
                                      disabled={Boolean(progress)}
                                    />
                                  </span>
                                </Tooltip>
                              ) : null}
                            </td>
                            <td colSpan={COLUMNS.length - 1} className='font-medium text-textPrimary'>
                              {groupHeading(group)}
                            </td>
                          </tr>
                        ) : null}
                        {group.lines.map((line, index) => lineRow(group, line, index === 0))}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </ReportLayout>
  )
}

export default ArrivalsReport
