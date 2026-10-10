'use client'

import { useCallback, useMemo, useState } from 'react'

import { reportsApi } from '@/libs/reportsApi'
import type { OccupancyReport as OccupancyData } from '@/types/apps/reportTypes'
import type { ReportDocument } from '../document/reportDocument'
import { formatMoney, formatPercent, formatRange, formatShortDate, row, total } from '../document/reportDocument'
import ReportBarChart from '../document/ReportBarChart'
import ReportLayout from '../document/ReportLayout'
import type { DateRange } from '../document/ReportFilters'
import { RangeFilter, thisMonthRange } from '../document/ReportFilters'
import { ReportTables } from '../document/ReportTableView'
import { useReport } from '../document/useReport'

const weekday = (iso: string) => {
  const text = new Date(`${iso}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '')

  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const buildOccupancyDocument = (report: OccupancyData): ReportDocument => {
  const { summary } = report

  return {
    fileName: `ocupacion-${report.from}-al-${report.to}`,
    title: 'Ocupación y precio promedio',
    hotelName: report.hotelName,
    period: formatRange(report.from, report.to),
    orientation: 'landscape',
    summary: [
      { label: 'Ocupación', value: formatPercent(summary.occupancyPct) },
      { label: 'Precio promedio por noche', value: formatMoney(summary.adr) },
      { label: 'Ingreso por habitación disponible', value: formatMoney(summary.revpar) },
      { label: 'Noches vendidas', value: `${summary.soldRoomNights} de ${summary.availableRoomNights}` },
      { label: 'Ingreso por habitaciones', value: formatMoney(summary.revenue) }
    ],
    tables: [
      {
        title: 'Día por día',
        columns: [
          { header: 'Día', width: 6 },
          { header: 'Fecha', width: 11 },
          { header: 'Habitaciones', kind: 'number', width: 12 },
          { header: 'Vendidas', kind: 'number', width: 10 },
          { header: 'Personas', kind: 'number', width: 10 },
          { header: 'Ocupación', kind: 'percent', width: 11 },
          { header: 'Ingreso', kind: 'money', width: 13 },
          { header: 'Precio promedio', kind: 'money', width: 14 },
          { header: 'Ingreso por hab. disponible', kind: 'money', width: 16 }
        ],
        rows: [
          ...report.days.map(day =>
            row(
              [
                weekday(day.date),
                formatShortDate(day.date),
                day.available,
                day.sold,
                day.pax,
                day.occupancyPct,
                day.revenue,
                day.adr,
                day.revpar
              ],
              day.sold === 0 ? 'muted' : undefined
            )
          ),
          total([
            'Total',
            '',
            summary.availableRoomNights,
            summary.soldRoomNights,
            summary.guestNights,
            summary.occupancyPct,
            summary.revenue,
            summary.adr,
            summary.revpar
          ])
        ]
      },
      {
        title: 'Por tipo de habitación',
        columns: [
          { header: 'Tipo', width: 22 },
          { header: 'Habitaciones', kind: 'number', width: 12 },
          { header: 'Noches vendidas', kind: 'number', width: 14 },
          { header: 'Ocupación', kind: 'percent', width: 11 },
          { header: 'Ingreso', kind: 'money', width: 13 },
          { header: 'Precio promedio', kind: 'money', width: 14 }
        ],
        rows: report.byRoomType.map(type =>
          row([type.roomTypeName, type.rooms, type.sold, type.occupancyPct, type.revenue, type.adr])
        ),
        emptyText: 'Sin tipos de habitación.'
      }
    ],
    notes: [
      'Ocupación: de cada 100 habitaciones disponibles, cuántas se vendieron.',
      'Precio promedio por noche (ADR): lo que pagó en promedio cada habitación vendida, ya con descuentos.',
      'Ingreso por habitación disponible (RevPAR): el ingreso repartido entre todas las habitaciones, vendidas o no.'
    ]
  }
}

const OccupancyReport = () => {
  const [range, setRange] = useState<DateRange>(thisMonthRange())
  const fetcher = useCallback((propertyId: number) => reportsApi.occupancy(propertyId, range.from, range.to), [range])
  const { data, loading, reload } = useReport(fetcher, 'No se pudo cargar la ocupación.')
  const document = useMemo(() => (data ? buildOccupancyDocument(data) : null), [data])

  return (
    <ReportLayout
      title='Ocupación del mes'
      description='Qué tan lleno estuvo el hotel, cuánto se cobró en promedio por noche y cuánto rindió cada habitación.'
      filters={<RangeFilter value={range} onChange={setRange} />}
      loading={loading}
      onRefresh={reload}
      document={document}
      stats={
        data
          ? [
              { title: 'Ocupación', stats: formatPercent(data.summary.occupancyPct), icon: 'ri-hotel-line' },
              { title: 'Precio promedio por noche', stats: formatMoney(data.summary.adr), icon: 'ri-price-tag-3-line', color: 'info' },
              { title: 'Ingreso por habitación disponible', stats: formatMoney(data.summary.revpar), icon: 'ri-line-chart-line', color: 'success' },
              {
                title: 'Noches vendidas',
                stats: `${data.summary.soldRoomNights} de ${data.summary.availableRoomNights}`,
                icon: 'ri-moon-line',
                color: 'warning'
              },
              { title: 'Ingreso por habitaciones', stats: formatMoney(data.summary.revenue), icon: 'ri-money-dollar-circle-line', color: 'secondary' }
            ]
          : undefined
      }
    >
      {data && document ? (
        <>
          <ReportBarChart
            title='Ocupación por día'
            labels={data.days.map(day => formatShortDate(day.date).slice(0, 5))}
            values={data.days.map(day => day.occupancyPct)}
            formatValue={value => `${Math.round(value)} %`}
            max={100}
          />
          <ReportTables document={document} />
        </>
      ) : null}
    </ReportLayout>
  )
}

export default OccupancyReport
