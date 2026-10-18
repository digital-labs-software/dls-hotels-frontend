import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/types/apps/frontDeskTypes'
import type { CashMethodTotal, CashSessionDetail } from '@/libs/cashApi'
import type { ReportDocument } from './reportDocument'
import { formatDateTime, formatMoney, formatTime, grand, row, total } from './reportDocument'

/** Efectivo primero. Todos los medios se muestran, aunque el monto sea cero. */
export const CASH_METHOD_ORDER: PaymentMethod[] = ['CASH', 'YAPE', 'PLIN', 'TRANSFER', 'CARD', 'OTHER']

export const cashMethodRows = (byMethod: CashMethodTotal[]) =>
  CASH_METHOD_ORDER.map(method => ({
    method,
    label: PAYMENT_METHOD_LABELS[method],
    net: byMethod.find(item => item.method === method)?.net ?? 0
  }))

export const collectedTotal = (byMethod: CashMethodTotal[]) =>
  cashMethodRows(byMethod).reduce((sum, item) => sum + item.net, 0)

export const buildCashSessionDocument = (session: CashSessionDetail, hotelName: string): ReportDocument => {
  const methods = cashMethodRows(session.byMethod)
  const collected = collectedTotal(session.byMethod)
  const closed = session.status === 'CLOSED'
  const difference =
    session.difference === null
      ? 'Aún no se cuenta'
      : session.difference === 0
        ? 'Cuadra'
        : session.difference > 0
          ? `Sobra ${formatMoney(session.difference)}`
          : `Falta ${formatMoney(Math.abs(session.difference))}`

  return {
    fileName: `cierre-caja-${session.number}`,
    title: 'Cierre de caja',
    hotelName,
    period: closed
      ? `${formatDateTime(session.openedAt)} al ${formatDateTime(session.closedAt)}`
      : `Abierta desde ${formatDateTime(session.openedAt)}`,
    orientation: 'portrait',
    highlight: {
      label: session.cashExpected < 0 ? 'Faltante' : 'Efectivo a entregar',
      tone: session.cashExpected < 0 ? 'short' : undefined,
      value: formatMoney(session.cashExpected),
      detail: `Monto inicial ${formatMoney(session.openingAmount)} + refuerzo ${formatMoney(session.reinforcementTotal)} + efectivo cobrado ${formatMoney(session.cashCharges)} − devoluciones ${formatMoney(session.cashRefunds)} − egresos ${formatMoney(session.expenseTotal)}. Lo entrega ${session.cashier.name}. Yape, Plin, transferencia y tarjeta ya están en la cuenta del hotel.`
    },
    summary: [
      { label: 'Turno', value: session.number },
      { label: 'Cajero', value: session.cashier.name },
      { label: 'Abrió', value: session.openedBy.name },
      { label: 'Cerró', value: session.closedBy?.name ?? '—' },
      { label: 'Monto inicial', value: formatMoney(session.openingAmount) },
      { label: 'Refuerzo', value: formatMoney(session.reinforcementTotal) },
      { label: 'Efectivo cobrado', value: formatMoney(session.cashCharges) },
      { label: 'Devoluciones en efectivo', value: formatMoney(session.cashRefunds) },
      { label: 'Egresos', value: formatMoney(session.expenseTotal) },
      {
        label: session.cashExpected < 0 ? 'Faltante' : 'Efectivo a entregar',
        value: formatMoney(session.cashExpected)
      },
      { label: 'Efectivo contado', value: session.countedCash === null ? '—' : formatMoney(session.countedCash) },
      { label: 'Diferencia', value: difference }
    ],
    tables: [
      {
        title: 'Cobrado en el turno',
        columns: [
          { header: 'Medio de pago', width: 28 },
          { header: 'Monto', kind: 'money', width: 16 }
        ],
        rows: [...methods.map(item => row([item.label, item.net])), grand(['Total cobrado en el turno', collected])]
      },
      {
        title: 'Refuerzo',
        columns: [
          { header: 'Hora', width: 10 },
          { header: 'De dónde', width: 36 },
          { header: 'Monto', kind: 'money', width: 14 },
          { header: 'Registró', width: 18 }
        ],
        rows: session.reinforcements.length
          ? [
              ...session.reinforcements.map(reinforcement =>
                row([
                  formatTime(reinforcement.receivedAt),
                  reinforcement.notes,
                  reinforcement.amount,
                  reinforcement.employeeName
                ])
              ),
              total(['', 'Total de refuerzo', session.reinforcementTotal, ''])
            ]
          : [],
        emptyText: 'No entró refuerzo a esta caja.'
      },
      {
        title: 'Egresos',
        columns: [
          { header: 'Hora', width: 10 },
          { header: 'Para qué', width: 36 },
          { header: 'Monto', kind: 'money', width: 14 },
          { header: 'Registró', width: 18 }
        ],
        rows: session.expenses.length
          ? [
              ...session.expenses.map(expense =>
                row([formatTime(expense.spentAt), expense.notes, expense.amount, expense.employeeName])
              ),
              total(['', 'Total de egresos', session.expenseTotal, ''])
            ]
          : [],
        emptyText: 'No salió dinero de la caja.'
      },
      {
        title: 'Cobros y devoluciones',
        columns: [
          { header: 'Hora', width: 8 },
          { header: 'Reserva', width: 11 },
          { header: 'Titular', width: 18 },
          { header: 'Medio', width: 11 },
          { header: 'N° operación', width: 12 },
          { header: 'Cobró', width: 16 },
          { header: 'Monto', kind: 'money', width: 11 }
        ],
        rows: session.payments.length
          ? [
              ...session.payments.map(payment =>
                row(
                  [
                    formatTime(payment.paidAt),
                    payment.reservationCode,
                    payment.holderName,
                    PAYMENT_METHOD_LABELS[payment.method] ?? payment.method,
                    payment.reference ?? '',
                    payment.employeeName,
                    payment.amount
                  ],
                  payment.amount < 0 ? 'error' : undefined
                )
              ),
              total([
                '',
                '',
                '',
                '',
                '',
                'Total',
                session.payments.reduce((sum, payment) => sum + payment.amount, 0)
              ])
            ]
          : [],
        emptyText: 'No hay cobros ligados a esta caja.'
      }
    ],
    notes: [...(session.notes ? [`Nota: ${session.notes}`] : [])],
    signatures: [`Entrega (${session.cashier.name})`, 'Recibe (administración)']
  }
}
