'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Typography from '@mui/material/Typography'

import type { Locale } from '@configs/i18n'
import CustomTabList from '@core/components/mui/TabList'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { billingApi, getBillingApiErrorMessage } from '@/libs/billingApi'
import { openCulqiCheckout } from '@/libs/culqiCheckout'
import { getLocalizedUrl } from '@/utils/i18n'
import type { BillingPaymentSummary, BillingSubscriptionResponse } from '@/types/apps/billingTypes'
import CurrentSubscriptionCard from './CurrentSubscriptionCard'
import OnlinePaymentCard from './OnlinePaymentCard'
import PaymentDetailDrawer from './PaymentDetailDrawer'
import PaymentHistoryTable from './PaymentHistoryTable'
import ReportPaymentDialog from './ReportPaymentDialog'

const TABS = ['plan', 'history'] as const

type BillingTab = (typeof TABS)[number]

const isBillingTab = (value?: string | null): value is BillingTab => TABS.includes(value as BillingTab)

const BillingPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const { data: session, status } = useSession()
  const { canPaySubscription, refreshAccess } = useSubscriptionAccess()
  const propertyId = session?.user?.propertyId ?? 1

  const tabFromUrl = searchParams.get('tab')
  const [tab, setTab] = useState<BillingTab>(isBillingTab(tabFromUrl) ? tabFromUrl : 'plan')
  const [data, setData] = useState<BillingSubscriptionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [reportPayment, setReportPayment] = useState<BillingPaymentSummary | null>(null)
  const [detailPayment, setDetailPayment] = useState<BillingPaymentSummary | null>(null)

  const onlineEnabled = Boolean(data?.paymentOptions?.onlinePayment.enabled)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      setData(await billingApi.subscription(propertyId))
    } catch (error) {
      toast.error(getBillingApiErrorMessage(error, 'No se pudo cargar la suscripción.'))
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    load()
  }, [load, status])

  useEffect(() => {
    const nextTab = searchParams.get('tab')

    if (isBillingTab(nextTab)) {
      setTab(nextTab)
    }
  }, [searchParams])

  const goTab = (value: BillingTab) => {
    setTab(value)

    const baseUrl = getLocalizedUrl('/apps/billing', locale as Locale)

    router.replace(value === 'plan' ? baseUrl : `${baseUrl}?tab=${value}`)
  }

  const handleChanged = async () => {
    setRefreshKey(key => key + 1)
    await load()
    await refreshAccess()
  }

  const handleReport = (payment: BillingPaymentSummary) => {
    setReportPayment(payment)
  }

  const handlePayFromPlan = async (paymentUuid: string) => {
    goTab('history')

    try {
      const payment = await billingApi.payment(propertyId, paymentUuid)

      setDetailPayment(payment)
      setReportPayment(payment)
    } catch (error) {
      toast.error(getBillingApiErrorMessage(error, 'No se pudo abrir el cobro.'))
    }
  }

  const handleCardPay = async (payment: BillingPaymentSummary) => {
    if (!onlineEnabled || !canPaySubscription) {
      return
    }

    try {
      const checkout = await billingApi.onlineCheckout(propertyId, payment.uuid)

      await openCulqiCheckout(checkout, async (tokenId, email) => {
        try {
          const result = await billingApi.onlineCharge(propertyId, payment.uuid, { tokenId, email })

          if (result.status === 'SUCCEEDED') {
            toast.success('¡Pago realizado!')
            await handleChanged()

            return
          }

          if (result.status === 'REQUIRES_3DS') {
            toast.info('El banco pide autenticación 3D Secure. Revisa la documentación de Culqi al activar la v1.5.')

            return
          }

          toast.error(result.message || 'No se pudo completar el pago.')
        } catch (error) {
          toast.error(getBillingApiErrorMessage(error, 'No se pudo cobrar con Culqi.'))
        }
      })
    } catch (error) {
      toast.error(getBillingApiErrorMessage(error, 'El pago en línea aún no está disponible.'))
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }} className='flex flex-col gap-6'>
        <div>
          <Typography variant='h4' className='mbe-1'>
            Suscripción
          </Typography>
          <Typography>Tu plan DLS Hotels, deudas y constancias de pago</Typography>
        </div>

        {loading && !data ? (
          <div className='flex justify-center p-10'>
            <CircularProgress size={32} />
          </div>
        ) : data ? (
          <TabContext value={tab}>
            <CustomTabList
              onChange={(_event: SyntheticEvent, value: string) => isBillingTab(value) && goTab(value)}
              variant='scrollable'
              pill='true'
            >
              <Tab
                label={
                  <div className='flex items-center gap-1.5'>
                    <i className='ri-vip-crown-line text-lg' />
                    Mi plan
                  </div>
                }
                value='plan'
              />
              <Tab
                label={
                  <div className='flex items-center gap-1.5'>
                    <i className='ri-file-list-3-line text-lg' />
                    Historial
                  </div>
                }
                value='history'
              />
            </CustomTabList>

            <TabPanel value='plan' className='p-0'>
              <div className='flex flex-col gap-6'>
                <CurrentSubscriptionCard data={data} canPay={canPaySubscription} onPay={handlePayFromPlan} />
                <OnlinePaymentCard enabled={onlineEnabled} canPay={canPaySubscription} />
              </div>
            </TabPanel>

            <TabPanel value='history' className='p-0'>
              <PaymentHistoryTable
                propertyId={propertyId}
                refreshKey={refreshKey}
                canPay={canPaySubscription}
                onlineEnabled={onlineEnabled}
                onOpen={setDetailPayment}
                onReport={handleReport}
                onCardPay={handleCardPay}
              />
            </TabPanel>
          </TabContext>
        ) : (
          <Alert
            severity='warning'
            action={
              <Button color='inherit' size='small' onClick={load}>
                Reintentar
              </Button>
            }
          >
            No se pudo cargar la suscripción. Si el hotel demo aún no tiene cuenta o cobro, pídele a DLS que cargue los
            datos de prueba.
          </Alert>
        )}
      </Grid>

      <ReportPaymentDialog
        open={Boolean(reportPayment)}
        propertyId={propertyId}
        payment={reportPayment}
        today={data?.today || ''}
        paymentOptions={data?.paymentOptions || null}
        onClose={() => setReportPayment(null)}
        onSuccess={handleChanged}
      />

      <PaymentDetailDrawer
        open={Boolean(detailPayment)}
        propertyId={propertyId}
        payment={detailPayment}
        canPay={canPaySubscription}
        onlineEnabled={onlineEnabled}
        onClose={() => setDetailPayment(null)}
        onReport={handleReport}
        onCardPay={handleCardPay}
        onChanged={handleChanged}
      />
    </Grid>
  )
}

export default BillingPage
