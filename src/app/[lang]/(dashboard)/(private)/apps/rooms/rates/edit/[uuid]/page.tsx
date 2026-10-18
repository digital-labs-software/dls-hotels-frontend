import type { Metadata } from 'next'

import RateFormClient from '@views/apps/rates/form/RateFormClient'

export const metadata: Metadata = {
  title: 'Editar tarifa',
  description: 'Editar o ver una tarifa por temporada'
}

type Props = {
  params: Promise<{ uuid: string }>
}

const RatesEditPage = async ({ params }: Props) => {
  const { uuid } = await params

  return <RateFormClient uuid={uuid} />
}

export default RatesEditPage
