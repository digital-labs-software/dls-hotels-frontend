'use client'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import type { ThemeColor } from '@core/types'

import type { BillingSubscriptionResponse, SubscriptionStatus } from '@/types/apps/billingTypes'
import {
  SUBSCRIPTION_STATUS_LABELS,
  billingCycleLabel,
  formatBillingMoney
} from '@/types/apps/billingTypes'
import { formatPlanningDate } from '@/types/apps/reservationsTypes'

type Props = {
  data: BillingSubscriptionResponse
  canPay: boolean
  onPay: (paymentUuid: string) => void
}

const statusColor: Record<SubscriptionStatus, ThemeColor> = {
  TRIAL: 'info',
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  SUSPENDED: 'error',
  CANCELLED: 'secondary',
  EXPIRED: 'error'
}

const periodProgress = (start?: string | null, end?: string | null, today?: string) => {
  if (!start || !end) {
    return null
  }

  const from = new Date(`${start}T12:00:00`).getTime()
  const to = new Date(`${end}T12:00:00`).getTime()
  const now = new Date(`${today || start}T12:00:00`).getTime()

  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) {
    return null
  }

  const totalDays = Math.round((to - from) / 86400000)
  const usedDays = Math.min(totalDays, Math.max(0, Math.round((now - from) / 86400000)))

  return { usedDays, totalDays, value: Math.round((usedDays / totalDays) * 100) }
}

const CurrentSubscriptionCard = ({ data, canPay, onPay }: Props) => {
  const { account, subscription, balance, paymentOptions, today } = data

  if (!account || !subscription) {
    return (
      <Alert severity='info'>
        Tu alojamiento aún no tiene suscripción asignada; comunícate con DLS.
      </Alert>
    )
  }

  const currency = subscription.currency || 'PEN'
  const progress = periodProgress(subscription.currentPeriodStart, subscription.currentPeriodEnd, today)
  const nextPayment = balance?.nextPayment
  const outstanding = balance?.outstanding
  const overdue = balance?.overdue
  const hasDebt = Boolean((outstanding?.count || 0) > 0 || (overdue?.count || 0) > 0)

  return (
    <Grid container spacing={6}>
      {subscription.status === 'SUSPENDED' ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error'>
            <AlertTitle>Servicio suspendido</AlertTitle>
            {subscription.suspensionReason ||
              'El servicio de este alojamiento está suspendido por falta de pago. Regularice su pago o comuníquese con DLS.'}
          </Alert>
        </Grid>
      ) : null}

      {balance && balance.pendingVouchers > 0 ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='warning'>
            Tienes {balance.pendingVouchers} constancia(s) de pago en revisión por DLS.
          </Alert>
        </Grid>
      ) : null}

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Mi plan' />
          <CardContent>
            <Grid container spacing={6}>
              <Grid size={{ xs: 12, md: 6 }} className='flex flex-col gap-4'>
                <div className='flex flex-wrap items-center gap-2'>
                  <Typography className='font-medium' color='text.primary'>
                    {subscription.plan?.name || 'Plan'}
                  </Typography>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={statusColor[subscription.status] || 'secondary'}
                    label={SUBSCRIPTION_STATUS_LABELS[subscription.status] || subscription.status}
                  />
                </div>
                {subscription.plan?.description ? <Typography>{subscription.plan.description}</Typography> : null}
                <div>
                  <Typography className='font-medium' color='text.primary'>
                    Servicio cubierto hasta {formatPlanningDate(subscription.currentPeriodEnd)}
                  </Typography>
                  <Typography>
                    Ciclo {billingCycleLabel(subscription.billingCycle)}
                    {subscription.autoRenew ? ' · renovación automática' : ''}
                  </Typography>
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <Typography className='font-medium' color='text.primary'>
                      {formatBillingMoney(subscription.netPrice, currency)}
                    </Typography>
                    {subscription.discountAmount > 0 ? (
                      <Chip
                        size='small'
                        variant='tonal'
                        color='success'
                        label={`Dto. ${formatBillingMoney(subscription.discountAmount, currency)}`}
                      />
                    ) : null}
                  </div>
                  {subscription.discountAmount > 0 ? (
                    <Typography variant='body2'>Precio de lista {formatBillingMoney(subscription.price, currency)}</Typography>
                  ) : null}
                </div>
                {account.businessName ? (
                  <Typography variant='body2'>
                    Factura a {account.businessName}
                    {account.documentType && account.documentNumber
                      ? ` · ${account.documentType} ${account.documentNumber}`
                      : ''}
                  </Typography>
                ) : null}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }} className='flex flex-col gap-4'>
                {hasDebt ? (
                  <Alert severity={overdue && overdue.count > 0 ? 'error' : 'warning'}>
                    <AlertTitle>Deuda pendiente</AlertTitle>
                    {overdue && overdue.count > 0
                      ? `${overdue.count} cobro(s) vencido(s) por ${formatBillingMoney(overdue.total, currency)}.`
                      : `${outstanding?.count || 0} cobro(s) por ${formatBillingMoney(outstanding?.total, currency)}.`}
                  </Alert>
                ) : (
                  <Alert severity='success'>No tienes deudas vencidas.</Alert>
                )}
                {progress ? (
                  <div>
                    <div className='flex items-center justify-between'>
                      <Typography className='font-medium' color='text.primary'>
                        Período actual
                      </Typography>
                      <Typography className='font-medium' color='text.primary'>
                        {progress.usedDays} de {progress.totalDays} días
                      </Typography>
                    </div>
                    <LinearProgress variant='determinate' value={progress.value} className='mlb-1 bs-2.5' />
                    <Typography variant='body2'>
                      Del {formatPlanningDate(subscription.currentPeriodStart)} al{' '}
                      {formatPlanningDate(subscription.currentPeriodEnd)}
                    </Typography>
                  </div>
                ) : null}
                {nextPayment ? (
                  <div className='flex flex-wrap items-center gap-3'>
                    <Typography>
                      Próximo pago {formatBillingMoney(nextPayment.total, nextPayment.currency)} · vence{' '}
                      {formatPlanningDate(nextPayment.dueDate)}
                    </Typography>
                    {canPay && nextPayment.canPay ? (
                      <Button variant='contained' onClick={() => onPay(nextPayment.uuid)}>
                        Pagar
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </Grid>
              {subscription.plan?.features?.length ? (
                <Grid size={{ xs: 12 }}>
                  <Typography className='font-medium mbe-2' color='text.primary'>
                    Incluye
                  </Typography>
                  <div className='flex flex-col gap-1'>
                    {subscription.plan.features.map(feature => (
                      <Typography key={feature.name} variant='body2'>
                        {feature.name}
                        {feature.description ? ` · ${feature.description}` : ''}
                      </Typography>
                    ))}
                  </div>
                </Grid>
              ) : null}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Cuentas para transferir o yapear' />
          <CardContent>
            {paymentOptions?.instructions ? (
              <Typography sx={{ whiteSpace: 'pre-line' }}>{paymentOptions.instructions}</Typography>
            ) : (
              <Typography>DLS aún no ha publicado las cuentas de pago. Comunícate con soporte.</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CurrentSubscriptionCard
