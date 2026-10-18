'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { HOTEL_AUDIT_TYPES, getAuditApiErrorMessage, listAuditEvents, type AuditEvent } from '@/libs/auditApi'
import { limaToday } from '@/types/apps/frontDeskTypes'
import type { ReportDocument } from '@/views/apps/reports/document/reportDocument'
import { row } from '@/views/apps/reports/document/reportDocument'
import ReportLayout from '@/views/apps/reports/document/ReportLayout'

const formatWhen = (value: string) =>
  new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))

const AuditPage = () => {
  const { data: session } = useSession()
  const { canViewAudit, loaded } = useSubscriptionAccess()
  const propertyId = session?.user?.propertyId
  const hotelName = session?.user?.propertyName || 'Hotel'
  const [from, setFrom] = useState(limaToday())
  const [to, setTo] = useState(limaToday())
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<AuditEvent[]>([])

  const load = useCallback(async () => {
    if (!propertyId || !canViewAudit) return

    setLoading(true)
    setError(null)

    try {
      const page = await listAuditEvents(propertyId, {
        from,
        to,
        entityType: entityType || undefined,
        action: action || undefined,
        exportAll: true
      })

      setRows(page.data)
    } catch (err) {
      setRows([])
      setError(getAuditApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [propertyId, canViewAudit, from, to, entityType, action])

  useEffect(() => {
    void load()
  }, [load])

  const document = useMemo<ReportDocument | null>(() => {
    if (!rows.length && loading) return null

    return {
      fileName: `bitacora-${from}-${to}`,
      title: 'Bitácora',
      hotelName,
      period: `${from.split('-').reverse().join('/')} – ${to.split('-').reverse().join('/')}`,
      orientation: 'landscape',
      tables: [
        {
          columns: [
            { header: 'Fecha y hora', width: 18 },
            { header: 'Quién', width: 22 },
            { header: 'Qué pasó', width: 55 },
            { header: 'Motivo', width: 28 },
            { header: 'IP', width: 16 }
          ],
          rows: rows.map(item =>
            row([formatWhen(item.occurredAt), item.actorName, item.summary, item.reason ?? '', item.ipAddress ?? ''])
          ),
          emptyText: 'No hay cambios en estas fechas.'
        }
      ]
    }
  }, [rows, loading, from, to, hotelName])

  if (loaded && !canViewAudit) {
    return <Alert severity='info'>El administrador del hotel tiene que darle el permiso Ver bitácora.</Alert>
  }

  return (
    <ReportLayout
      title='Bitácora'
      description='Aquí se ve quién cambió un precio, anuló un comprobante o dio un permiso.'
      loading={loading}
      onRefresh={() => void load()}
      document={document}
      notice={error ? <Alert severity='error'>{error}</Alert> : null}
      filters={
        <>
          <TextField
            type='date'
            label='Desde'
            value={from}
            onChange={event => setFrom(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type='date'
            label='Hasta'
            value={to}
            onChange={event => setTo(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField select label='Registro' value={entityType} onChange={event => setEntityType(event.target.value)}>
            <MenuItem value=''>Todos</MenuItem>
            {HOTEL_AUDIT_TYPES.map(type => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label='Acción' value={action} onChange={event => setAction(event.target.value)}>
            <MenuItem value=''>Todas</MenuItem>
            <MenuItem value='CREATED'>Creó</MenuItem>
            <MenuItem value='UPDATED'>Cambió</MenuItem>
            <MenuItem value='DELETED'>Eliminó</MenuItem>
          </TextField>
        </>
      }
    />
  )
}

export default AuditPage
