'use client'

import { useCallback, useEffect, useState } from 'react'

import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import DeleteReasonDialog from '@/components/dialogs/DeleteReasonDialog'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { Locale } from '@configs/i18n'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { cashApi, getCashApiErrorMessage, type CashierOption, type CashSession, type CashSessionDetail } from '@/libs/cashApi'
import { PAYMENT_METHOD_LABELS } from '@/types/apps/frontDeskTypes'
import { getLocalizedUrl } from '@/utils/i18n'
import { buildCashSessionDocument, cashMethodRows, collectedTotal } from '@views/apps/reports/document/cashSessionDocument'
import { formatDateTime, formatMoney, formatTime } from '@views/apps/reports/document/reportDocument'
import { openReportPdf } from '@views/apps/reports/document/openReportPdf'

const moneyValue = (value: string) => {
  const parsed = Number(value.replace(',', '.'))

  return Number.isFinite(parsed) ? parsed : null
}

const differenceLabel = (session: CashSession) => {
  if (session.difference === null) {
    return 'Aún no se cuenta'
  }

  if (session.difference === 0) {
    return 'Cuadra'
  }

  return session.difference > 0
    ? `Sobra ${formatMoney(session.difference)}`
    : `Falta ${formatMoney(Math.abs(session.difference))}`
}

const CashPage = () => {
  const { data: session, status } = useSession()
  const { canViewCash, canOpenCash, canRecordCashExpense, canCloseCash, loaded } = useSubscriptionAccess()
  const router = useRouter()
  const { lang: locale } = useParams()
  const propertyId = session?.user?.propertyId
  const hotelName = session?.user?.propertyName || 'Hotel'
  const myEmployeeUuid = session?.user?.employeeUuid ?? ''

  const [current, setCurrent] = useState<CashSessionDetail | null>(null)
  const [history, setHistory] = useState<CashSession[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cashiers, setCashiers] = useState<CashierOption[]>([])
  const [cashierUuid, setCashierUuid] = useState('')
  const [openingAmount, setOpeningAmount] = useState('0')
  const [openNotes, setOpenNotes] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNotes, setExpenseNotes] = useState('')
  const [reinforcementAmount, setReinforcementAmount] = useState('')
  const [reinforcementNotes, setReinforcementNotes] = useState('')
  const [countedCash, setCountedCash] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [pendingRemoval, setPendingRemoval] = useState<{ kind: 'expense' | 'reinforcement'; uuid: string } | null>(null)

  const load = useCallback(async () => {
    if (!propertyId) {
      return
    }

    setLoading(true)

    try {
      const [openSession, turns, people] = await Promise.all([
        cashApi.current(propertyId),
        cashApi.list(propertyId),
        canOpenCash ? cashApi.cashiers(propertyId) : Promise.resolve([])
      ])

      setCurrent(openSession)
      setHistory(turns)
      setCashiers(people)
      setCashierUuid(currentId => {
        if (currentId && people.some(person => person.uuid === currentId)) {
          return currentId
        }

        if (people.some(person => person.uuid === myEmployeeUuid)) {
          return myEmployeeUuid
        }

        return people[0]?.uuid ?? ''
      })
    } catch (error) {
      toast.error(getCashApiErrorMessage(error, 'No se pudo cargar la caja.'))
    } finally {
      setLoading(false)
    }
  }, [canOpenCash, myEmployeeUuid, propertyId])

  useEffect(() => {
    if (status === 'loading' || !loaded) {
      return
    }

    if (!canViewCash) {
      router.replace(getLocalizedUrl('/apps/dashboard', locale as Locale))

      return
    }

    void load()
  }, [canViewCash, load, loaded, locale, router, status])

  const printSession = async (uuid: string) => {
    if (!propertyId) {
      return
    }

    try {
      const detail = uuid === current?.uuid && current ? current : await cashApi.findOne(propertyId, uuid)

      await openReportPdf(buildCashSessionDocument(detail, hotelName))
    } catch (error) {
      toast.error(getCashApiErrorMessage(error, 'No se pudo preparar el cierre de caja.'))
    }
  }

  const openCash = async () => {
    if (!propertyId) {
      return
    }

    const amount = moneyValue(openingAmount)

    if (amount === null || amount < 0) {
      toast.error('Escribe el sencillo con el que se abre la caja. Puede ser 0.')

      return
    }

    if (!cashierUuid) {
      toast.error('Elige al recepcionista que va a tener el efectivo.')

      return
    }

    setSaving(true)

    try {
      const opened = await cashApi.open(propertyId, {
        openingAmount: amount,
        cashierUuid,
        notes: openNotes.trim() || undefined
      })

      setCurrent(opened)
      setOpenNotes('')
      toast.success('Caja abierta.')
      await load()
    } catch (error) {
      toast.error(getCashApiErrorMessage(error, 'No se pudo abrir la caja.'))
    } finally {
      setSaving(false)
    }
  }

  const addReinforcement = async () => {
    if (!propertyId || !current) {
      return
    }

    const amount = moneyValue(reinforcementAmount)

    if (amount === null || amount <= 0) {
      toast.error('Escribe cuánto entró a la caja.')

      return
    }

    if (!reinforcementNotes.trim()) {
      toast.error('Escribe de dónde entró el dinero.')

      return
    }

    setSaving(true)

    try {
      const updated = await cashApi.addReinforcement(propertyId, current.uuid, {
        amount,
        notes: reinforcementNotes.trim()
      })

      setCurrent(updated)
      setReinforcementAmount('')
      setReinforcementNotes('')
      toast.success('Refuerzo registrado.')
    } catch (error) {
      toast.error(getCashApiErrorMessage(error, 'No se pudo registrar el refuerzo.'))
    } finally {
      setSaving(false)
    }
  }

  const confirmRemoval = async (reason: string) => {
    if (!propertyId || !current || !pendingRemoval) {
      return
    }

    setSaving(true)

    try {
      const updated =
        pendingRemoval.kind === 'expense'
          ? await cashApi.removeExpense(propertyId, current.uuid, pendingRemoval.uuid, reason)
          : await cashApi.removeReinforcement(propertyId, current.uuid, pendingRemoval.uuid, reason)

      setCurrent(updated)
      setPendingRemoval(null)
    } catch (error) {
      toast.error(
        getCashApiErrorMessage(
          error,
          pendingRemoval.kind === 'expense' ? 'No se pudo quitar el egreso.' : 'No se pudo quitar el refuerzo.'
        )
      )
    } finally {
      setSaving(false)
    }
  }

  const addExpense = async () => {
    if (!propertyId || !current) {
      return
    }

    const amount = moneyValue(expenseAmount)

    if (amount === null || amount <= 0) {
      toast.error('Escribe cuánto salió de la caja.')

      return
    }

    if (!expenseNotes.trim()) {
      toast.error('Escribe para qué salió el dinero.')

      return
    }

    setSaving(true)

    try {
      const updated = await cashApi.addExpense(propertyId, current.uuid, {
        amount,
        notes: expenseNotes.trim()
      })

      setCurrent(updated)
      setExpenseAmount('')
      setExpenseNotes('')
      toast.success('Egreso registrado.')
    } catch (error) {
      toast.error(getCashApiErrorMessage(error, 'No se pudo registrar el egreso.'))
    } finally {
      setSaving(false)
    }
  }

  const closeCash = async () => {
    if (!propertyId || !current) {
      return
    }

    const counted = moneyValue(countedCash)

    if (counted === null || counted < 0) {
      toast.error('Escribe el efectivo que contaste.')

      return
    }

    setSaving(true)

    try {
      const closed = await cashApi.close(propertyId, current.uuid, {
        countedCash: counted,
        notes: closeNotes.trim() || undefined
      })

      setCurrent(null)
      setCountedCash('')
      setCloseNotes('')
      toast.success('Caja cerrada. Puedes abrir el siguiente turno.')
      await openReportPdf(buildCashSessionDocument(closed, hotelName))
      await load()
    } catch (error) {
      toast.error(getCashApiErrorMessage(error, 'No se pudo cerrar la caja.'))
    } finally {
      setSaving(false)
    }
  }

  if (!loaded || !canViewCash || loading) {
    return (
      <div className='flex justify-center p-10'>
        <CircularProgress />
      </div>
    )
  }

  const methodRows = current ? cashMethodRows(current.byMethod) : []
  const collected = current ? collectedTotal(current.byMethod) : 0

  return (
    <div className='flex flex-col gap-6'>
      {current ? (
        <div className='flex flex-wrap justify-end gap-2'>
          <Button variant='outlined' color='secondary' startIcon={<i className='ri-refresh-line' />} onClick={() => void load()}>
            Actualizar
          </Button>
          <Button variant='outlined' startIcon={<i className='ri-file-pdf-2-line' />} onClick={() => void printSession(current.uuid)}>
            Ver cierre de caja
          </Button>
        </div>
      ) : null}

      {current ? (
        <>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
            <Card>
              <CardContent>
                <Typography color='text.secondary'>Monto inicial</Typography>
                <Typography variant='h5'>{formatMoney(current.openingAmount)}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color='text.secondary'>Refuerzo</Typography>
                <Typography variant='h5'>{formatMoney(current.reinforcementTotal)}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color='text.secondary'>Efectivo cobrado</Typography>
                <Typography variant='h5'>{formatMoney(current.cashCharges)}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color='text.secondary'>Devoluciones y egresos</Typography>
                <Typography variant='h5'>{formatMoney(current.cashRefunds + current.expenseTotal)}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color='text.secondary'>{current.cashExpected < 0 ? 'Faltante' : 'Efectivo a entregar'}</Typography>
                <Typography
                  variant='h5'
                  color={current.cashExpected < 0 ? 'error.main' : current.cashExpected === 0 ? 'text.primary' : 'success.main'}
                >
                  {formatMoney(current.cashExpected)}
                </Typography>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className='flex flex-col gap-4'>
              <div className='flex flex-wrap items-center gap-2'>
                <Chip color='success' label='Abierta' />
                <Typography variant='h6'>{current.number}</Typography>
                <Typography>
                  Cajero: <strong>{current.cashier.name}</strong>
                </Typography>
                <Typography color='text.secondary'>
                  Abrió {current.openedBy.name} · {formatDateTime(current.openedAt)}
                </Typography>
              </div>
              <Typography variant='h6'>Cobrado hasta ahora</Typography>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Medio de pago</TableCell>
                    <TableCell align='right'>Monto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {methodRows.map(item => (
                    <TableRow key={item.method}>
                      <TableCell>{item.label}</TableCell>
                      <TableCell align='right'>{formatMoney(item.net)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className='font-semibold border-bs-2'>Total cobrado en el turno</TableCell>
                    <TableCell align='right' className='font-semibold border-bs-2 text-lg'>
                      {formatMoney(collected)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card
            className='border-2'
            sx={{
              borderColor:
                current.cashExpected < 0 ? 'error.main' : current.cashExpected === 0 ? 'divider' : 'success.main'
            }}
          >
            <CardContent className='flex flex-col gap-1'>
              <Typography
                color={current.cashExpected < 0 ? 'error.main' : current.cashExpected === 0 ? 'text.primary' : 'success.main'}
                className='font-medium uppercase'
              >
                {current.cashExpected < 0 ? 'Faltante' : 'Efectivo a entregar'}
              </Typography>
              <Typography
                variant='h3'
                color={current.cashExpected < 0 ? 'error.main' : current.cashExpected === 0 ? 'text.primary' : 'success.main'}
              >
                {formatMoney(current.cashExpected)}
              </Typography>
              <Typography color='text.secondary'>
                Monto inicial {formatMoney(current.openingAmount)} + refuerzo {formatMoney(current.reinforcementTotal)} +
                efectivo {formatMoney(current.cashCharges)} − devoluciones {formatMoney(current.cashRefunds)} − egresos{' '}
                {formatMoney(current.expenseTotal)}. Yape, Plin, transferencia y tarjeta ya están en la cuenta del hotel.
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='flex flex-col gap-4'>
              <Typography variant='h6'>Refuerzo</Typography>
              {canRecordCashExpense ? (
                <div className='flex flex-wrap items-end gap-3'>
                  <TextField
                    label='Monto'
                    value={reinforcementAmount}
                    onChange={event => setReinforcementAmount(event.target.value)}
                    className='min-is-[140px]'
                    placeholder='50.00'
                  />
                  <TextField
                    label='¿De dónde entró?'
                    value={reinforcementNotes}
                    onChange={event => setReinforcementNotes(event.target.value)}
                    className='min-is-[280px] is-full max-is-[480px]'
                    placeholder='Para gastos del turno'
                  />
                  <Button variant='contained' disabled={saving} onClick={() => void addReinforcement()}>
                    Registrar refuerzo
                  </Button>
                </div>
              ) : null}
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Hora</TableCell>
                    <TableCell>De dónde</TableCell>
                    <TableCell align='right'>Monto</TableCell>
                    <TableCell>Registró</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {current.reinforcements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>No ha entrado refuerzo a esta caja.</TableCell>
                    </TableRow>
                  ) : (
                    current.reinforcements.map(reinforcement => (
                      <TableRow key={reinforcement.uuid}>
                        <TableCell>{formatTime(reinforcement.receivedAt)}</TableCell>
                        <TableCell>{reinforcement.notes}</TableCell>
                        <TableCell align='right'>{formatMoney(reinforcement.amount)}</TableCell>
                        <TableCell>{reinforcement.employeeName}</TableCell>
                        <TableCell align='right'>
                          {canRecordCashExpense ? (
                            <IconButton
                              aria-label='Quitar refuerzo'
                              disabled={saving}
                              onClick={() => setPendingRemoval({ kind: 'reinforcement', uuid: reinforcement.uuid })}
                            >
                              <i className='ri-delete-bin-line' />
                            </IconButton>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='flex flex-col gap-4'>
              <Typography variant='h6'>Egresos</Typography>
              {canRecordCashExpense ? (
                <div className='flex flex-wrap items-end gap-3'>
                  <TextField
                    label='Monto'
                    value={expenseAmount}
                    onChange={event => setExpenseAmount(event.target.value)}
                    className='min-is-[140px]'
                    placeholder='12.00'
                  />
                  <TextField
                    label='¿Para qué salió?'
                    value={expenseNotes}
                    onChange={event => setExpenseNotes(event.target.value)}
                    className='min-is-[280px] is-full max-is-[480px]'
                    placeholder='Almuerzo, pan, plomero…'
                  />
                  <Button variant='contained' disabled={saving} onClick={() => void addExpense()}>
                    Registrar egreso
                  </Button>
                </div>
              ) : null}
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Hora</TableCell>
                    <TableCell>Para qué</TableCell>
                    <TableCell align='right'>Monto</TableCell>
                    <TableCell>Registró</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {current.expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>No ha salido dinero de esta caja.</TableCell>
                    </TableRow>
                  ) : (
                    current.expenses.map(expense => (
                      <TableRow key={expense.uuid}>
                        <TableCell>{formatTime(expense.spentAt)}</TableCell>
                        <TableCell>{expense.notes}</TableCell>
                        <TableCell align='right'>{formatMoney(expense.amount)}</TableCell>
                        <TableCell>{expense.employeeName}</TableCell>
                        <TableCell align='right'>
                          {canRecordCashExpense ? (
                            <IconButton aria-label='Quitar egreso' disabled={saving} onClick={() => setPendingRemoval({ kind: 'expense', uuid: expense.uuid })}>
                              <i className='ri-delete-bin-line' />
                            </IconButton>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='flex flex-col gap-4'>
              <Typography variant='h6'>Cobros y devoluciones de este turno</Typography>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Hora</TableCell>
                    <TableCell>Reserva</TableCell>
                    <TableCell>Titular</TableCell>
                    <TableCell>Medio</TableCell>
                    <TableCell>N° operación</TableCell>
                    <TableCell>Cobró</TableCell>
                    <TableCell align='right'>Monto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {current.payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>Todavía no hay cobros ligados a esta caja.</TableCell>
                    </TableRow>
                  ) : (
                    current.payments.map(payment => (
                      <TableRow key={payment.uuid}>
                        <TableCell>{formatTime(payment.paidAt)}</TableCell>
                        <TableCell>{payment.reservationCode}</TableCell>
                        <TableCell>{payment.holderName}</TableCell>
                        <TableCell>{PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}</TableCell>
                        <TableCell>{payment.reference ?? ''}</TableCell>
                        <TableCell>{payment.employeeName}</TableCell>
                        <TableCell align='right'>{formatMoney(payment.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {canCloseCash ? (
            <Card>
              <CardContent className='flex flex-col gap-4'>
                <Typography variant='h6'>Cerrar caja</Typography>
                <Typography color='text.secondary'>
                  Cuenta solo los billetes y monedas. El {current.cashExpected < 0 ? 'faltante' : 'efectivo a entregar'} es{' '}
                  {formatMoney(current.cashExpected)}.
                </Typography>
                <div className='flex flex-wrap items-end gap-3'>
                  <TextField
                    label='Efectivo contado'
                    value={countedCash}
                    onChange={event => setCountedCash(event.target.value)}
                    className='min-is-[140px]'
                  />
                  <TextField
                    label='Nota'
                    value={closeNotes}
                    onChange={event => setCloseNotes(event.target.value)}
                    className='min-is-[280px] is-full max-is-[480px]'
                    placeholder='Opcional'
                  />
                  <Button variant='contained' color='warning' className='shrink-0' disabled={saving} onClick={() => void closeCash()}>
                    Cerrar caja
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <CardContent className='flex flex-col gap-4'>
            <Typography variant='h6'>No hay caja abierta</Typography>
            {canOpenCash ? (
              <>
                <Typography color='text.secondary'>
                  Elige al recepcionista que va a tener el efectivo. Escribe el monto inicial que deja la administración. Si no deja nada, abre con 0.
                </Typography>
                <div className='flex flex-wrap items-end gap-3'>
                  <TextField
                    select
                    label='Cajero'
                    value={cashierUuid}
                    onChange={event => setCashierUuid(event.target.value)}
                    className='min-is-[240px]'
                  >
                    {cashiers.map(person => (
                      <MenuItem key={person.uuid} value={person.uuid}>
                        {person.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label='Monto inicial'
                    value={openingAmount}
                    onChange={event => setOpeningAmount(event.target.value)}
                    className='min-is-[180px]'
                  />
                  <TextField
                    label='Nota'
                    value={openNotes}
                    onChange={event => setOpenNotes(event.target.value)}
                    className='min-is-[280px]'
                    placeholder='Turno de la mañana'
                  />
                  <Button variant='contained' disabled={saving} onClick={() => void openCash()}>
                    Abrir caja
                  </Button>
                </div>
              </>
            ) : (
              <Alert severity='warning'>No tienes permiso para abrir la caja.</Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className='flex flex-col gap-4'>
          <Typography variant='h6'>Turnos anteriores</Typography>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Turno</TableCell>
                <TableCell>Cajero</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Abrió</TableCell>
                <TableCell>Cerró</TableCell>
                <TableCell align='right'>Efectivo a entregar</TableCell>
                <TableCell align='right'>Contado</TableCell>
                <TableCell>Diferencia</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>Todavía no hay turnos de caja.</TableCell>
                </TableRow>
              ) : (
                history.map(turn => (
                  <TableRow key={turn.uuid}>
                    <TableCell>{turn.number}</TableCell>
                    <TableCell>{turn.cashier.name}</TableCell>
                    <TableCell>{turn.status === 'OPEN' ? 'Abierta' : 'Cerrada'}</TableCell>
                    <TableCell>
                      {turn.openedBy.name}
                      <br />
                      {formatDateTime(turn.openedAt)}
                    </TableCell>
                    <TableCell>
                      {turn.closedBy?.name ?? '—'}
                      <br />
                      {formatDateTime(turn.closedAt)}
                    </TableCell>
                    <TableCell align='right' sx={{ color: turn.cashExpected < 0 ? 'error.main' : undefined }}>
                      {formatMoney(turn.cashExpected)}
                    </TableCell>
                    <TableCell align='right'>{turn.countedCash === null ? '—' : formatMoney(turn.countedCash)}</TableCell>
                    <TableCell>{differenceLabel(turn)}</TableCell>
                    <TableCell align='right'>
                      <Button size='small' onClick={() => void printSession(turn.uuid)}>
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <DeleteReasonDialog
        open={Boolean(pendingRemoval)}
        title={pendingRemoval?.kind === 'expense' ? 'Quitar egreso' : 'Quitar refuerzo'}
        description='El movimiento sale de esta caja. Escriba por qué.'
        confirmLabel='Quitar'
        placeholder='Se registró por error'
        confirming={saving}
        onClose={() => setPendingRemoval(null)}
        onConfirm={reason => void confirmRemoval(reason)}
      />
    </div>
  )
}

export default CashPage
