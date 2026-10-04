'use client'

import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

const InvoicingComingSoon = () => {
  return (
    <Card>
      <CardContent className='flex flex-col gap-4'>
        <div>
          <Typography variant='h4'>Facturación</Typography>
          <Typography color='text.secondary'>
            Emisión de boletas y facturas electrónicas (SUNAT)
          </Typography>
        </div>
        <Alert severity='info'>
          Esta sección está en desarrollo. Aquí podrás emitir boletas, facturas y notas electrónicas cuando el backend
          esté listo.
        </Alert>
      </CardContent>
    </Card>
  )
}

export default InvoicingComingSoon
