'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { Locale } from '@configs/i18n'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { getLocalizedUrl } from '@/utils/i18n'
import { RECEPTION_PAYMENTS_CREATE } from '@/types/apps/hotelPermissions'
import type { AccountTone, GuestAccount } from '@/types/apps/frontDeskTypes'
import { accountTone, formatFrontDeskDate, limaToday, normalizeSearchText } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import DateField from '@/components/date-picker/DateField'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'
import PaymentDialog from './PaymentDialog'

type AccountFilter = 'collect' | 'paid'

const FILTERS: { id: AccountFilter; label: string }[] = [
  { id: 'collect', label: 'Por cobrar' },
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
  const { lang: locale } = useParams()
  const { data: session, status } = useSession()
  const { can, canIssueInvoices } = useSubscriptionAccess()
  const canCharge = can(RECEPTION_PAYMENTS_CREATE)
  const propertyId = session?.user?.propertyId ?? 1
  const [date, setDate] = useState(limaToday())
  const [filter, setFilter] = useState<AccountFilter>('collect')
  const [search, setSearch] = useState('')
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

  const query = normalizeSearchText(search)
  const visible = rows.filter(row => {
    const tone = accountTone(row.balance, row.paidAmount)
    const inTab = filter === 'paid' ? tone === 'paid' || tone === 'credit' : row.balance > 0

    if (!inTab) return false
    if (!query) return true

    const haystack = normalizeSearchText(
      [row.code, row.guestName, row.companyName, ...row.rooms.map(room => room.roomNumber)].filter(Boolean).join(' ')
    )

    return haystack.includes(query)
  })

  return (
    <>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
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
          <div className='flex w-full flex-wrap items-center gap-3 sm:w-auto'>
            <DateField label='Fecha' value={date} onChange={setDate} />
            <TextField
              size='small'
              placeholder='Habitación, huésped o reserva'
              value={search}
              onChange={event => setSearch(event.target.value)}
              className='min-is-[280px] is-full sm:is-auto'
            />
          </div>
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
                    <Typography color='text.secondary'>
                      {query
                        ? filter === 'paid'
                          ? 'Ninguna cuenta pagada coincide.'
                          : 'Ninguna cuenta por cobrar coincide.'
                        : filter === 'paid'
                          ? 'No hay cuentas pagadas en esta fecha.'
                          : 'No hay cuentas por cobrar en esta fecha.'}
                    </Typography>
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
                        {canIssueInvoices && row.balance <= 0 ? (
                          <Button
                            size='small'
                            variant='contained'
                            component={Link}
                            href={getLocalizedUrl(
                              `/apps/invoicing/issue?reservation=${row.reservationUuid}`,
                              locale as Locale
                            )}
                          >
                            Facturar
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
