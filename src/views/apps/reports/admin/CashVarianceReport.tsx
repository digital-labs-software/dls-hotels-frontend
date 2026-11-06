'use client'

import { useCallback, useMemo, useState } from 'react'

import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

import { reportsApi } from '@/libs/reportsApi'
import type { CashVarianceReport as CashVarianceData } from '@/types/apps/reportTypes'
import type { ReportDocument } from '../document/reportDocument'
import { formatMoney, formatRange, formatShortDate, row, total } from '../document/reportDocument'
import ReportLayout from '../document/ReportLayout'
import type { DateRange } from '../document/ReportFilters'
import { RangeFilter, thisMonthRange } from '../document/ReportFilters'
import { useReport } from '../document/useReport'

const signedMoney = (value: number) => (value > 0 ? `+${formatMoney(value)}` : formatMoney(value))

const resultLabel = (difference: number) => {
  if (difference === 0) {
    return 'Cuadra'
  }

  return difference > 0 ? 'Sobrante' : 'Faltante'
}

const periodResult = (report: CashVarianceData) => {
  const { difference } = report.summary

  if (report.cashierName) {
    if (difference < 0) {
      return `${report.cashierName} debe ${formatMoney(Math.abs(difference))} en este periodo.`
    }

    if (difference > 0) {
      return `${report.cashierName} entregó ${formatMoney(difference)} de más en este periodo.`
    }

    return `${report.cashierName} cuadra en este periodo.`
  }

  if (difference < 0) {
    return `Entre todos los cajeros faltan ${formatMoney(Math.abs(difference))}.`
  }

  if (difference > 0) {
    return `Entre todos los cajeros sobran ${formatMoney(difference)}.`
  }

  return 'Entre todos los cajeros el periodo cuadra.'
}

export const buildCashVarianceDocument = (report: CashVarianceData): ReportDocument => {
  const { summary } = report

  return {
    fileName: `diferencias-caja-${report.from}-al-${report.to}${report.cashierId ? `-cajero-${report.cashierId}` : ''}`,
    title: report.cashierName ? `Diferencias de caja · ${report.cashierName}` : 'Diferencias de caja',
    hotelName: report.hotelName,
    period: formatRange(report.from, report.to),
    orientation: 'portrait',
    summary: [
      { label: 'Turnos cerrados', value: String(summary.sessions) },
      { label: 'Faltante', value: formatMoney(summary.shortage) },
      { label: 'Sobrante', value: signedMoney(summary.surplus) },
      { label: 'Diferencia del periodo', value: signedMoney(summary.difference) }
    ],
    tables: [
      {
        title: 'Cierres',
        columns: [
          { header: 'Cierre', width: 12 },
          { header: 'Turno', width: 12 },
          { header: 'Cajero', width: 22 },
          { header: 'Según sistema', kind: 'money', width: 14 },
          { header: 'Contado', kind: 'money', width: 14 },
          { header: 'Diferencia', width: 16 },
          { header: 'Resultado', width: 12 }
        ],
        rows: report.sessions.length
          ? [
              ...report.sessions.map(session =>
                row(
                  [
                    formatShortDate(session.closedOn),
                    session.number,
                    session.cashierName,
                    session.cashExpected,
                    session.countedCash,
                    signedMoney(session.difference),
                    resultLabel(session.difference)
                  ],
                  session.difference < 0 ? 'error' : session.difference > 0 ? 'info' : 'success'
                )
              ),
              total(['', '', 'Total', '', '', signedMoney(summary.difference), resultLabel(summary.difference)])
            ]
          : [],
        emptyText: 'No hay cajas cerradas en este periodo.'
      }
    ],
    notes: [
      'La diferencia es el efectivo contado menos el efectivo del sistema.',
      'Un monto negativo es faltante: falta dinero en la caja. Un monto positivo es sobrante: se entregó de más.',
      periodResult(report)
    ]
  }
}

const CashVarianceReport = () => {
  const [range, setRange] = useState<DateRange>(thisMonthRange())
  const [cashierId, setCashierId] = useState<number | null>(null)

  const fetcher = useCallback(
    (propertyId: number) => reportsApi.cashVariance(propertyId, range.from, range.to, cashierId),
    [cashierId, range]
  )

  const { data, loading, reload } = useReport(fetcher, 'No se pudieron cargar las diferencias de caja.')
  const document = useMemo(() => (data ? buildCashVarianceDocument(data) : null), [data])

  const changeRange = (next: DateRange) => {
    setRange(next)
    setCashierId(null)
  }

  return (
    <ReportLayout
      title='Diferencias de caja'
      description='Por cada cierre, si faltó o sobró efectivo. El total del periodo dice si el cajero debe o entregó de más.'
      filters={
        <>
          <RangeFilter value={range} onChange={changeRange} />
          <TextField
            select
            size='small'
            label='Cajero'
            value={cashierId ?? ''}
            onChange={event => setCashierId(event.target.value === '' ? null : Number(event.target.value))}
            className='min-is-[220px]'
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value=''>Todos</MenuItem>
            {(data?.cashiers ?? []).map(cashier => (
              <MenuItem key={cashier.employeeId} value={cashier.employeeId}>
                {cashier.name}
              </MenuItem>
            ))}
          </TextField>
        </>
      }
      loading={loading}
      onRefresh={reload}
      document={document}
      stats={
        data
          ? [
              {
                title: 'Diferencia del periodo',
                stats: signedMoney(data.summary.difference),
                icon: 'ri-scales-3-line',
                color: data.summary.difference < 0 ? 'error' : data.summary.difference > 0 ? 'info' : 'success'
              },
              { title: 'Faltante', stats: formatMoney(data.summary.shortage), icon: 'ri-arrow-down-line', color: 'error' },
              { title: 'Sobrante', stats: signedMoney(data.summary.surplus), icon: 'ri-arrow-up-line', color: 'info' },
              { title: 'Turnos cerrados', stats: String(data.summary.sessions), icon: 'ri-safe-2-line' }
            ]
          : undefined
      }
    />
  )
}

export default CashVarianceReport
