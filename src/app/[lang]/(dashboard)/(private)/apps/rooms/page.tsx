import type { Metadata } from 'next'

import RoomsCatalog from '@views/apps/rooms/RoomsCatalog'

export const metadata: Metadata = {
  title: 'Habitaciones',
  description: 'Habitaciones, tipos de habitación y niveles'
}

type Props = {
  searchParams: Promise<{ tab?: string }>
}

const RoomsPage = async ({ searchParams }: Props) => {
  const { tab } = await searchParams

  return <RoomsCatalog defaultTab={tab} />
}

export default RoomsPage
