import type { Metadata } from 'next'

import RoomTypeListClient from '@views/apps/room-types/list/RoomTypeListClient'

export const metadata: Metadata = {
  title: 'Tipos de habitación',
  description: 'Mantenimiento de tipos de habitación (room types)'
}

const RoomTypesListPage = () => {
  return <RoomTypeListClient />
}

export default RoomTypesListPage
