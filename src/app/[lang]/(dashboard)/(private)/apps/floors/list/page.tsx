// Next Imports
import type { Metadata } from 'next'

// Component Imports
import FloorListClient from '@views/apps/floors/list/FloorListClient'

export const metadata: Metadata = {
  title: 'Niveles',
  description: 'Mantenimiento de niveles (floors)'
}

const FloorsListPage = () => {
  return <FloorListClient />
}

export default FloorsListPage
