'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import type { StayStatus } from '@/types/apps/frontDeskTypes'
import { BOOKING_STATUS_LABELS, SOURCE_LABELS, formatPlanningDate } from '@/types/apps/reservationsTypes'
import type { Reservation } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'

type Props = {
  propertyId: number
  refreshKey: number
  onOpen: (reservationUuid: string) => void
}

const STATUS_OPTIONS: StayStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW']

const ReservationListTable = ({ propertyId, refreshKey, onOpen }: Props) => {
  const [rows, setRows] = useState<Reservation[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<StayStatus | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    load()
  }, [load, refreshKey])

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
              setStatus(e.target.value as StayStatus | '')
            }}
          >
            <MenuItem value=''>Todos</MenuItem>
            {STATUS_OPTIONS.map(item => (
              <MenuItem key={item} value={item}>
                {BOOKING_STATUS_LABELS[item]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          type='date'
          label='Desde'
          value={from}
          onChange={e => {
            setPage(1)
            setFrom(e.target.value)
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          type='date'
          label='Hasta'
          value={to}
          onChange={e => {
            setPage(1)
            setTo(e.target.value)
          }}
          slotProps={{ inputLabel: { shrink: true } }}
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
                <TableCell>Titular</TableCell>
                <TableCell>Empresa</TableCell>
                <TableCell>Check-in (ingreso)</TableCell>
                <TableCell>Check-out (salida)</TableCell>
                <TableCell>Noches</TableCell>
                <TableCell>Habitaciones</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Saldo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Canal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11}>
                    <Typography color='text.secondary'>No hay reservas con estos filtros.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(row => (
                  <TableRow key={row.uuid} hover sx={{ cursor: 'pointer' }} onClick={() => onOpen(row.uuid)}>
                    <TableCell>
                      <Button size='small'>{row.code}</Button>
                    </TableCell>
                    <TableCell>
                      {row.guest ? `${row.guest.firstName} ${row.guest.lastName}` : '—'}
                    </TableCell>
                    <TableCell>{row.company?.businessName ?? '—'}</TableCell>
                    <TableCell>{formatPlanningDate(row.checkInDate)}</TableCell>
                    <TableCell>{formatPlanningDate(row.checkOutDate)}</TableCell>
                    <TableCell>{row.nights}</TableCell>
                    <TableCell>
                      {row.rooms.map(room => room.roomNumber || 'Sin asignar').join(', ') || '—'}
                    </TableCell>
                    <TableCell>{formatRoomPrice(row.totalAmount)}</TableCell>
                    <TableCell>{formatRoomPrice(row.balance)}</TableCell>
                    <TableCell>
                      <Chip size='small' label={BOOKING_STATUS_LABELS[row.status]} />
                    </TableCell>
                    <TableCell>{SOURCE_LABELS[row.source]}</TableCell>
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
    </div>
  )
}

export default ReservationListTable
