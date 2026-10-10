'use client'

import { useCallback, useMemo, useState } from 'react'

import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'

import { reportsApi } from '@/libs/reportsApi'
import { limaToday } from '@/types/apps/frontDeskTypes'
import type { HousekeepingReport as HousekeepingData, HousekeepingRoom, HousekeepingTask } from '@/types/apps/reportTypes'
import { ROOM_STATUS_LABELS } from '@/types/apps/roomsTypes'
import type { ReportColumn, ReportDocument, ReportRow, RowTone } from '../document/reportDocument'
import { formatLongDate, formatShortDate, row, section } from '../document/reportDocument'
import ReportLayout from '../document/ReportLayout'
import { DayFilter } from '../document/ReportFilters'
import { useReport } from '../document/useReport'

export const HOUSEKEEPING_TASK_LABELS: Record<HousekeepingTask, string> = {
  TURNOVER: 'Sale y llega otro: limpiar primero',
  DEPARTURE: 'Salida: limpieza completa',
  STAYOVER: 'Ocupada: repaso',
  ARRIVAL: 'Llega hoy: revisar que esté lista',
  DIRTY: 'Sucia: limpiar',
  MAINTENANCE: 'Mantenimiento: no vender',
  VACANT: 'Libre: revisar'
}

const TASK_TONE: Partial<Record<HousekeepingTask, RowTone>> = {
  TURNOVER: 'error',
  DEPARTURE: 'warning',
  DIRTY: 'warning',
  MAINTENANCE: 'muted',
  VACANT: 'muted'
}

const COLUMNS: ReportColumn[] = [
  { header: 'Hab.', width: 7 },
  { header: 'Tipo', width: 12 },
  { header: 'Qué hacer', width: 26 },
  { header: 'Huésped', width: 26 },
  { header: 'Sale', width: 9 },
  { header: 'Estado en sistema', width: 13 },
  { header: 'Hecho', kind: 'check', width: 6 },
  { header: 'Hora', kind: 'write', width: 7 },
  { header: 'Observaciones / faltantes', kind: 'write', width: 28 }
]

const guestText = (room: HousekeepingRoom) => {
  const parts: string[] = []

  if (room.guestName) parts.push(`${room.guestName} (${room.pax} pax)`)
  if (room.arrivingGuestName) parts.push(`Llega: ${room.arrivingGuestName} (${room.arrivingPax} pax)`)

  return parts.join('\n')
}

const hasWork = (room: HousekeepingRoom) => room.task !== 'VACANT'

export const buildHousekeepingDocument = (report: HousekeepingData, onlyWork: boolean): ReportDocument => {
  const rows: ReportRow[] = []

  report.floors.forEach(floor => {
    const rooms = onlyWork ? floor.rooms.filter(hasWork) : floor.rooms

    if (!rooms.length) return

    rows.push(section(floor.floorName))
    rooms.forEach(room =>
      rows.push(
        row(
          [
            room.roomNumber,
            room.roomTypeName,
            HOUSEKEEPING_TASK_LABELS[room.task],
            guestText(room),
            room.checkOutDate && room.task === 'STAYOVER' ? formatShortDate(room.checkOutDate) : '',
            ROOM_STATUS_LABELS[room.roomStatus] ?? room.roomStatus,
            false,
            '',
            room.notes ?? ''
          ],
          TASK_TONE[room.task]
        )
      )
    )
  })

  return {
    fileName: `limpieza-${report.date}`,
    title: 'Hoja de limpieza',
    hotelName: report.hotelName,
    period: formatLongDate(report.date),
    orientation: 'landscape',
    showShift: true,
    summary: [
      { label: 'Salidas', value: String(report.summary.departures) },
      { label: 'Repasos', value: String(report.summary.stayovers) },
      { label: 'Llegadas', value: String(report.summary.arrivals) },
      { label: 'Sucias', value: String(report.summary.dirty) },
      { label: 'Mantenimiento', value: String(report.summary.maintenance) }
    ],
    tables: [{ columns: COLUMNS, rows, emptyText: 'No hay habitaciones con tareas para este día.' }],
    notes: [
      'Primero las habitaciones que salen y llega otro huésped el mismo día; luego salidas, sucias y repasos.',
      'Marca "Hecho" al terminar y anota en observaciones lo que falte o esté dañado.'
    ],
    signatures: ['Camarera', 'Supervisora']
  }
}

const HousekeepingReport = () => {
  const [date, setDate] = useState(limaToday())
  const [onlyWork, setOnlyWork] = useState(false)
  const fetcher = useCallback((propertyId: number) => reportsApi.housekeeping(propertyId, date), [date])
  const { data, loading, reload } = useReport(fetcher, 'No se pudo cargar la hoja de limpieza.')
  const document = useMemo(() => (data ? buildHousekeepingDocument(data, onlyWork) : null), [data, onlyWork])

  return (
    <ReportLayout
      title='Hoja de limpieza'
      description='Qué hacer en cada habitación hoy. Imprímela para la camarera: marca lo terminado y anota faltantes.'
      filters={
        <>
          <DayFilter value={date} onChange={setDate} />
          <FormControlLabel
            control={<Checkbox checked={onlyWork} onChange={event => setOnlyWork(event.target.checked)} />}
            label='Solo habitaciones con trabajo'
          />
        </>
      }
      loading={loading}
      onRefresh={reload}
      document={document}
      excel={false}
      stats={
        data
          ? [
              { title: 'Salidas', stats: String(data.summary.departures), icon: 'ri-logout-box-r-line', color: 'warning' },
              { title: 'Repasos', stats: String(data.summary.stayovers), icon: 'ri-hotel-bed-line', color: 'info' },
              { title: 'Llegadas', stats: String(data.summary.arrivals), icon: 'ri-login-box-line', color: 'success' },
              { title: 'Sucias', stats: String(data.summary.dirty), icon: 'ri-brush-line', color: 'error' },
              { title: 'Mantenimiento', stats: String(data.summary.maintenance), icon: 'ri-tools-line', color: 'secondary' }
            ]
          : undefined
      }
    />
  )
}

export default HousekeepingReport
