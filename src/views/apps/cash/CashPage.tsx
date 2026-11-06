'use client'

import { useCallback, useEffect, useState, type FocusEvent } from 'react'

import { useParams, useRouter } from 'next/navigation'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'


import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import DeleteReasonDialog from '@/components/dialogs/DeleteReasonDialog'
import CustomTabList from '@core/components/mui/TabList'

import type { Locale } from '@configs/i18n'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { cashApi, getCashApiErrorMessage, type CashierOption, type CashSession, type CashSessionDetail } from '@/libs/cashApi'
import { PAYMENT_METHOD_LABELS } from '@/types/apps/frontDeskTypes'
import { getLocalizedUrl } from '@/utils/i18n'
import { buildCashSessionDocument, cashMethodRows, collectedTotal } from '@views/apps/reports/document/cashSessionDocument'
import { formatDateTime, formatMoney, formatTime } from '@views/apps/reports/document/reportDocument'
import { openReportPdf } from '@views/apps/reports/document/openReportPdf'

type CashMoveDialog = 'expense' | 'reinforcement' | null

type CloseTarget = {
  uuid: string
  cashierName: string
  expected: number
  own: boolean
}

const moneyValue = (value: string) => {
  const parsed = Number(value.replace(',', '.'))

  return Number.isFinite(parsed) ? parsed : null
}

const selectFieldText = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  event.target.select()
}

const signedDifference = (expected: number, counted: number) => {
  const difference = Math.round((counted - expected) * 100) / 100

  if (difference === 0) {
    return { difference, label: 'Cuadra', color: 'success.main' }
  }

  if (difference > 0) {
    return { difference, label: 'Sobrante', color: 'info.main' }
  }

  return { difference, label: 'Faltante', color: 'error.main' }
}

const signedMoney = (difference: number) =>
  difference > 0 ? `+${formatMoney(difference)}` : formatMoney(difference)

const closeResultText = (difference: number, label: string) =>
  difference === 0 ? label : `${label} ${formatMoney(Math.abs(difference))}`

const closeResultBandClass = (difference: number) => {
  if (difference === 0) return 'bg-[var(--mui-palette-success-lighterOpacity)]'
  if (difference > 0) return 'bg-[var(--mui-palette-info-lighterOpacity)]'

  return 'bg-[var(--mui-palette-error-lighterOpacity)]'
}

const differenceLabel = (session: CashSession) => {
  if (session.difference === null) {
    return 'Aún no se cuenta'
  }

  if (session.difference === 0) {
    return 'Cuadra'
  }

  return session.difference > 0
    ? `Sobrante ${signedMoney(session.difference)}`
    : `Faltante ${signedMoney(session.difference)}`
}

const CashPage = () => {
  const { data: session, status } = useSession()

  const {
    canViewCash,
    canOpenCash,
    canOpenCashOthers,
    canRecordCashExpense,
    canCloseCash,
    canCloseCashOthers,
    loaded
  } = useSubscriptionAccess()

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
  const [otherCashierUuid, setOtherCashierUuid] = useState('')
  const [cashTab, setCashTab] = useState('mine')
  const [openingAmount, setOpeningAmount] = useState('0')
  const [openNotes, setOpenNotes] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNotes, setExpenseNotes] = useState('')
  const [reinforcementAmount, setReinforcementAmount] = useState('')
  const [reinforcementNotes, setReinforcementNotes] = useState('')
  const [countedCash, setCountedCash] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [pendingRemoval, setPendingRemoval] = useState<{ kind: 'expense' | 'reinforcement'; uuid: string } | null>(null)
  const [moveDialog, setMoveDialog] = useState<CashMoveDialog>(null)
  const [closeTarget, setCloseTarget] = useState<CloseTarget | null>(null)
  const [codeQuery, setCodeQuery] = useState('')
  const [foundTurn, setFoundTurn] = useState<CashSession | null>(null)
  const [codeSearchMiss, setCodeSearchMiss] = useState(false)
  const [searching, setSearching] = useState(false)

  const load = useCallback(async () => {
    if (!propertyId) {
      return
    }

    setLoading(true)

    try {
      const [openSession, turns, people] = await Promise.all([
        cashApi.current(propertyId),
        cashApi.list(propertyId),
        canOpenCashOthers ? cashApi.cashiers(propertyId) : Promise.resolve([])
      ])

      setCurrent(openSession)
      setHistory(turns)
      setCashiers(people)
      setOtherCashierUuid(currentId => {
        const others = people.filter(person => person.uuid !== myEmployeeUuid)

        if (currentId && others.some(person => person.uuid === currentId)) {
          return currentId
        }

        return others[0]?.uuid ?? ''
      })
    } catch (error) {
      toast.error(getCashApiErrorMessage(error, 'No se pudo cargar la caja.'))
    } finally {
      setLoading(false)
    }
  }, [canOpenCashOthers, myEmployeeUuid, propertyId])

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

  const searchCash = async () => {
    if (!propertyId) {
      return
    }

    const query = codeQuery.trim()

    if (!query) {
      toast.error('Escribe el código de la caja.')

      return
    }

    setSearching(true)

    try {
      const found = await cashApi.findByCode(propertyId, query)

      setFoundTurn(found)
      setCodeSearchMiss(false)
    } catch (error) {
      const message = getCashApiErrorMessage(error, 'No se pudo buscar la caja.')

      setFoundTurn(null)
      setCodeSearchMiss(message === 'No hay una caja con ese código.')

      if (message !== 'No hay una caja con ese código.') {
        toast.error(message)
      }
    } finally {
      setSearching(false)
    }
  }

  const printSession = async (uuid: string) => {
    if (!propertyId) {
      return
    }

    try {
      const detail = uuid === current?.uuid && current ? current : await cashApi.findOne(propertyId, uuid)

      await openReportPdf(buildCashSessionDocument(detail, hotelName))
    } catch (error) {
      toast.error(getCashApiErrorMessage(error, 'No se pudo preparar el informe de caja.'))
    }
  }

  const openCash = async (forEmployeeUuid?: string) => {
    if (!propertyId) {
      return
    }

    const amount = moneyValue(openingAmount)

    if (amount === null || amount < 0) {
      toast.error('Escribe el sencillo con el que se abre la caja. Puede ser 0.')

      return
    }

    const forOther = Boolean(forEmployeeUuid && forEmployeeUuid !== myEmployeeUuid)

    setSaving(true)

    try {
      const opened = await cashApi.open(propertyId, {
        openingAmount: amount,
        cashierUuid: forEmployeeUuid || undefined,
        notes: openNotes.trim() || undefined
      })

      setOpeningAmount('0')
      setOpenNotes('')

      if (forOther) {
        const name = cashiers.find(person => person.uuid === forEmployeeUuid)?.name ?? 'ese empleado'

        toast.success(`La caja ${opened.number} de ${name} quedó abierta.`)
      } else {
        setCurrent(opened)
        toast.success(`Tu caja ${opened.number} quedó abierta.`)
      }

      await load()
    } catch (error) {
      toast.error(getCashApiErrorMessage(error, 'No se pudo abrir la caja.'))
    } finally {
      setSaving(false)
    }
  }

  const openCloseDialog = (target: CloseTarget) => {
    setCountedCash('')
    setCloseNotes('')
    setCloseTarget(target)
  }

  const closeMoveDialog = () => {
    setMoveDialog(null)
    setExpenseAmount('')
    setExpenseNotes('')
    setReinforcementAmount('')
    setReinforcementNotes('')
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
      toast.error('Escribe una descripción del refuerzo.')

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

  const askCloseCash = () => {
    if (!current) {
      return
    }

    openCloseDialog({
      uuid: current.uuid,
      cashierName: current.cashier.name,
      expected: current.cashExpected,
      own: true
    })
  }

  const confirmClose = async () => {
    if (!propertyId || !closeTarget) {
      return
    }

    const counted = moneyValue(countedCash)

    if (counted === null || counted < 0) {
      toast.error('Escribe el efectivo que contaste.')

      return
    }

    setSaving(true)

    try {
      const closed = await cashApi.close(propertyId, closeTarget.uuid, {
        countedCash: counted,
        notes: closeNotes.trim() || undefined
      })

      const own = closeTarget.own
      const cashierName = closeTarget.cashierName
      const result = signedDifference(closeTarget.expected, counted)

      setCloseTarget(null)
      setCountedCash('')
      setCloseNotes('')
      setOpeningAmount('0')
      setOpenNotes('')

      if (own) {
        setCurrent(null)
        closeMoveDialog()
        toast.success(`Caja cerrada. ${closeResultText(result.difference, result.label)}.`)
      } else {
        toast.success(`Se cerró la caja de ${cashierName}. ${closeResultText(result.difference, result.label)}.`)
      }

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

  const expectedColor =
    current && current.cashExpected < 0 ? 'error.main' : current && current.cashExpected === 0 ? 'text.primary' : 'success.main'

  // Solo turnos cerrados. Con caja abierta: las últimas 10. Sin caja: más historial para consultar.
  const previousTurns = history.filter(turn => turn.status === 'CLOSED').slice(0, current ? 10 : 30)

  const otherOpenSessions = history.filter(
    turn => turn.status === 'OPEN' && turn.uuid !== current?.uuid
  )

  const otherCashiers = cashiers.filter(person => person.uuid !== myEmployeeUuid)
  const countedPreview = moneyValue(countedCash)

  const closeVariance =
    closeTarget && countedPreview !== null && countedPreview >= 0
      ? signedDifference(closeTarget.expected, countedPreview)
      : null

  const historyTable = (
    <Table size='small'>
      <TableHead>
        <TableRow>
          <TableCell>Turno</TableCell>
          <TableCell>Cajero</TableCell>
          <TableCell>Abrió</TableCell>
          <TableCell>Cerró</TableCell>
          <TableCell align='right'>Efectivo a entregar</TableCell>
          <TableCell align='right'>Contado</TableCell>
          <TableCell>Diferencia</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {previousTurns.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8}>Todavía no hay turnos cerrados.</TableCell>
          </TableRow>
        ) : (
          previousTurns.map(turn => (
            <TableRow key={turn.uuid}>
              <TableCell>{turn.number}</TableCell>
              <TableCell>{turn.cashier.name}</TableCell>
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
              <TableCell
                sx={{
                  color:
                    turn.difference === null
                      ? undefined
                      : turn.difference > 0
                        ? 'info.main'
                        : turn.difference < 0
                          ? 'error.main'
                          : 'success.main'
                }}
              >
                {differenceLabel(turn)}
              </TableCell>
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
  )

  const canManageOtherCash = canOpenCashOthers || canCloseCashOthers

  const myCashPanel = (
    <div className='flex flex-col gap-6'>
      {current ? (
        <>
          <div className='flex flex-wrap justify-end gap-2'>
            <Button variant='outlined' color='secondary' startIcon={<i className='ri-refresh-line' />} onClick={() => void load()}>
              Actualizar
            </Button>
            <Button variant='outlined' startIcon={<i className='ri-file-pdf-2-line' />} onClick={() => void printSession(current.uuid)}>
              Ver arqueo
            </Button>
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

              <div
                className='rounded-lg border-2 p-4'
                style={{
                  borderColor:
                    current.cashExpected < 0
                      ? 'var(--mui-palette-error-main)'
                      : current.cashExpected === 0
                        ? 'var(--mui-palette-divider)'
                        : 'var(--mui-palette-success-main)'
                }}
              >
                <Typography color={expectedColor} className='font-medium uppercase'>
                  {current.cashExpected < 0 ? 'Faltante' : 'Efectivo a entregar'}
                </Typography>
                <Typography variant='h3' color={expectedColor}>
                  {formatMoney(current.cashExpected)}
                </Typography>
                <Typography color='text.secondary'>
                  Inicial {formatMoney(current.openingAmount)}
                  {current.reinforcementTotal > 0 ? ` + refuerzo ${formatMoney(current.reinforcementTotal)}` : ''}
                  {current.cashCharges > 0 ? ` + efectivo ${formatMoney(current.cashCharges)}` : ''}
                  {current.cashRefunds > 0 ? ` − devoluciones ${formatMoney(current.cashRefunds)}` : ''}
                  {current.expenseTotal > 0 ? ` − egresos ${formatMoney(current.expenseTotal)}` : ''}
                  . Yape, Plin, transferencia y tarjeta ya están en la cuenta del hotel.
                </Typography>
              </div>

              <div>
                <Typography variant='subtitle1' className='mbe-2 font-medium'>
                  Cobrado hasta ahora
                </Typography>
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
              </div>

              {canRecordCashExpense || canCloseCash || current.expenses.length > 0 || current.reinforcements.length > 0 ? (
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='flex flex-wrap items-center gap-2'>
                    {canRecordCashExpense ? (
                      <>
                        <Button
                          variant='outlined'
                          startIcon={<i className='ri-subtract-line' />}
                          onClick={() => setMoveDialog('expense')}
                        >
                          Registrar egreso
                          {current.expenses.length > 0 ? ` (${current.expenses.length})` : ''}
                        </Button>
                        <Button
                          variant='outlined'
                          startIcon={<i className='ri-add-line' />}
                          onClick={() => setMoveDialog('reinforcement')}
                        >
                          Registrar refuerzo
                          {current.reinforcements.length > 0 ? ` (${current.reinforcements.length})` : ''}
                        </Button>
                      </>
                    ) : current.expenses.length > 0 || current.reinforcements.length > 0 ? (
                      <Typography variant='body2' color='text.secondary'>
                        {current.expenses.length > 0 ? `${current.expenses.length} egreso(s)` : ''}
                        {current.expenses.length > 0 && current.reinforcements.length > 0 ? ' · ' : ''}
                        {current.reinforcements.length > 0 ? `${current.reinforcements.length} refuerzo(s)` : ''}
                      </Typography>
                    ) : null}
                  </div>
                  {canCloseCash ? (
                    <Button variant='contained' color='warning' className='shrink-0' disabled={saving} onClick={askCloseCash}>
                      Cerrar caja
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
              <Typography className='font-medium'>
                Ver movimientos del turno
                {current.payments.length > 0 ? ` (${current.payments.length})` : ''}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
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
            </AccordionDetails>
          </Accordion>

        </>
      ) : (
        <Card>
          <CardContent className='flex flex-col gap-4'>
            <Typography variant='h6'>Tu caja no está abierta</Typography>
            {canOpenCash ? (
              <div className='flex flex-wrap items-end gap-3'>
                <TextField
                  label='Monto inicial'
                  value={openingAmount}
                  onChange={event => setOpeningAmount(event.target.value)}
                  onFocus={selectFieldText}
                  className='min-is-[120px]'
                />
                <TextField
                  label='Nota'
                  value={openNotes}
                  onChange={event => setOpenNotes(event.target.value)}
                  className='min-is-[320px] flex-1 max-is-[480px]'
                  placeholder='Turno de la mañana'
                />
                <Button variant='contained' disabled={saving} onClick={() => void openCash()}>
                  Abrir mi caja
                </Button>
              </div>
            ) : (
              <Alert severity='warning'>No tienes permiso para abrir tu caja.</Alert>
            )}
          </CardContent>
        </Card>
      )}

      <div className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-end gap-3'>
          <TextField
            label='Código'
            value={codeQuery}
            onChange={event => {
              setCodeQuery(event.target.value)
              setCodeSearchMiss(false)
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void searchCash()
              }
            }}
            placeholder='C-000001'
            className='min-is-[160px]'
          />
          <Button variant='outlined' disabled={searching} onClick={() => void searchCash()}>
            Buscar
          </Button>
        </div>
        {foundTurn ? (
          <div className='flex flex-wrap items-center justify-between gap-3 rounded border border-solid border-[var(--mui-palette-divider)] px-4 py-3'>
            <div>
              <Typography className='font-medium'>{foundTurn.number}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {foundTurn.cashier.name}
                {' · '}
                {foundTurn.status === 'OPEN' ? 'Abierta' : `Cerrada · ${differenceLabel(foundTurn)}`}
              </Typography>
            </div>
            <Button size='small' onClick={() => void printSession(foundTurn.uuid)}>
              Ver
            </Button>
          </div>
        ) : codeSearchMiss ? (
          <Typography color='text.secondary'>No hay una caja con ese código.</Typography>
        ) : null}
      </div>

      <Accordion
        defaultExpanded={!current}
        disableGutters
        elevation={0}
        sx={{ border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
          <Typography className='font-medium'>
            Turnos anteriores
            {previousTurns.length > 0 ? ` (${previousTurns.length})` : ''}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>{historyTable}</AccordionDetails>
      </Accordion>
    </div>
  )

  const otherCashPanel = (
    <div className='flex flex-col gap-6'>
      {canOpenCashOthers ? (
        <Card>
          <CardContent className='flex flex-col gap-4'>
            <Typography variant='h6'>Abrir caja de otro empleado</Typography>
            {otherCashiers.length > 0 ? (
              <div className='flex flex-wrap items-end gap-3'>
                <TextField
                  select
                  label='Empleado'
                  value={otherCashierUuid}
                  onChange={event => setOtherCashierUuid(event.target.value)}
                  className='min-is-[240px]'
                >
                  {otherCashiers.map(person => (
                    <MenuItem key={person.uuid} value={person.uuid}>
                      {person.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label='Monto inicial'
                  value={openingAmount}
                  onChange={event => setOpeningAmount(event.target.value)}
                  onFocus={selectFieldText}
                  className='min-is-[120px]'
                />
                <TextField
                  label='Nota'
                  value={openNotes}
                  onChange={event => setOpenNotes(event.target.value)}
                  className='min-is-[320px] flex-1 max-is-[480px]'
                  placeholder='Turno de la mañana'
                />
                <Button variant='contained' disabled={saving || !otherCashierUuid} onClick={() => void openCash(otherCashierUuid)}>
                  Abrir caja
                </Button>
              </div>
            ) : (
              <Typography color='text.secondary'>No hay otro empleado activo para abrirle la caja.</Typography>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className='flex flex-col gap-4'>
          <Typography variant='h6'>Turnos abiertos ({otherOpenSessions.length})</Typography>
          {otherOpenSessions.length === 0 ? (
            <Typography color='text.secondary'>No hay otros turnos abiertos.</Typography>
          ) : (
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Turno</TableCell>
                  <TableCell>Cajero</TableCell>
                  <TableCell>Abierta</TableCell>
                  <TableCell align='right'>Efectivo a entregar</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {otherOpenSessions.map(turn => (
                  <TableRow key={turn.uuid}>
                    <TableCell>{turn.number}</TableCell>
                    <TableCell>{turn.cashier.name}</TableCell>
                    <TableCell>
                      {turn.openedBy.name}
                      <br />
                      {formatDateTime(turn.openedAt)}
                    </TableCell>
                    <TableCell align='right' sx={{ color: turn.cashExpected < 0 ? 'error.main' : undefined }}>
                      {formatMoney(turn.cashExpected)}
                    </TableCell>
                    <TableCell align='right'>
                      <div className='flex flex-wrap justify-end gap-1'>
                        <Button size='small' onClick={() => void printSession(turn.uuid)}>
                          Ver
                        </Button>
                        {canCloseCashOthers ? (
                          <Button
                            size='small'
                            color='warning'
                            onClick={() =>
                              openCloseDialog({
                                uuid: turn.uuid,
                                cashierName: turn.cashier.name,
                                expected: turn.cashExpected,
                                own: false
                              })
                            }
                          >
                            Cerrar
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className='flex flex-col gap-6'>
      {canManageOtherCash ? (
        <TabContext value={cashTab}>
          <CustomTabList pill='true' onChange={(_event, value) => setCashTab(value)} aria-label='Caja'>
            <Tab value='mine' label='Mi caja' />
            <Tab value='others' label={otherOpenSessions.length > 0 ? `Otros turnos (${otherOpenSessions.length})` : 'Otros turnos'} />
          </CustomTabList>
          <TabPanel value='mine' className='p-0'>
            {myCashPanel}
          </TabPanel>
          <TabPanel value='others' className='p-0'>
            {otherCashPanel}
          </TabPanel>
        </TabContext>
      ) : (
        myCashPanel
      )}

      <Dialog open={moveDialog === 'expense'} onClose={saving ? undefined : closeMoveDialog} fullWidth maxWidth='sm'>
        <DialogTitle>Registrar egreso</DialogTitle>
        <DialogContent className='flex flex-col gap-4 pt-4'>
          {current ? (
            <Typography color='text.secondary'>
              Caja <strong>{current.number}</strong> · abierta · cajero {current.cashier.name}
            </Typography>
          ) : null}
          <div className='flex flex-wrap items-end gap-3'>
            <TextField
              label='Monto'
              value={expenseAmount}
              onChange={event => setExpenseAmount(event.target.value)}
              className='min-is-[140px]'
              placeholder='12.00'
              disabled={saving}
              autoFocus
            />
            <TextField
              label='¿Para qué salió?'
              value={expenseNotes}
              onChange={event => setExpenseNotes(event.target.value)}
              className='min-is-[220px] flex-1'
              placeholder='Almuerzo, pan, plomero…'
              disabled={saving}
            />
          </div>
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
              {!current || current.expenses.length === 0 ? (
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
                        <IconButton
                          aria-label='Quitar egreso'
                          disabled={saving}
                          onClick={() => setPendingRemoval({ kind: 'expense', uuid: expense.uuid })}
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
        </DialogContent>
        <DialogActions>
          <Button color='secondary' disabled={saving} onClick={closeMoveDialog}>
            Cerrar
          </Button>
          <Button variant='contained' disabled={saving} onClick={() => void addExpense()}>
            {saving ? <CircularProgress size={20} color='inherit' /> : 'Guardar egreso'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={moveDialog === 'reinforcement'} onClose={saving ? undefined : closeMoveDialog} fullWidth maxWidth='sm'>
        <DialogTitle>Registrar refuerzo</DialogTitle>
        <DialogContent className='flex flex-col gap-4 pt-4'>
          {current ? (
            <Typography color='text.secondary'>
              Caja <strong>{current.number}</strong> · abierta · cajero {current.cashier.name}
            </Typography>
          ) : null}
          <div className='flex flex-wrap items-end gap-3'>
            <TextField
              label='Monto'
              value={reinforcementAmount}
              onChange={event => setReinforcementAmount(event.target.value)}
              className='min-is-[140px]'
              placeholder='50.00'
              disabled={saving}
              autoFocus
            />
            <TextField
              label='Descripción'
              value={reinforcementNotes}
              onChange={event => setReinforcementNotes(event.target.value)}
              className='min-is-[220px] flex-1'
              placeholder='Ej. Cambio para el turno'
              disabled={saving}
            />
          </div>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Hora</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align='right'>Monto</TableCell>
                <TableCell>Registró</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {!current || current.reinforcements.length === 0 ? (
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
        </DialogContent>
        <DialogActions>
          <Button color='secondary' disabled={saving} onClick={closeMoveDialog}>
            Cerrar
          </Button>
          <Button variant='contained' disabled={saving} onClick={() => void addReinforcement()}>
            {saving ? <CircularProgress size={20} color='inherit' /> : 'Guardar refuerzo'}
          </Button>
        </DialogActions>
      </Dialog>

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

      <Dialog
        open={Boolean(closeTarget)}
        onClose={saving ? undefined : () => setCloseTarget(null)}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>Cerrar caja de {closeTarget?.cashierName ?? ''}</DialogTitle>
        <DialogContent className='flex flex-col gap-4 pt-4'>
          {closeTarget ? (
            <>
              <Typography color='text.secondary'>
                Efectivo según el sistema: <strong>{formatMoney(closeTarget.expected)}</strong>
              </Typography>
              <TextField
                label='Efectivo contado'
                value={countedCash}
                onChange={event => setCountedCash(event.target.value)}
                onFocus={selectFieldText}
                autoFocus
                placeholder='0.00'
              />
              {closeVariance ? (
                <div
                  className={`flex flex-col items-center justify-center gap-1 rounded px-4 py-4 text-center ${closeResultBandClass(closeVariance.difference)}`}
                >
                  <Typography
                    color={closeVariance.color}
                    variant='h6'
                    className='font-bold uppercase tracking-[0.14em]'
                  >
                    {closeVariance.label}
                  </Typography>
                  {closeVariance.difference !== 0 ? (
                    <Typography color={closeVariance.color} variant='h5'>
                      {formatMoney(Math.abs(closeVariance.difference))}
                    </Typography>
                  ) : null}
                </div>
              ) : (
                <Typography color='text.secondary' className='text-center'>
                  Escribe los billetes y monedas que hay en la caja.
                </Typography>
              )}
              <TextField
                label='Nota'
                value={closeNotes}
                onChange={event => setCloseNotes(event.target.value)}
                placeholder='Opcional'
                multiline
                minRows={2}
                fullWidth
              />
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button color='secondary' disabled={saving} onClick={() => setCloseTarget(null)}>
            Volver
          </Button>
          <Button
            variant='contained'
            color='warning'
            disabled={saving || !closeVariance}
            onClick={() => void confirmClose()}
          >
            {saving ? <CircularProgress size={20} color='inherit' /> : 'Cerrar caja'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default CashPage
