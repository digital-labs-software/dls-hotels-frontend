import type { Metadata } from 'next'

import MyProfileClient from '@views/apps/profile/MyProfileClient'

export const metadata: Metadata = {
  title: 'Mi perfil',
  description: 'Datos del empleado que inició sesión'
}

const ProfileRoute = () => {
  return <MyProfileClient />
}

export default ProfileRoute
