import type { Metadata } from 'next'

import RoomListClient from '@views/apps/rooms/list/RoomListClient'

export const metadata: Metadata = {
  title: 'Habitaciones',
  description: 'Mantenimiento de habitaciones'
}

const RoomsListPage = () => {
  return <RoomListClient />
}

export default RoomsListPage
