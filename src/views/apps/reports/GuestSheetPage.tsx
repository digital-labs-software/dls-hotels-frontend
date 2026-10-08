'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { GuestSheet } from '@/types/apps/reportTypes'
import { formatFrontDeskDate, limaToday } from '@/types/apps/frontDeskTypes'
import { getReportsApiErrorMessage, reportsApi } from '@/libs/reportsApi'
import DateField from '@/components/date-picker/DateField'
import { GUEST_SHEET_COLUMNS, downloadGuestSheetPdf, stayRowValues } from './guestSheetPdf'
import { downloadGuestSheetXlsx } from './guestSheetExcel'

const GuestSheetPage = () => {
  const { data: session, status } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const [date, setDate] = useState(limaToday())
  const [report, setReport] = useState<GuestSheet | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingXlsx, setDownloadingXlsx] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      setReport(await reportsApi.guestSheet(propertyId, date))
    } catch (error) {
      toast.error(getReportsApiErrorMessage(error, 'No se pudo cargar el parte de huéspedes.'))
    } finally {
      setLoading(false)
    }
  }, [date, propertyId])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    load()
  }, [load, status])

  const handleDownloadPdf = async () => {
    if (!report) {
      return
    }

    setDownloadingPdf(true)

    try {
      await downloadGuestSheetPdf(report)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el PDF.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleDownloadXlsx = () => {
    if (!report) {
      return
    }

    setDownloadingXlsx(true)

    try {
      downloadGuestSheetXlsx(report)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el Excel.')
    } finally {
      setDownloadingXlsx(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <Typography variant='h4' className='mbe-1'>
            Reportes
          </Typography>
          <Typography>Parte de huéspedes del día. Visualízalo o descárgalo en PDF o Excel.</Typography>
        </div>
        <div className='flex flex-wrap items-end gap-3'>
          <DateField label='Fecha' value={date} onChange={setDate} />
          <Button variant='outlined' color='secondary' startIcon={<i className='ri-eye-line' />} onClick={load} disabled={loading}>
            Visualizar
          </Button>
          <Button
            variant='contained'
            startIcon={<i className='ri-file-excel-2-line' />}
            onClick={handleDownloadXlsx}
            disabled={!report || downloadingXlsx}
          >
            {downloadingXlsx ? <CircularProgress size={18} color='inherit' /> : 'Descargar Excel'}
          </Button>
          <Button
            variant='outlined'
            startIcon={<i className='ri-download-2-line' />}
            onClick={handleDownloadPdf}
            disabled={!report || downloadingPdf}
          >
            {downloadingPdf ? <CircularProgress size={18} color='inherit' /> : 'Descargar PDF'}
          </Button>
        </div>
      </div>

      {report ? (
        <div className='flex flex-wrap gap-3'>
          <Card className='min-is-[140px]'>
            <CardContent>
              <Typography color='text.secondary'>Habitaciones</Typography>
              <Typography variant='h5'>{report.summary.totalRooms}</Typography>
            </CardContent>
          </Card>
          <Card className='min-is-[140px]'>
            <CardContent>
              <Typography color='text.secondary'>Ocupadas</Typography>
              <Typography variant='h5'>{report.summary.occupiedRooms}</Typography>
            </CardContent>
          </Card>
          <Card className='min-is-[140px]'>
            <CardContent>
              <Typography color='text.secondary'>Vacías</Typography>
              <Typography variant='h5'>{report.summary.vacantRooms}</Typography>
            </CardContent>
          </Card>
          <Card className='min-is-[140px]'>
            <CardContent>
              <Typography color='text.secondary'>Pax</Typography>
              <Typography variant='h5'>{report.summary.pax}</Typography>
            </CardContent>
          </Card>
          {report.summary.unassignedStays > 0 ? (
            <Card className='min-is-[140px]'>
              <CardContent>
                <Typography color='text.secondary'>Sin asignar</Typography>
                <Typography variant='h5'>{report.summary.unassignedStays}</Typography>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      <Card>
        {loading && !report ? (
          <div className='flex justify-center p-10'>
            <CircularProgress />
          </div>
        ) : !report ? (
          <Typography color='text.secondary' className='text-center p-8'>
            Elige una fecha y pulsa Visualizar.
          </Typography>
        ) : (
          <div className='overflow-x-auto'>
            <table className='border-collapse is-full text-sm'>
              <thead>
                <tr>
                  <th colSpan={12} className='border border-solid border-[var(--mui-palette-divider)] bg-[var(--mui-palette-action-hover)] p-3 text-center'>
                    <Typography variant='h6'>{report.hotelName.toUpperCase()}</Typography>
                    <Typography variant='body2'>Parte de huéspedes · {formatFrontDeskDate(report.date)}</Typography>
                  </th>
                </tr>
                <tr>
                  {GUEST_SHEET_COLUMNS.map(column => (
                    <th
                      key={column}
                      className='border border-solid border-[var(--mui-palette-divider)] p-2 text-start whitespace-nowrap'
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.floors.map(floor => (
                  <Fragment key={floor.floorId}>
                    <tr>
                      <td
                        colSpan={12}
                        className='border border-solid border-[var(--mui-palette-divider)] bg-[var(--mui-palette-primary-main)] text-[var(--mui-palette-primary-contrastText)] p-2 font-medium'
                      >
                        {floor.floorName} · ocupadas {floor.occupiedCount} · pax {floor.paxCount}
                      </td>
                    </tr>
                    {floor.rooms.map(room => {
                      const values = stayRowValues(room.stay)

                      return (
                        <tr key={room.uuid}>
                          <td className='border border-solid border-[var(--mui-palette-divider)] p-2 whitespace-nowrap'>
                            {room.number}
                          </td>
                          <td className='border border-solid border-[var(--mui-palette-divider)] p-2 whitespace-nowrap'>
                            {room.roomTypeName}
                          </td>
                          {values.map((value, index) => (
                            <td
                              key={`${room.uuid}-${index}`}
                              className='border border-solid border-[var(--mui-palette-divider)] p-2 whitespace-pre-line'
                            >
                              {value}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </Fragment>
                ))}
                {report.unassigned.length > 0 ? (
                  <Fragment>
                    <tr>
                      <td
                        colSpan={12}
                        className='border border-solid border-[var(--mui-palette-divider)] bg-[var(--mui-palette-warning-main)] text-[var(--mui-palette-warning-contrastText)] p-2 font-medium'
                      >
                        Sin habitación asignada · {report.unassigned.length}
                      </td>
                    </tr>
                    {report.unassigned.map(stay => {
                      const values = stayRowValues(stay)

                      return (
                        <tr key={stay.reservationRoomUuid}>
                          <td className='border border-solid border-[var(--mui-palette-divider)] p-2'>—</td>
                          <td className='border border-solid border-[var(--mui-palette-divider)] p-2'>—</td>
                          {values.map((value, index) => (
                            <td
                              key={`${stay.reservationRoomUuid}-${index}`}
                              className='border border-solid border-[var(--mui-palette-divider)] p-2 whitespace-pre-line'
                            >
                              {value}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </Fragment>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default GuestSheetPage
