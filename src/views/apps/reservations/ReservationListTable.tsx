'use client'

import { useCallback, useEffect, useState } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import type { Reservation, ReservationStatus } from '@/types/apps/frontDeskTypes'
import { formatPlanningDate, stayStatusChipSx } from '@/types/apps/reservationsTypes'
import { STAY_STATUS_LABELS, headlineStayStatus } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'
import DateField from '@/components/date-picker/DateField'

type Props = {
  propertyId: number
  refreshKey: number
  canPay: boolean
  canCancel: boolean
  canEditStatus: boolean
  onOpen: (reservationUuid: string) => void
  onPay: (row: Reservation) => void
  onChanged: () => void
  onStatusChanged: () => void
}

const bookerName = (row: Reservation) => {
  if (row.company?.businessName) return row.company.businessName
  if (row.guest) return `${row.guest.firstName} ${row.guest.lastName}`.replace(/\s+/g, ' ').trim()

  return 'Sin nombre'
}

const canCancelRow = (row: Reservation) =>
  (row.status === 'PENDING' || row.status === 'CONFIRMED') &&
  !row.rooms.some(line => line.status === 'CHECKED_IN' || line.status === 'CHECKED_OUT')

/** Solo se alterna mientras ninguna habitación entró, salió o quedó como no se presentó. */
const canToggleStatus = (row: Reservation) =>
  (row.status === 'PENDING' || row.status === 'CONFIRMED') &&
  row.rooms.every(line => line.status === 'PENDING' || line.status === 'CONFIRMED' || line.status === 'CANCELLED')

const STATUS_OPTIONS: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED']

const ReservationListTable = ({
  propertyId,
  refreshKey,
  canPay,
  canCancel,
  canEditStatus,
  onOpen,
  onPay,
  onChanged,
  onStatusChanged
}: Props) => {
  const [rows, setRows] = useState<Reservation[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<ReservationStatus | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [cancelRow, setCancelRow] = useState<Reservation | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [statusUuid, setStatusUuid] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const result = await reservationsApi.list(propertyId, {
        page,
        limit: 20,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        search: search.trim() || undefined
      })

      setRows(result.data)
      setTotalPages(result.meta.totalPages || 1)
      setTotal(result.meta.total)
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo cargar la lista de reservas.'))
    } finally {
      setLoading(false)
    }
  }, [from, page, propertyId, search, status, to])

  const confirmCancel = async () => {
    if (!cancelRow || !cancelReason.trim()) {
      toast.error('Indica el motivo de cancelación.')

      return
    }

    setCancelling(true)

    try {
      await reservationsApi.cancel(propertyId, cancelRow.uuid, cancelReason.trim())
      toast.success('Reserva cancelada.')
      setCancelRow(null)
      setCancelReason('')
      onChanged()
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo cancelar.'))
    } finally {
      setCancelling(false)
    }
  }

  const toggleStatus = async (row: Reservation, confirmed: boolean) => {
    const next = confirmed ? 'CONFIRMED' : 'PENDING'

    setStatusUuid(row.uuid)

    try {
      const updated = await reservationsApi.update(propertyId, row.uuid, { status: next })

      setRows(current => current.map(item => (item.uuid === row.uuid ? { ...item, ...updated } : item)))
      toast.success(confirmed ? 'Reserva confirmada.' : 'Reserva en pendiente.')
      onStatusChanged()
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo cambiar el estado.'))
    } finally {
      setStatusUuid(null)
    }
  }

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const showActions = canPay || canCancel

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap gap-3'>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel id='list-status'>Estado</InputLabel>
          <Select
            labelId='list-status'
            label='Estado'
            value={status}
            onChange={e => {
              setPage(1)
              setStatus(e.target.value as ReservationStatus | '')
            }}
          >
            <MenuItem value=''>Todos</MenuItem>
            {STATUS_OPTIONS.map(item => (
              <MenuItem key={item} value={item}>
                {STAY_STATUS_LABELS[item]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <DateField
          label='Desde'
          value={from}
          clearable
          onChange={value => {
            setPage(1)
            setFrom(value)
          }}
        />
        <DateField
          label='Hasta'
          value={to}
          clearable
          minDate={from || undefined}
          onChange={value => {
            setPage(1)
            setTo(value)
          }}
        />
        <TextField
          label='Buscar'
          placeholder='Código, huésped o empresa'
          value={search}
          onChange={e => {
            setPage(1)
            setSearch(e.target.value)
          }}
        />
        <Tooltip title='Actualizar'>
          <span>
            <IconButton color='secondary' onClick={() => void load()} disabled={loading} aria-label='Actualizar'>
              <i className='ri-refresh-line' />
            </IconButton>
          </span>
        </Tooltip>
      </div>

      {loading ? (
        <div className='flex justify-center p-8'>
          <CircularProgress />
        </div>
      ) : (
        <>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Quién reserva</TableCell>
                <TableCell>Check-in (ingreso)</TableCell>
                <TableCell>Check-out (salida)</TableCell>
                <TableCell>Noches</TableCell>
                <TableCell>Habitaciones</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Saldo</TableCell>
                <TableCell>Estado</TableCell>
                {showActions ? <TableCell>Acciones</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showActions ? 10 : 9}>
                    <Typography color='text.secondary'>No hay reservas con estos filtros.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(row => (
                  <TableRow key={row.uuid}>
                    <TableCell>
                      <Button size='small' onClick={() => onOpen(row.uuid)}>
                        {row.code}
                      </Button>
                    </TableCell>
                    <TableCell>{bookerName(row)}</TableCell>
                    <TableCell>{formatPlanningDate(row.checkInDate)}</TableCell>
                    <TableCell>{formatPlanningDate(row.checkOutDate)}</TableCell>
                    <TableCell>{row.nights}</TableCell>
                    <TableCell>
                      {row.rooms.length === 0
                        ? '—'
                        : row.rooms.map((room, index) => (
                            <span key={room.uuid}>
                              {index > 0 ? ', ' : null}
                              {room.roomNumber ? (
                                room.roomNumber
                              ) : (
                                <Typography
                                  component='span'
                                  variant='body2'
                                  fontWeight={700}
                                  sx={{ color: theme => (theme.palette.mode === 'dark' ? '#FFB400' : '#BF360C') }}
                                >
                                  Sin asignar
                                </Typography>
                              )}
                            </span>
                          ))}
                    </TableCell>
                    <TableCell>{formatRoomPrice(row.totalAmount)}</TableCell>
                    <TableCell>{formatRoomPrice(row.balance)}</TableCell>
                    <TableCell>
                      {canEditStatus && canToggleStatus(row) ? (
                        <div className='flex items-center gap-1 whitespace-nowrap'>
                          <Switch
                            size='small'
                            checked={row.status === 'CONFIRMED'}
                            disabled={statusUuid === row.uuid}
                            inputProps={{ 'aria-label': `Confirmar la reserva ${row.code}` }}
                            onChange={(_, checked) => void toggleStatus(row, checked)}
                          />
                          <Typography variant='body2'>
                            {row.status === 'CONFIRMED' ? 'Confirmada' : 'Pendiente'}
                          </Typography>
                        </div>
                      ) : (
                        <Chip
                          size='small'
                          label={STAY_STATUS_LABELS[headlineStayStatus(row)]}
                          sx={stayStatusChipSx(headlineStayStatus(row))}
                        />
                      )}
                    </TableCell>
                    {showActions ? (
                      <TableCell onClick={event => event.stopPropagation()}>
                        <div className='flex flex-nowrap items-center gap-1'>
                          {canPay ? (
                            <Button size='small' className='whitespace-nowrap' onClick={() => onPay(row)}>
                              Pago o devolución
                            </Button>
                          ) : null}
                          {canCancel && canCancelRow(row) ? (
                            <Button
                              size='small'
                              color='error'
                              className='whitespace-nowrap'
                              onClick={() => {
                                setCancelReason('')
                                setCancelRow(row)
                              }}
                            >
                              Cancelar
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className='flex items-center justify-between'>
            <Typography variant='body2' color='text.secondary'>
              {total} reserva{total === 1 ? '' : 's'}
            </Typography>
            <Pagination page={page} count={totalPages} onChange={(_, next) => setPage(next)} />
          </div>
        </>
      )}
      <Dialog open={Boolean(cancelRow)} onClose={() => !cancelling && setCancelRow(null)} fullWidth maxWidth='xs'>
        <DialogTitle>Cancelar reserva</DialogTitle>
        <DialogContent className='flex flex-col gap-3 pt-4'>
          {cancelRow ? (
            <div className='flex flex-col gap-1'>
              <Typography fontWeight={600}>
                {cancelRow.code} · {bookerName(cancelRow)}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {formatPlanningDate(cancelRow.checkInDate)} – {formatPlanningDate(cancelRow.checkOutDate)}
              </Typography>
            </div>
          ) : null}
          <TextField
            fullWidth
            label='Motivo'
            value={cancelReason}
            onChange={event => setCancelReason(event.target.value)}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelRow(null)} disabled={cancelling}>
            Volver
          </Button>
          <Button color='error' variant='contained' disabled={cancelling} onClick={() => void confirmCancel()}>
            Cancelar reserva
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default ReservationListTable
