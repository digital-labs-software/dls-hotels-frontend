'use client'

import type { ReactNode } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import { toast } from 'react-toastify'

import type { ThemeColor } from '@core/types'
import HorizontalWithAvatar from '@components/card-statistics/HorizontalWithAvatar'
import type { ReportDocument } from './reportDocument'
import { printReport } from './printReport'
import { downloadReportXlsx } from './xlsxReport'
import { ReportTables } from './ReportTableView'

export interface ReportStat {
  title: string
  stats: string
  icon: string
  color?: ThemeColor
}

type Props = {
  title: string
  description: string
  filters?: ReactNode
  loading: boolean
  onRefresh: () => void
  document: ReportDocument | null
  stats?: ReportStat[]
  excel?: boolean
  print?: boolean
  actions?: ReactNode
  notice?: ReactNode
  children?: ReactNode
}

const ReportLayout = ({
  title,
  description,
  filters,
  loading,
  onRefresh,
  document,
  stats,
  excel = true,
  print = true,
  actions,
  notice,
  children
}: Props) => {
  const handlePrint = () => {
    if (!document) return

    try {
      printReport(document)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo abrir la impresión.')
    }
  }

  const handleExcel = () => {
    if (!document) return

    try {
      downloadReportXlsx(document)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el Excel.')
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <Card>
        <CardHeader title={title} subheader={description} />
        <Divider />
        <CardContent className='flex flex-wrap items-end justify-between gap-4'>
          <div className='flex flex-wrap items-end gap-3'>{filters}</div>
          <div className='flex flex-wrap items-center gap-3'>
            {actions}
            <Button
              variant='outlined'
              color='secondary'
              startIcon={loading ? <CircularProgress size={16} color='inherit' /> : <i className='ri-refresh-line' />}
              onClick={onRefresh}
              disabled={loading}
            >
              Actualizar
            </Button>
            {print ? (
              <Button
                variant='contained'
                startIcon={<i className='ri-printer-line' />}
                onClick={handlePrint}
                disabled={!document || loading}
              >
                Imprimir o PDF
              </Button>
            ) : null}
            {excel ? (
              <Button
                variant='contained'
                color='success'
                startIcon={<i className='ri-file-excel-2-line' />}
                onClick={handleExcel}
                disabled={!document || loading}
              >
                Excel
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {notice}

      {stats?.length ? (
        <Grid container spacing={4}>
          {stats.map(item => (
            <Grid key={item.title} size={{ xs: 12, sm: 6, md: 4, lg: stats.length > 4 ? 2.4 : 3 }}>
              <HorizontalWithAvatar
                title={item.title}
                stats={item.stats}
                avatarIcon={item.icon}
                avatarColor={item.color ?? 'primary'}
                avatarSkin='light'
                avatarVariant='rounded'
                avatarSize={42}
              />
            </Grid>
          ))}
        </Grid>
      ) : null}

      <Card>
        {loading && !document ? (
          <div className='flex justify-center p-10'>
            <CircularProgress />
          </div>
        ) : children ? (
          children
        ) : document ? (
          <ReportTables document={document} />
        ) : (
          <Alert severity='info' className='m-5'>
            No se pudo cargar el reporte. Pulsa Actualizar para intentarlo de nuevo.
          </Alert>
        )}
      </Card>
    </div>
  )
}

export default ReportLayout
