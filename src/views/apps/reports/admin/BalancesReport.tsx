'use client'

import { useCallback, useMemo } from 'react'

import { reportsApi } from '@/libs/reportsApi'
import { COMPANY_TYPE_LABELS } from '@/types/apps/clientsTypes'
import type { BalanceItem, BalanceStage, BalancesReport as BalancesData } from '@/types/apps/reportTypes'
import type { ReportDocument, ReportRow, RowTone } from '../document/reportDocument'
import { formatDateTime, formatLongDate, formatMoney, formatShortDate, row, section, total } from '../document/reportDocument'
import ReportLayout from '../document/ReportLayout'
import { useReport } from '../document/useReport'

const STAGES: { stage: BalanceStage; label: string; tone: RowTone }[] = [
  { stage: 'DEPARTED', label: 'Ya se fueron y deben', tone: 'error' },
  { stage: 'IN_HOUSE', label: 'Alojados con saldo', tone: 'warning' },
  { stage: 'UPCOMING', label: 'Por llegar con saldo (adelantos pendientes)', tone: 'muted' }
]

const itemCells = (item: BalanceItem) => [
  item.reservationCode,
  item.holderName,
  item.phone ?? '',
  item.companyName ?? 'Particular',
  item.roomNumbers ?? '',
  formatShortDate(item.checkInDate),
  formatShortDate(item.checkOutDate),
  item.totalAmount,
  item.paidAmount,
  item.balance,
  item.lastPaymentAt ? formatDateTime(item.lastPaymentAt) : 'Sin pagos',
  item.stage === 'DEPARTED' ? item.daysSinceCheckOut : null
]

export const buildBalancesDocument = (report: BalancesData): ReportDocument => {
  const rows: ReportRow[] = []

  STAGES.forEach(({ stage, label, tone }) => {
    const items = report.items.filter(item => item.stage === stage)

    if (!items.length) return

    const subtotal = items.reduce((sum, item) => sum + item.balance, 0)

    rows.push(section(`${label} · ${items.length} · ${formatMoney(subtotal)}`, tone))
    items.forEach(item => rows.push(row(itemCells(item))))
  })

  if (rows.length) {
    rows.push(total(['Total', '', '', '', '', '', '', null, null, report.summary.total, '', null]))
  }

  return {
    fileName: `saldos-pendientes-${report.date}`,
    title: 'Saldos pendientes',
    hotelName: report.hotelName,
    period: `Al ${formatLongDate(report.date).toLowerCase()}`,
    orientation: 'landscape',
    summary: [
      { label: 'Reservas con saldo', value: String(report.summary.count) },
      { label: 'Total por cobrar', value: formatMoney(report.summary.total) },
      { label: 'De quienes ya se fueron', value: formatMoney(report.summary.departed) },
      { label: 'De alojados', value: formatMoney(report.summary.inHouse) }
    ],
    tables: [
      {
        columns: [
          { header: 'Reserva', width: 10 },
          { header: 'Titular', width: 22 },
          { header: 'Teléfono', width: 12 },
          { header: 'Empresa / agencia', width: 20 },
          { header: 'Hab.', width: 8 },
          { header: 'Entrada', width: 10 },
          { header: 'Salida', width: 10 },
          { header: 'Total', kind: 'money', width: 11 },
          { header: 'Pagado', kind: 'money', width: 11 },
          { header: 'Saldo', kind: 'money', width: 11 },
          { header: 'Último pago', width: 15 },
          { header: 'Días desde salida', kind: 'number', width: 9 }
        ],
        rows,
        emptyText: 'No hay saldos pendientes. Todo está cobrado.'
      },
      {
        title: 'Saldo por empresa o agencia',
        columns: [
          { header: 'Empresa / agencia', width: 30 },
          { header: 'Tipo', width: 18 },
          { header: 'Reservas', kind: 'number', width: 10 },
          { header: 'Saldo', kind: 'money', width: 14 }
        ],
        rows: report.byCompany.map(item =>
          row([item.name, item.companyType ? COMPANY_TYPE_LABELS[item.companyType] : 'Huéspedes', item.count, item.balance])
        ),
        emptyText: 'Sin saldos.'
      }
    ]
  }
}

const BalancesReport = () => {
  const fetcher = useCallback((propertyId: number) => reportsApi.balances(propertyId), [])
  const { data, loading, reload } = useReport(fetcher, 'No se pudieron cargar los saldos.')
  const document = useMemo(() => (data ? buildBalancesDocument(data) : null), [data])

  return (
    <ReportLayout
      title='Saldos pendientes'
      description='Quién le debe al hotel: huéspedes que ya se fueron, alojados y reservas con adelanto pendiente, también por empresa o agencia.'
      loading={loading}
      onRefresh={reload}
      document={document}
      stats={
        data
          ? [
              { title: 'Total por cobrar', stats: formatMoney(data.summary.total), icon: 'ri-hand-coin-line', color: 'error' },
              { title: 'Ya se fueron', stats: formatMoney(data.summary.departed), icon: 'ri-logout-box-r-line', color: 'warning' },
              { title: 'Alojados', stats: formatMoney(data.summary.inHouse), icon: 'ri-hotel-bed-line', color: 'info' },
              { title: 'Por llegar', stats: formatMoney(data.summary.upcoming), icon: 'ri-calendar-event-line', color: 'secondary' }
            ]
          : undefined
      }
    />
  )
}

export default BalancesReport
