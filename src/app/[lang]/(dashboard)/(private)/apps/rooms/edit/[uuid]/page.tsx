import type { Metadata } from 'next'

import RoomFormClient from '@views/apps/rooms/form/RoomFormClient'

export const metadata: Metadata = {
  title: 'Editar habitación',
  description: 'Editar o ver una habitación'
}

type Props = {
  params: Promise<{ uuid: string }>
}

const RoomsEditPage = async ({ params }: Props) => {
  const { uuid } = await params

  return <RoomFormClient uuid={uuid} />
}

export default RoomsEditPage
