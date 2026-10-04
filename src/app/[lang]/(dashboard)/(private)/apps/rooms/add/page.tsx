import type { Metadata } from 'next'

import RoomFormClient from '@views/apps/rooms/form/RoomFormClient'

export const metadata: Metadata = {
  title: 'Nueva habitación',
  description: 'Registrar una habitación'
}

const RoomsAddPage = () => {
  return <RoomFormClient />
}

export default RoomsAddPage
