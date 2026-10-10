'use client'

import { useCallback, useMemo, useState } from 'react'

import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'

import { reportsApi } from '@/libs/reportsApi'
import { DOCUMENT_TYPE_LABELS } from '@/types/apps/clientsTypes'
import { limaToday } from '@/types/apps/frontDeskTypes'
import type { GuestSheet, GuestSheetStay } from '@/types/apps/reportTypes'
import type { ReportColumn, ReportDocument, ReportRow } from '../document/reportDocument'
import { formatLongDate, formatShortDate, row, section } from '../document/reportDocument'
import ReportLayout from '../document/ReportLayout'
import { DayFilter } from '../document/ReportFilters'
import { useReport } from '../document/useReport'

const COLUMNS: ReportColumn[] = [
  { header: 'Visto', kind: 'check', width: 6 },
  { header: 'Hab.', width: 7 },
  { header: 'Tipo', width: 12 },
  { header: 'Agencia / particular', width: 20 },
  { header: 'Pax', kind: 'number', width: 5 },
  { header: 'Nombres y apellidos', width: 28 },
  { header: 'Edad', width: 6 },
  { header: 'Nacionalidad', kind: 'write', width: 12 },
  { header: 'DNI o pasaporte', width: 18 },
  { header: 'Ingreso', width: 10 },
  { header: 'Salida', width: 10 },
  { header: 'Forma de pago', width: 13 },
  { header: 'Observaciones', kind: 'write', width: 22 }
]

const stayCells = (stay: GuestSheetStay) => {
  const guests = stay.guests

  return [
    stay.agencyOrParticular || 'Particular',
    stay.pax || null,
    stay.guestNames?.trim() || guests.map(guest => guest.fullName).join('\n'),
    guests.map(guest => (guest.age === null ? '—' : String(guest.age))).join('\n'),
    guests.map(guest => guest.nationality ?? '').filter(Boolean).join('\n'),
    guests
      .map(guest =>
        [guest.documentType ? DOCUMENT_TYPE_LABELS[guest.documentType] : '', guest.documentNumber ?? '']
          .filter(Boolean)
          .join(' ')
      )
      .join('\n'),
    formatShortDate(stay.checkInDate),
    formatShortDate(stay.checkOutDate),
    stay.paymentMethodLabel ?? '',
    stay.observations ?? ''
  ]
}

export const buildInHouseDocument = (report: GuestSheet, includeVacant: boolean): ReportDocument => {
  const rows: ReportRow[] = []

  report.floors.forEach(floor => {
    const rooms = includeVacant ? floor.rooms : floor.rooms.filter(room => room.stay)

    if (!rooms.length) {
      return
    }

    rows.push(section(`${floor.floorName} · ${floor.occupiedCount} ocupadas · ${floor.paxCount} pax`))
    rooms.forEach(room => {
      rows.push(
        room.stay
          ? row([false, room.number, room.roomTypeName, ...stayCells(room.stay)])
          : row([false, room.number, room.roomTypeName, 'Libre'], 'muted')
      )
    })
  })

  if (report.unassigned.length) {
    rows.push(section(`Alojados sin habitación asignada · ${report.unassigned.length}`, 'warning'))
    report.unassigned.forEach(stay => rows.push(row([false, '—', '—', ...stayCells(stay)], 'warning')))
  }

  return {
    fileName: `huespedes-alojados-${report.date}`,
    title: 'Parte de huéspedes alojados',
    hotelName: report.hotelName,
    period: `Noche del ${formatLongDate(report.date).toLowerCase()}`,
    orientation: 'landscape',
    showShift: true,
    summary: [
      { label: 'Habitaciones', value: String(report.summary.totalRooms) },
      { label: 'Ocupadas', value: String(report.summary.occupiedRooms) },
      { label: 'Libres', value: String(report.summary.vacantRooms) },
      { label: 'Huéspedes', value: String(report.summary.pax) }
    ],
    tables: [{ columns: COLUMNS, rows, emptyText: 'No hay habitaciones registradas.' }],
    notes: ['Marca "Visto" al revisar cada habitación en la ronda de la noche y completa la nacionalidad a mano.'],
    signatures: ['Recepcionista de noche', 'Administración']
  }
}

const InHouseReport = () => {
  const [date, setDate] = useState(limaToday())
  const [includeVacant, setIncludeVacant] = useState(true)
  const fetcher = useCallback((propertyId: number) => reportsApi.guestSheet(propertyId, date), [date])
  const { data, loading, reload } = useReport(fetcher, 'No se pudo cargar el parte de huéspedes.')
  const document = useMemo(() => (data ? buildInHouseDocument(data, includeVacant) : null), [data, includeVacant])

  return (
    <ReportLayout
      title='Huéspedes alojados'
      description='Parte del día con quién duerme en cada habitación. Imprímelo para la ronda de la noche o para la policía.'
      filters={
        <>
          <DayFilter value={date} onChange={setDate} allowTomorrow={false} />
          <FormControlLabel
            control={<Checkbox checked={includeVacant} onChange={event => setIncludeVacant(event.target.checked)} />}
            label='Incluir habitaciones libres'
          />
        </>
      }
      loading={loading}
      onRefresh={reload}
      document={document}
      stats={
        data
          ? [
              { title: 'Habitaciones ocupadas', stats: `${data.summary.occupiedRooms} de ${data.summary.totalRooms}`, icon: 'ri-hotel-bed-line' },
              { title: 'Huéspedes', stats: String(data.summary.pax), icon: 'ri-group-line', color: 'info' },
              { title: 'Libres', stats: String(data.summary.vacantRooms), icon: 'ri-door-open-line', color: 'success' },
              {
                title: 'Sin habitación asignada',
                stats: String(data.summary.unassignedStays),
                icon: 'ri-error-warning-line',
                color: 'warning'
              }
            ]
          : undefined
      }
    />
  )
}

export default InHouseReport
