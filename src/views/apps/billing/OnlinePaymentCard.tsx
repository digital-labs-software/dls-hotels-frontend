'use client'

import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

type Props = {
  enabled: boolean
  canPay: boolean
}

const OnlinePaymentCard = ({ enabled, canPay }: Props) => {
  if (!enabled || !canPay) {
    return null
  }

  return (
    <Card>
      <CardHeader title='Pago con tarjeta / Yape' />
      <CardContent className='flex flex-col gap-3'>
        <Alert severity='info'>El pago en línea está activo. Úsalo desde el historial, en el cobro pendiente.</Alert>
        <Typography variant='body2'>
          Culqi Checkout acepta tarjeta, Yape, banca móvil y PagoEfectivo cuando el cobro lo permite.
        </Typography>
      </CardContent>
    </Card>
  )
}

export default OnlinePaymentCard
