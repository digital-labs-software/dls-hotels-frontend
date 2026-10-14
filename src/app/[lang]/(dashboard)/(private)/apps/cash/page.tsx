import type { Metadata } from 'next'

import CashPage from '@views/apps/cash/CashPage'

export const metadata: Metadata = {
  title: 'Caja',
  description: 'Abrir caja, registrar egresos y cerrar el turno'
}

const CashRoute = () => {
  return <CashPage />
}

export default CashRoute
