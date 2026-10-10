'use client'

import { useCallback, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'

import { reportsApi } from '@/libs/reportsApi'
import type { SalesRegisterReport as SalesRegisterData } from '@/types/apps/reportTypes'
import { EINVOICE_DOCUMENT_LABELS, EINVOICE_STATUS_LABELS } from '@views/apps/invoicing/einvoiceLabels'
import type { ReportColumn, ReportDocument } from '../document/reportDocument'
import { formatMoney, formatRange, formatShortDate, row, total } from '../document/reportDocument'
import ReportLayout from '../document/ReportLayout'
import type { DateRange } from '../document/ReportFilters'
import { RangeFilter, thisMonthRange } from '../document/ReportFilters'
import { useReport } from '../document/useReport'

const COLUMNS: ReportColumn[] = [
  { header: 'Fecha', width: 10 },
  { header: 'Tipo', width: 16 },
  { header: 'Serie', width: 7 },
  { header: 'Número', kind: 'number', width: 9 },
  { header: 'Doc. cliente', width: 8 },
  { header: 'N° documento', width: 13 },
  { header: 'Cliente', width: 30 },
  { header: 'Moneda', width: 7 },
  { header: 'Base imponible', kind: 'money', width: 13 },
  { header: 'Exonerado', kind: 'money', width: 11 },
  { header: 'Inafecto', kind: 'money', width: 11 },
  { header: 'IGV', kind: 'money', width: 11 },
  { header: 'Total', kind: 'money', width: 12 },
  { header: 'Estado SUNAT', width: 14 },
  { header: 'Modifica a', width: 16 }
]

export const buildSalesRegisterDocument = (report: SalesRegisterData): ReportDocument => {
  const { summary } = report

  return {
    fileName: `comprobantes-${report.from}-al-${report.to}`,
    title: 'Comprobantes emitidos (registro de ventas)',
    hotelName: report.businessName ? `${report.hotelName} · ${report.businessName}` : report.hotelName,
    period: `${formatRange(report.from, report.to)}${report.taxNumber ? ` · RUC ${report.taxNumber}` : ''}`,
    orientation: 'landscape',
    summary: [
      { label: 'Comprobantes', value: String(summary.count) },
      { label: 'Base imponible', value: formatMoney(summary.totalTaxed) },
      { label: 'IGV', value: formatMoney(summary.totalIgv) },
      { label: 'Total', value: formatMoney(summary.total) },
      { label: 'Anulados', value: String(summary.voided) },
      { label: 'Pendientes en SUNAT', value: String(summary.pendingSunat) }
    ],
    tables: [
      {
        columns: COLUMNS,
        rows: report.items.length
          ? [
              ...report.items.map(item =>
                row(
                  [
                    formatShortDate(item.issueDate),
                    `${item.sunatTypeCode} ${EINVOICE_DOCUMENT_LABELS[item.documentType] ?? item.documentType}`,
                    item.series,
                    item.number,
                    item.customerDocCode,
                    item.customerDocNumber ?? '',
                    item.customerName,
                    item.currency,
                    item.totalTaxed,
                    item.totalExonerated,
                    item.totalUnaffected,
                    item.totalIgv,
                    item.total,
                    EINVOICE_STATUS_LABELS[item.status] ?? item.status,
                    item.referenceNumber
                      ? `${item.referenceTypeCode ?? ''} ${item.referenceNumber} (${formatShortDate(item.referenceDate)})`
                      : ''
                  ],
                  item.status === 'VOIDED' || item.status === 'REJECTED'
                    ? 'muted'
                    : item.documentType === 'CREDIT_NOTE'
                      ? 'warning'
                      : undefined
                )
              ),
              total([
                'Total',
                '',
                '',
                null,
                '',
                '',
                '',
                'PEN',
                summary.totalTaxed,
                summary.totalExonerated,
                summary.totalUnaffected,
                summary.totalIgv,
                summary.total,
                '',
                ''
              ])
            ]
          : [],
        emptyText: 'No hay comprobantes emitidos en estas fechas.'
      },
      {
        title: 'Resumen por tipo de comprobante',
        columns: [
          { header: 'Tipo', width: 22 },
          { header: 'Cantidad', kind: 'number', width: 10 },
          { header: 'Total', kind: 'money', width: 14 }
        ],
        rows: report.byType.map(item =>
          row([EINVOICE_DOCUMENT_LABELS[item.documentType] ?? item.documentType, item.count, item.total])
        ),
        emptyText: 'Sin comprobantes.'
      }
    ],
    notes: [
      'Códigos SUNAT: 01 factura, 03 boleta, 07 nota de crédito, 08 nota de débito. Doc. cliente: 1 DNI, 6 RUC, 4 carné de extranjería, 7 pasaporte, - sin documento.',
      'Las notas de crédito van en negativo. Los anulados y rechazados van en cero. Los totales están en soles.'
    ]
  }
}

const SalesRegisterReport = () => {
  const [range, setRange] = useState<DateRange>(thisMonthRange())
  const fetcher = useCallback((propertyId: number) => reportsApi.salesRegister(propertyId, range.from, range.to), [range])
  const { data, loading, reload } = useReport(fetcher, 'No se pudieron cargar los comprobantes.')
  const document = useMemo(() => (data ? buildSalesRegisterDocument(data) : null), [data])

  return (
    <ReportLayout
      title='Comprobantes emitidos'
      description='Boletas, facturas y notas del periodo en el formato del registro de ventas. Descarga el Excel para tu contador.'
      filters={<RangeFilter value={range} onChange={setRange} />}
      loading={loading}
      onRefresh={reload}
      document={document}
      notice={
        data && data.summary.pendingSunat > 0 ? (
          <Alert severity='warning'>
            {data.summary.pendingSunat === 1
              ? 'Hay 1 comprobante que SUNAT aún no confirma.'
              : `Hay ${data.summary.pendingSunat} comprobantes que SUNAT aún no confirma.`}{' '}
            Revísalos en Facturación antes de enviar el reporte al contador.
          </Alert>
        ) : null
      }
      stats={
        data
          ? [
              { title: 'Comprobantes', stats: String(data.summary.count), icon: 'ri-file-list-3-line' },
              { title: 'Base imponible', stats: formatMoney(data.summary.totalTaxed), icon: 'ri-money-dollar-circle-line', color: 'info' },
              { title: 'IGV', stats: formatMoney(data.summary.totalIgv), icon: 'ri-percent-line', color: 'warning' },
              { title: 'Total vendido', stats: formatMoney(data.summary.total), icon: 'ri-funds-line', color: 'success' }
            ]
          : undefined
      }
    />
  )
}

export default SalesRegisterReport
