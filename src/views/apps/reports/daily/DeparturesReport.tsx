'use client'

import { useCallback, useMemo, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import Button from '@mui/material/Button'

import type { Locale } from '@configs/i18n'
import { reportsApi } from '@/libs/reportsApi'
import { limaToday } from '@/types/apps/frontDeskTypes'
import type { MovementGroup, MovementLine, MovementReport } from '@/types/apps/reportTypes'
import { getLocalizedUrl } from '@/utils/i18n'
import type { ReportColumn, ReportDocument, ReportRow } from '../document/reportDocument'
import { formatLongDate, formatMoney, formatShortDate, formatTime, row, section } from '../document/reportDocument'
import ReportLayout from '../document/ReportLayout'
import { DayFilter } from '../document/ReportFilters'
import { useReport } from '../document/useReport'
import { agencyText, eachMovementRow, paxText } from './movementShared'

const COLUMNS: ReportColumn[] = [
  { header: 'Salió', kind: 'check', width: 6 },
  { header: 'Hab.', width: 7 },
  { header: 'Tipo', width: 12 },
  { header: 'Huésped', width: 26 },
  { header: 'Pax', width: 7 },
  { header: 'Entró', width: 10 },
  { header: 'Reserva', width: 10 },
  { header: 'Empresa / agencia', width: 24 },
  { header: 'Saldo', kind: 'money', width: 11 },
  { header: 'Cobrado', kind: 'write', width: 10 },
  { header: 'Llave', kind: 'check', width: 6 },
  { header: 'Observaciones', kind: 'write', width: 24 }
]

const departureCells = (group: MovementGroup, line: MovementLine, first: boolean) => [
  line.status === 'CHECKED_OUT',
  line.roomNumber ?? 'Sin asignar',
  line.roomTypeName,
  line.guestNames ?? group.holderName,
  paxText(line),
  formatShortDate(line.checkInDate),
  group.reservationCode,
  agencyText(group),
  first && group.balance > 0 ? group.balance : null,
  line.status === 'CHECKED_OUT' ? `Salió ${formatTime(line.actualCheckOutAt)}` : '',
  null,
  first ? (group.notes ?? '') : ''
]

const toneFor = (group: MovementGroup, line: MovementLine) => {
  if (line.status === 'CHECKED_OUT') return 'success' as const
  if (group.balance > 0) return 'warning' as const

  return undefined
}

export const buildDeparturesDocument = (report: MovementReport): ReportDocument => {
  const build = (group: MovementGroup, line: MovementLine, first: boolean) =>
    row(departureCells(group, line, first), toneFor(group, line))

  const overdue = eachMovementRow(report.groups, build, line => line.overdue)
  const today = eachMovementRow(report.groups, build, line => !line.overdue)

  const rows: ReportRow[] = overdue.length
    ? [
        section('Debieron salir antes y siguen alojados', 'error'),
        ...overdue,
        ...(today.length ? [section(`Salen el ${formatShortDate(report.date)}`)] : []),
        ...today
      ]
    : today

  return {
    fileName: `salidas-${report.date}`,
    title: 'Salidas del día',
    hotelName: report.hotelName,
    period: formatLongDate(report.date),
    orientation: 'landscape',
    showShift: true,
    summary: [
      { label: 'Habitaciones', value: String(report.summary.rooms) },
      { label: 'Personas', value: String(report.summary.pax) },
      { label: 'Ya salieron', value: String(report.summary.done) },
      { label: 'Faltan', value: String(report.summary.pending) },
      { label: 'Reservas con saldo', value: String(report.summary.withBalance) },
      { label: 'Por cobrar', value: formatMoney(report.summary.balanceDue) }
    ],
    tables: [{ columns: COLUMNS, rows, emptyText: 'No hay salidas para este día.' }],
    notes: [
      'Antes de entregar la cuenta, cobra el saldo y pide la llave.',
      'Registra la salida en Recepción para que la habitación pase a limpieza.'
    ],
    signatures: ['Recepcionista']
  }
}

const DeparturesReport = () => {
  const { lang: locale } = useParams()
  const [date, setDate] = useState(limaToday())
  const fetcher = useCallback((propertyId: number) => reportsApi.departures(propertyId, date), [date])
  const { data, loading, reload } = useReport(fetcher, 'No se pudieron cargar las salidas.')
  const document = useMemo(() => (data ? buildDeparturesDocument(data) : null), [data])
  const overdue = data?.groups.flatMap(group => group.lines).filter(line => line.overdue).length ?? 0

  return (
    <ReportLayout
      title='Salidas del día'
      description='Quiénes se van y cuánto falta cobrar. Cobra el saldo, recoge la llave y registra la salida en Recepción.'
      filters={<DayFilter value={date} onChange={setDate} />}
      loading={loading}
      onRefresh={reload}
      document={document}
      actions={
        <Button
          component={Link}
          href={getLocalizedUrl('/apps/front-desk', locale as Locale)}
          variant='outlined'
          startIcon={<i className='ri-logout-box-r-line' />}
        >
          Ir a Recepción
        </Button>
      }
      stats={
        data
          ? [
              { title: 'Habitaciones que salen', stats: String(data.summary.rooms), icon: 'ri-door-closed-line' },
              { title: 'Ya salieron', stats: String(data.summary.done), icon: 'ri-checkbox-circle-line', color: 'success' },
              { title: 'Faltan salir', stats: String(data.summary.pending), icon: 'ri-time-line', color: 'info' },
              { title: 'Salidas vencidas', stats: String(overdue), icon: 'ri-alarm-warning-line', color: 'warning' },
              { title: 'Saldo por cobrar', stats: formatMoney(data.summary.balanceDue), icon: 'ri-money-dollar-circle-line', color: 'error' }
            ]
          : undefined
      }
    />
  )
}

export default DeparturesReport
