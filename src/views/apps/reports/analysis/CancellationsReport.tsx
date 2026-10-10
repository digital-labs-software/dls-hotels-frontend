'use client'

import { useCallback, useMemo, useState } from 'react'

import { reportsApi } from '@/libs/reportsApi'
import { SOURCE_LABELS } from '@/types/apps/reservationsTypes'
import type { CancellationsReport as CancellationsData } from '@/types/apps/reportTypes'
import type { ReportDocument } from '../document/reportDocument'
import { formatDateTime, formatMoney, formatPercent, formatRange, formatShortDate, row, total } from '../document/reportDocument'
import ReportLayout from '../document/ReportLayout'
import type { DateRange } from '../document/ReportFilters'
import { RangeFilter, thisMonthRange } from '../document/ReportFilters'
import { useReport } from '../document/useReport'

const STATUS_LABEL = { CANCELLED: 'Cancelada', NO_SHOW: 'No llegó' } as const

export const buildCancellationsDocument = (report: CancellationsData): ReportDocument => {
  const { summary } = report

  return {
    fileName: `cancelaciones-${report.from}-al-${report.to}`,
    title: 'Cancelaciones y no-shows',
    hotelName: report.hotelName,
    period: `Llegadas ${formatRange(report.from, report.to).toLowerCase()}`,
    orientation: 'landscape',
    summary: [
      { label: 'Canceladas', value: String(summary.cancelled) },
      { label: 'No llegaron', value: String(summary.noShow) },
      { label: 'De cada 100 reservas se perdieron', value: formatPercent(summary.lostPct) },
      { label: 'Ingreso perdido', value: formatMoney(summary.lostRevenue) },
      { label: 'Adelantos retenidos', value: formatMoney(summary.retained) }
    ],
    tables: [
      {
        columns: [
          { header: 'Reserva', width: 10 },
          { header: 'Estado', width: 10 },
          { header: 'Titular', width: 22 },
          { header: 'Teléfono', width: 12 },
          { header: 'Empresa / agencia', width: 18 },
          { header: 'Origen', width: 11 },
          { header: 'Llegada', width: 10 },
          { header: 'Noches', kind: 'number', width: 7 },
          { header: 'Hab.', kind: 'number', width: 6 },
          { header: 'Valor', kind: 'money', width: 11 },
          { header: 'Adelanto', kind: 'money', width: 11 },
          { header: 'Motivo', width: 24 },
          { header: 'Canceló', width: 18 }
        ],
        rows: report.items.length
          ? [
              ...report.items.map(item =>
                row(
                  [
                    item.reservationCode,
                    STATUS_LABEL[item.status] ?? item.status,
                    item.holderName,
                    item.phone ?? '',
                    item.companyName ?? 'Particular',
                    SOURCE_LABELS[item.source] ?? item.source,
                    formatShortDate(item.checkInDate),
                    item.nights,
                    item.rooms,
                    item.amount,
                    item.paidAmount || null,
                    item.reason ?? '',
                    [item.cancelledBy, formatDateTime(item.cancelledAt)].filter(Boolean).join('\n')
                  ],
                  item.status === 'NO_SHOW' ? 'warning' : undefined
                )
              ),
              total([
                'Total',
                '',
                '',
                '',
                '',
                '',
                '',
                null,
                null,
                report.items.reduce((sum, item) => sum + item.amount, 0),
                summary.retained,
                '',
                ''
              ])
            ]
          : [],
        emptyText: 'No hubo cancelaciones ni no-shows en estas fechas.'
      },
      {
        title: 'Por origen',
        columns: [
          { header: 'Origen', width: 22 },
          { header: 'Canceladas', kind: 'number', width: 11 },
          { header: 'No llegaron', kind: 'number', width: 11 },
          { header: 'Ingreso perdido', kind: 'money', width: 14 }
        ],
        rows: report.bySource.map(item =>
          row([SOURCE_LABELS[item.source] ?? item.source, item.cancelled, item.noShow, item.lostRevenue])
        ),
        emptyText: 'Sin datos.'
      }
    ],
    notes: [
      'Se toman las reservas cuya llegada cae en las fechas elegidas.',
      'Ingreso perdido = valor de la reserva menos el adelanto que se quedó el hotel.'
    ]
  }
}

const CancellationsReport = () => {
  const [range, setRange] = useState<DateRange>(thisMonthRange())
  const fetcher = useCallback((propertyId: number) => reportsApi.cancellations(propertyId, range.from, range.to), [range])
  const { data, loading, reload } = useReport(fetcher, 'No se pudieron cargar las cancelaciones.')
  const document = useMemo(() => (data ? buildCancellationsDocument(data) : null), [data])

  return (
    <ReportLayout
      title='Cancelaciones y no-shows'
      description='Reservas que se cancelaron o no llegaron, cuánto se dejó de ganar y por qué. Úsalo para ajustar adelantos y políticas.'
      filters={<RangeFilter value={range} onChange={setRange} />}
      loading={loading}
      onRefresh={reload}
      document={document}
      stats={
        data
          ? [
              { title: 'Canceladas', stats: String(data.summary.cancelled), icon: 'ri-close-circle-line', color: 'error' },
              { title: 'No llegaron', stats: String(data.summary.noShow), icon: 'ri-user-unfollow-line', color: 'warning' },
              {
                title: `Perdidas de ${data.summary.expectedReservations} reservas`,
                stats: formatPercent(data.summary.lostPct),
                icon: 'ri-percent-line',
                color: 'secondary'
              },
              { title: 'Ingreso perdido', stats: formatMoney(data.summary.lostRevenue), icon: 'ri-money-dollar-circle-line', color: 'error' },
              { title: 'Adelantos retenidos', stats: formatMoney(data.summary.retained), icon: 'ri-safe-2-line', color: 'success' }
            ]
          : undefined
      }
    />
  )
}

export default CancellationsReport
