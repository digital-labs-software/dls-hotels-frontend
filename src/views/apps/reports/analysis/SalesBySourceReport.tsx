'use client'

import { useCallback, useMemo, useState } from 'react'

import { reportsApi } from '@/libs/reportsApi'
import { COMPANY_TYPE_LABELS } from '@/types/apps/clientsTypes'
import { SOURCE_LABELS } from '@/types/apps/reservationsTypes'
import type { SalesBySourceReport as SalesData } from '@/types/apps/reportTypes'
import type { ReportDocument } from '../document/reportDocument'
import { formatMoney, formatRange, row, total } from '../document/reportDocument'
import ReportBarChart from '../document/ReportBarChart'
import ReportLayout from '../document/ReportLayout'
import type { DateRange } from '../document/ReportFilters'
import { RangeFilter, thisMonthRange } from '../document/ReportFilters'
import { ReportTables } from '../document/ReportTableView'
import { useReport } from '../document/useReport'

type View = 'source' | 'company'

const summaryOf = (report: SalesData) => [
  { label: 'Ingreso', value: formatMoney(report.summary.revenue) },
  { label: 'Noches vendidas', value: String(report.summary.roomNights) },
  { label: 'Reservas', value: String(report.summary.reservations) },
  { label: 'Precio promedio por noche', value: formatMoney(report.summary.adr) }
]

export const buildSourcesDocument = (report: SalesData): ReportDocument => ({
  fileName: `ventas-por-origen-${report.from}-al-${report.to}`,
  title: 'Ventas por origen',
  hotelName: report.hotelName,
  period: formatRange(report.from, report.to),
  orientation: 'portrait',
  summary: summaryOf(report),
  tables: [
    {
      columns: [
        { header: 'Origen de la reserva', width: 24 },
        { header: 'Reservas', kind: 'number', width: 10 },
        { header: 'Noches', kind: 'number', width: 10 },
        { header: 'Ingreso', kind: 'money', width: 14 },
        { header: '% del ingreso', kind: 'percent', width: 12 },
        { header: 'Precio promedio', kind: 'money', width: 14 }
      ],
      rows: report.bySource.length
        ? [
            ...report.bySource.map(item =>
              row([SOURCE_LABELS[item.source] ?? item.source, item.reservations, item.roomNights, item.revenue, item.sharePct, item.adr])
            ),
            total(['Total', report.summary.reservations, report.summary.roomNights, report.summary.revenue, 100, report.summary.adr])
          ]
        : [],
      emptyText: 'No hay noches vendidas en estas fechas.'
    }
  ],
  notes: [
    'El ingreso es por las noches que caen dentro de las fechas elegidas, ya con descuentos.',
    'Las reservas de Booking, Airbnb o Expedia suelen pagar comisión: compáralas con las directas.'
  ]
})

export const buildCompaniesDocument = (report: SalesData): ReportDocument => ({
  fileName: `produccion-empresas-agencias-${report.from}-al-${report.to}`,
  title: 'Producción por empresa y agencia',
  hotelName: report.hotelName,
  period: formatRange(report.from, report.to),
  orientation: 'landscape',
  summary: summaryOf(report),
  tables: [
    {
      columns: [
        { header: 'Empresa / agencia', width: 30 },
        { header: 'RUC', width: 13 },
        { header: 'Tipo', width: 18 },
        { header: 'Reservas', kind: 'number', width: 10 },
        { header: 'Noches', kind: 'number', width: 10 },
        { header: 'Ingreso', kind: 'money', width: 14 },
        { header: '% del ingreso', kind: 'percent', width: 12 },
        { header: 'Saldo por cobrar', kind: 'money', width: 14 }
      ],
      rows: report.byCompany.length
        ? [
            ...report.byCompany.map(item =>
              row(
                [
                  item.name,
                  item.taxNumber ?? '',
                  item.companyType ? COMPANY_TYPE_LABELS[item.companyType] : 'Huéspedes particulares',
                  item.reservations,
                  item.roomNights,
                  item.revenue,
                  item.sharePct,
                  item.balance
                ],
                item.companyUuid ? undefined : 'muted'
              )
            ),
            total([
              'Total',
              '',
              '',
              report.summary.reservations,
              report.summary.roomNights,
              report.summary.revenue,
              100,
              report.byCompany.reduce((sum, item) => sum + item.balance, 0)
            ])
          ]
        : [],
      emptyText: 'No hay noches vendidas en estas fechas.'
    }
  ],
  notes: ['El saldo por cobrar es lo que aún deben las reservas de esa empresa o agencia en estas fechas.']
})

const SalesReport = ({ view }: { view: View }) => {
  const [range, setRange] = useState<DateRange>(thisMonthRange())
  const fetcher = useCallback((propertyId: number) => reportsApi.salesBySource(propertyId, range.from, range.to), [range])
  const { data, loading, reload } = useReport(fetcher, 'No se pudieron cargar las ventas.')

  const document = useMemo(
    () => (data ? (view === 'source' ? buildSourcesDocument(data) : buildCompaniesDocument(data)) : null),
    [data, view]
  )

  const chart = data
    ? view === 'source'
      ? { labels: data.bySource.map(item => SOURCE_LABELS[item.source] ?? item.source), values: data.bySource.map(item => item.revenue) }
      : {
          labels: data.byCompany.slice(0, 10).map(item => item.name),
          values: data.byCompany.slice(0, 10).map(item => item.revenue)
        }
    : null

  const top = view === 'source' ? data?.bySource[0] : data?.byCompany.find(item => item.companyUuid)

  return (
    <ReportLayout
      title={view === 'source' ? 'Ventas por origen' : 'Producción por empresa y agencia'}
      description={
        view === 'source'
          ? 'De dónde vienen los ingresos: directo, WhatsApp, teléfono, Booking, Airbnb y otros canales.'
          : 'Cuánto produce cada empresa y agencia, y cuánto te deben todavía.'
      }
      filters={<RangeFilter value={range} onChange={setRange} />}
      loading={loading}
      onRefresh={reload}
      document={document}
      stats={
        data
          ? [
              { title: 'Ingreso', stats: formatMoney(data.summary.revenue), icon: 'ri-money-dollar-circle-line', color: 'success' },
              { title: 'Noches vendidas', stats: String(data.summary.roomNights), icon: 'ri-moon-line', color: 'info' },
              { title: 'Reservas', stats: String(data.summary.reservations), icon: 'ri-calendar-check-line' },
              {
                title: view === 'source' ? 'Origen que más vende' : 'Empresa que más produce',
                stats: top
                  ? 'source' in top
                    ? (SOURCE_LABELS[top.source] ?? top.source)
                    : top.name
                  : '—',
                icon: 'ri-trophy-line',
                color: 'warning'
              }
            ]
          : undefined
      }
    >
      {data && document && chart ? (
        <>
          {chart.values.length ? (
            <ReportBarChart
              title={view === 'source' ? 'Ingreso por origen' : 'Ingreso por empresa o agencia (las 10 primeras)'}
              labels={chart.labels}
              values={chart.values}
              formatValue={value => formatMoney(value)}
              horizontal
            />
          ) : null}
          <ReportTables document={document} />
        </>
      ) : null}
    </ReportLayout>
  )
}

export const SalesBySourceReport = () => <SalesReport view='source' />

export const CompanyProductionReport = () => <SalesReport view='company' />

export default SalesBySourceReport
