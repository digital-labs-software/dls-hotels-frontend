'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { RECEPTION_PAYMENTS_CREATE } from '@/types/apps/hotelPermissions'
import type { AccountTone, GuestAccount } from '@/types/apps/frontDeskTypes'
import { accountTone, formatFrontDeskDate, limaToday } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import DateField from '@/components/date-picker/DateField'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'
import PaymentDialog from './PaymentDialog'

type AccountFilter = 'all' | AccountTone

const FILTERS: { id: AccountFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'due', label: 'Debe' },
  { id: 'partial', label: 'Adelantó' },
  { id: 'paid', label: 'Pagada' }
]

const toneLabel = (tone: AccountTone, balance: number) => {
  if (tone === 'due') return `Debe ${formatRoomPrice(balance)}`
  if (tone === 'partial') return `Falta ${formatRoomPrice(balance)}`
  if (tone === 'credit') return `A favor ${formatRoomPrice(Math.abs(balance))}`

  return 'Pagada'
}

const toneColor = (tone: AccountTone) => {
  if (tone === 'due') return 'error' as const
  if (tone === 'partial') return 'warning' as const
  if (tone === 'credit') return 'info' as const

  return 'success' as const
}

const AccountsTable = () => {
  const { data: session, status } = useSession()
  const { can } = useSubscriptionAccess()
  const canCharge = can(RECEPTION_PAYMENTS_CREATE)
  const propertyId = session?.user?.propertyId ?? 1
  const [date, setDate] = useState(limaToday())
  const [filter, setFilter] = useState<AccountFilter>('all')
  const [rows, setRows] = useState<GuestAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<GuestAccount | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const result = await frontDeskApi.accounts(propertyId, date)

      setRows(result.accounts)
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudieron cargar las cuentas.'))
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

  const visible = rows.filter(row => {
    const tone = accountTone(row.balance, row.paidAmount)

    if (filter === 'all') return true
    if (filter === 'paid') return tone === 'paid' || tone === 'credit'

    return tone === filter
  })

  return (
    <>
      <div className='flex flex-col gap-4'>
        <div>
          <Typography variant='h4'>Cuentas</Typography>
          <Typography variant='body2' color='text.secondary'>
            Quién está en el hotel en esta fecha. El cobro es de toda la reserva, no de cada habitación.
          </Typography>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <DateField label='Fecha' value={date} onChange={setDate} />
          {FILTERS.map(item => (
            <Chip
              key={item.id}
              clickable
              color={filter === item.id ? 'primary' : 'default'}
              variant={filter === item.id ? 'filled' : 'outlined'}
              label={item.label}
              onClick={() => setFilter(item.id)}
            />
          ))}
        </div>
        {loading ? (
          <div className='flex justify-center p-8'>
            <CircularProgress />
          </div>
        ) : (
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Reserva</TableCell>
                <TableCell>Huésped o agencia</TableCell>
                <TableCell>Habitaciones</TableCell>
                <TableCell>Estadía</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Pagado</TableCell>
                <TableCell>Saldo</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography color='text.secondary'>No hay cuentas en casa para esta fecha.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                visible.map(row => {
                  const tone = accountTone(row.balance, row.paidAmount)
                  const title = row.companyName || row.guestName || 'Sin nombre'
                  const guestAside = row.companyName && row.guestName ? row.guestName : null
                  const rooms = row.rooms.map(room => room.roomNumber || 'Sin asignar').join(', ') || '—'

                  return (
                    <TableRow key={row.reservationUuid}>
                      <TableCell>{row.code}</TableCell>
                      <TableCell>
                        <Typography variant='body2'>{title}</Typography>
                        {guestAside ? (
                          <Typography variant='caption' color='text.secondary'>
                            {guestAside}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>{rooms}</TableCell>
                      <TableCell>
                        <div className='flex flex-col gap-1'>
                          <span>
                            {formatFrontDeskDate(row.checkInDate)} – {formatFrontDeskDate(row.checkOutDate)}
                          </span>
                          {row.checkOutDate === date ? <Chip size='small' label='Sale hoy' color='warning' /> : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatRoomPrice(row.totalAmount)}</TableCell>
                      <TableCell>{formatRoomPrice(row.paidAmount)}</TableCell>
                      <TableCell>
                        <Chip size='small' color={toneColor(tone)} label={toneLabel(tone, row.balance)} />
                      </TableCell>
                      <TableCell>
                        {canCharge && row.balance > 0 ? (
                          <Button size='small' variant='contained' onClick={() => setPaying(row)}>
                            Cobrar
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
      <PaymentDialog
        open={Boolean(paying)}
        propertyId={propertyId}
        reservationUuid={paying?.reservationUuid}
        reservationCode={paying?.code}
        balance={paying?.balance}
        onClose={() => setPaying(null)}
        onSuccess={() => {
          setPaying(null)
          load()
        }}
      />
    </>
  )
}

export default AccountsTable
