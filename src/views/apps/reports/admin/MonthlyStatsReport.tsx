'use client'

import { useCallback, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'

import { reportsApi } from '@/libs/reportsApi'
import type { MonthlyStatsReport as MonthlyStatsData } from '@/types/apps/reportTypes'
import type { ReportDocument } from '../document/reportDocument'
import { formatMonth, formatPercent, formatShortDate, row, total } from '../document/reportDocument'
import ReportLayout from '../document/ReportLayout'
import { MonthFilter, currentMonth } from '../document/ReportFilters'
import { useReport } from '../document/useReport'

const CATEGORY_LABELS: Record<string, string> = {
  HOTEL: 'Hotel',
  HOSTAL: 'Hostal',
  HOSPEDAJE: 'Hospedaje',
  ALBERGUE: 'Albergue',
  RESORT: 'Resort',
  LODGE: 'Lodge',
  APART_HOTEL: 'Apart-hotel',
  CASA_HUESPEDES: 'Casa de huéspedes',
  BUNGALOW: 'Bungalow'
}

const decimal = (value: number) => value.toLocaleString('es-PE', { maximumFractionDigits: 2 })

export const buildMonthlyStatsDocument = (report: MonthlyStatsData): ReportDocument => ({
  fileName: `estadistica-mincetur-${report.month}`,
  title: 'Estadística mensual de establecimientos de hospedaje (MINCETUR)',
  hotelName: report.hotelName,
  period: `${formatMonth(report.month)}${report.taxNumber ? ` · RUC ${report.taxNumber}` : ''}`,
  orientation: 'portrait',
  summary: [
    { label: 'Razón social', value: report.businessName ?? report.hotelName },
    { label: 'Clase', value: CATEGORY_LABELS[report.category] ?? report.category },
    { label: 'Dirección', value: report.address }
  ],
  tables: [
    {
      title: 'Capacidad y ocupación',
      columns: [
        { header: 'Concepto', width: 40 },
        { header: 'Cantidad', kind: 'number', width: 14 }
      ],
      rows: [
        row(['Días del mes', report.daysInMonth]),
        row(['Habitaciones', report.rooms]),
        row(['Plazas-cama', report.beds]),
        row(['Habitaciones-noche disponibles', report.roomNightsAvailable]),
        row(['Habitaciones-noche ocupadas', report.roomNightsSold]),
        row(['Plazas-cama-noche disponibles', report.bedNightsAvailable]),
        row(['Tasa de ocupación de habitaciones (%)', decimal(report.roomOccupancyPct)]),
        row(['Tasa de ocupación de camas (%)', decimal(report.bedOccupancyPct)]),
        row(['Estadía promedio (noches por huésped)', decimal(report.averageStay)])
      ]
    },
    {
      title: 'Arribos y pernoctaciones',
      columns: [
        { header: 'Huéspedes', width: 40 },
        { header: 'Arribos', kind: 'number', width: 12 },
        { header: 'Pernoctaciones', kind: 'number', width: 14 }
      ],
      rows: [
        row(['Nacionales (con DNI)', report.arrivals.nationals, report.overnights.nationals]),
        row(['Extranjeros (pasaporte o carné de extranjería)', report.arrivals.foreigners, report.overnights.foreigners]),
        ...(report.arrivals.unknown || report.overnights.unknown
          ? [row(['Sin documento registrado', report.arrivals.unknown, report.overnights.unknown], 'warning')]
          : []),
        total(['Total', report.arrivals.total, report.overnights.total])
      ]
    },
    {
      title: 'Detalle por día',
      columns: [
        { header: 'Fecha', width: 11 },
        { header: 'Hab. ocupadas', kind: 'number', width: 11 },
        { header: 'Arribos nacionales', kind: 'number', width: 11 },
        { header: 'Arribos extranjeros', kind: 'number', width: 11 },
        { header: 'Pernoct. nacionales', kind: 'number', width: 11 },
        { header: 'Pernoct. extranjeros', kind: 'number', width: 11 },
        { header: 'Sin documento', kind: 'number', width: 10 }
      ],
      rows: [
        ...report.days.map(day =>
          row(
            [
              formatShortDate(day.date),
              day.roomsOccupied,
              day.arrivals.nationals,
              day.arrivals.foreigners,
              day.overnights.nationals,
              day.overnights.foreigners,
              day.overnights.unknown
            ],
            day.roomsOccupied === 0 ? 'muted' : undefined
          )
        ),
        total([
          'Total',
          report.roomNightsSold,
          report.arrivals.nationals,
          report.arrivals.foreigners,
          report.overnights.nationals,
          report.overnights.foreigners,
          report.overnights.unknown
        ])
      ]
    }
  ],
  notes: [
    'Arribo: huésped que hizo su ingreso en el mes. Pernoctación: cada noche que durmió un huésped.',
    'Nacional o extranjero se toma del documento de identidad. Los acompañantes sin ficha se cuentan con el titular.',
    'Solo se cuentan estadías con ingreso registrado en el sistema.'
  ],
  signatures: ['Responsable del establecimiento']
})

const MonthlyStatsReport = () => {
  const [month, setMonth] = useState(currentMonth())
  const fetcher = useCallback((propertyId: number) => reportsApi.monthlyStats(propertyId, month), [month])
  const { data, loading, reload } = useReport(fetcher, 'No se pudo cargar la estadística mensual.')
  const document = useMemo(() => (data ? buildMonthlyStatsDocument(data) : null), [data])

  return (
    <ReportLayout
      title='Estadística MINCETUR'
      description='Los datos del mes que pide la encuesta mensual de hospedajes: arribos, pernoctaciones y ocupación.'
      filters={<MonthFilter value={month} onChange={setMonth} />}
      loading={loading}
      onRefresh={reload}
      document={document}
      notice={
        <Alert severity='info'>
          El sistema aún no guarda el país de cada huésped: nacional o extranjero se calcula con el tipo de documento
          (DNI o pasaporte/carné). Si MINCETUR te pide el detalle por país o región, complétalo a mano.
        </Alert>
      }
      stats={
        data
          ? [
              { title: 'Arribos', stats: String(data.arrivals.total), icon: 'ri-login-box-line' },
              { title: 'Pernoctaciones', stats: String(data.overnights.total), icon: 'ri-moon-line', color: 'info' },
              { title: 'Ocupación de habitaciones', stats: formatPercent(data.roomOccupancyPct), icon: 'ri-hotel-line', color: 'success' },
              {
                title: 'Extranjeros',
                stats: `${data.arrivals.foreigners} de ${data.arrivals.total}`,
                icon: 'ri-earth-line',
                color: 'warning'
              }
            ]
          : undefined
      }
    />
  )
}

export default MonthlyStatsReport
