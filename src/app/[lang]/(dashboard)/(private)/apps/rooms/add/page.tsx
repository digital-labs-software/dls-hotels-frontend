import type { Metadata } from 'next'

import RoomFormClient from '@views/apps/rooms/form/RoomFormClient'

export const metadata: Metadata = {
  title: 'Agregar habitación',
  description: 'Crear una habitación'
}

const RoomsAddPage = () => {
  return <RoomFormClient />
}

export default RoomsAddPage
