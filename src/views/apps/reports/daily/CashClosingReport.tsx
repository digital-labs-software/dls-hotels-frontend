'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

import { reportsApi } from '@/libs/reportsApi'
import { PAYMENT_METHOD_LABELS, limaToday } from '@/types/apps/frontDeskTypes'
import type { CashClosingReport as CashClosingData, CashEmployeeTotal } from '@/types/apps/reportTypes'
import type { ReportDocument } from '../document/reportDocument'
import { formatLongDate, formatMoney, formatTime, row, total } from '../document/reportDocument'
import ReportLayout from '../document/ReportLayout'
import { DayFilter } from '../document/ReportFilters'
import { useReport } from '../document/useReport'

export const buildCashClosingDocument = (report: CashClosingData): ReportDocument => {
  const { summary } = report

  return {
    fileName: `cierre-caja-${report.date}${report.employeeId ? `-empleado-${report.employeeId}` : ''}`,
    title: report.employeeName ? `Cierre de caja · ${report.employeeName}` : 'Cierre de caja',
    hotelName: report.hotelName,
    period: formatLongDate(report.date),
    orientation: 'portrait',
    showShift: true,
    summary: [
      { label: 'Pagos', value: String(summary.count) },
      { label: 'Cobrado', value: formatMoney(summary.charges) },
      { label: 'Devuelto', value: formatMoney(summary.refunds) },
      { label: 'Neto', value: formatMoney(summary.net) },
      { label: 'Efectivo en caja', value: formatMoney(summary.cashExpected) }
    ],
    tables: [
      {
        title: 'Por medio de pago',
        columns: [
          { header: 'Medio de pago', width: 18 },
          { header: 'Pagos', kind: 'number', width: 8 },
          { header: 'Cobrado', kind: 'money', width: 13 },
          { header: 'Devuelto', kind: 'money', width: 13 },
          { header: 'Neto', kind: 'money', width: 13 }
        ],
        rows: [
          ...report.byMethod.map(item =>
            row([PAYMENT_METHOD_LABELS[item.method] ?? item.method, item.count, item.charges, item.refunds, item.net])
          ),
          total(['Total', summary.count, summary.charges, summary.refunds, summary.net])
        ]
      },
      {
        title: 'Por empleado',
        columns: [
          { header: 'Empleado', width: 26 },
          { header: 'Pagos', kind: 'number', width: 8 },
          { header: 'Neto cobrado', kind: 'money', width: 13 },
          { header: 'Efectivo a entregar', kind: 'money', width: 15 }
        ],
        rows: report.byEmployee.length
          ? [
              ...report.byEmployee.map(item => row([item.employeeName, item.count, item.net, item.cash])),
              total(['Total', summary.count, summary.net, summary.cashExpected])
            ]
          : [],
        emptyText: 'Nadie registró pagos este día.'
      },
      {
        title: 'Arqueo de efectivo',
        columns: [
          { header: 'Concepto', width: 34 },
          { header: 'Monto', kind: 'write', width: 16 }
        ],
        rows: [
          row(['Efectivo según el sistema', formatMoney(summary.cashExpected)]),
          row(['Fondo inicial de caja (sencillo)', '']),
          row(['Efectivo contado al cerrar', '']),
          row(['Diferencia (contado − fondo − sistema)', ''])
        ]
      },
      {
        title: 'Detalle de pagos',
        columns: [
          { header: 'Hora', width: 7 },
          { header: 'Reserva', width: 10 },
          { header: 'Titular', width: 22 },
          { header: 'Hab.', width: 8 },
          { header: 'Medio', width: 11 },
          { header: 'N° operación', width: 12 },
          { header: 'Monto', kind: 'money', width: 11 },
          { header: 'Registró', width: 16 }
        ],
        rows: report.payments.length
          ? [
              ...report.payments.map(payment =>
                row(
                  [
                    formatTime(payment.paidAt),
                    payment.reservationCode,
                    payment.holderName,
                    payment.roomNumbers ?? '',
                    PAYMENT_METHOD_LABELS[payment.method] ?? payment.method,
                    payment.reference ?? '',
                    payment.amount,
                    payment.employeeName
                  ],
                  payment.amount < 0 ? 'error' : undefined
                )
              ),
              total(['', '', '', '', '', 'Total', summary.net, ''])
            ]
          : [],
        emptyText: 'No hay pagos registrados este día.'
      }
    ],
    notes: ['Las devoluciones aparecen en negativo y se restan del total.'],
    signatures: ['Entrega (recepcionista)', 'Recibe (administración)']
  }
}

const CashClosingReport = () => {
  const [date, setDate] = useState(limaToday())
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [employees, setEmployees] = useState<CashEmployeeTotal[]>([])
  const fetcher = useCallback((propertyId: number) => reportsApi.cashClosing(propertyId, date, employeeId), [date, employeeId])
  const { data, loading, reload } = useReport(fetcher, 'No se pudo cargar el cierre de caja.')
  const document = useMemo(() => (data ? buildCashClosingDocument(data) : null), [data])

  useEffect(() => {
    if (data && data.employeeId === null) {
      setEmployees(data.byEmployee.filter(item => item.employeeId !== null))
    }
  }, [data])

  const handleDateChange = (value: string) => {
    setDate(value)
    setEmployeeId(null)
  }

  const cash = data?.byMethod.find(item => item.method === 'CASH')?.net ?? 0
  const digital = (data?.summary.net ?? 0) - cash

  return (
    <ReportLayout
      title='Cierre de caja'
      description='Lo cobrado en el día por medio de pago y por empleado, y el efectivo que debe haber en caja.'
      filters={
        <>
          <DayFilter value={date} onChange={handleDateChange} allowTomorrow={false} />
          <TextField
            select
            size='small'
            label='Empleado'
            value={employeeId ?? ''}
            onChange={event => setEmployeeId(event.target.value === '' ? null : Number(event.target.value))}
            className='min-is-[220px]'
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value=''>Todos</MenuItem>
            {employees.map(item => (
              <MenuItem key={item.employeeId} value={item.employeeId ?? ''}>
                {item.employeeName}
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
              { title: 'Efectivo en caja', stats: formatMoney(data.summary.cashExpected), icon: 'ri-money-dollar-box-line', color: 'success' },
              { title: 'Yape, Plin, tarjeta y otros', stats: formatMoney(digital), icon: 'ri-smartphone-line', color: 'info' },
              { title: 'Devoluciones', stats: formatMoney(data.summary.refunds), icon: 'ri-arrow-go-back-line', color: 'warning' },
              { title: 'Total neto del día', stats: formatMoney(data.summary.net), icon: 'ri-safe-2-line' }
            ]
          : undefined
      }
    />
  )
}

export default CashClosingReport
