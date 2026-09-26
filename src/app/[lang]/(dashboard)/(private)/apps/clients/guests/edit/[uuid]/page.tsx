import type { Metadata } from 'next'

import GuestFormClient from '@views/apps/clients/guests/form/GuestFormClient'

export const metadata: Metadata = {
  title: 'Editar huésped',
  description: 'Editar o ver un huésped'
}

type Props = {
  params: Promise<{ uuid: string }>
}

const GuestsEditPage = async ({ params }: Props) => {
  const { uuid } = await params

  return <GuestFormClient uuid={uuid} />
}

export default GuestsEditPage
