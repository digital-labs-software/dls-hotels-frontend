type SearchData = {
  id: string
  name: string
  url: string
  excludeLang?: boolean
  icon: string
  section: string
  shortcut?: string
}

const data: SearchData[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    url: '/apps/dashboard',
    icon: 'ri-home-smile-line',
    section: 'Operación'
  },
  {
    id: 'front-desk',
    name: 'Recepción',
    url: '/apps/front-desk',
    icon: 'ri-dashboard-2-line',
    section: 'Operación'
  },
  {
    id: 'reservations',
    name: 'Reservas',
    url: '/apps/reservations',
    icon: 'ri-calendar-check-line',
    section: 'Operación'
  },
  {
    id: 'rooms',
    name: 'Habitaciones',
    url: '/apps/rooms',
    icon: 'ri-hotel-bed-line',
    section: 'Alojamiento'
  },
  {
    id: 'room-types',
    name: 'Tipos de habitación',
    url: '/apps/rooms?tab=room-types',
    icon: 'ri-hotel-line',
    section: 'Alojamiento'
  },
  {
    id: 'floors',
    name: 'Pisos',
    url: '/apps/rooms?tab=floors',
    icon: 'ri-stack-line',
    section: 'Alojamiento'
  },
  {
    id: 'rates',
    name: 'Tarifas',
    url: '/apps/rooms?tab=rates',
    icon: 'ri-money-dollar-circle-line',
    section: 'Alojamiento'
  },
  {
    id: 'clients',
    name: 'Clientes',
    url: '/apps/clients',
    icon: 'ri-group-line',
    section: 'Alojamiento'
  },
  {
    id: 'guests',
    name: 'Huéspedes',
    url: '/apps/clients',
    icon: 'ri-user-line',
    section: 'Alojamiento'
  },
  {
    id: 'companies',
    name: 'Empresas',
    url: '/apps/clients?tab=companies',
    icon: 'ri-building-line',
    section: 'Alojamiento'
  },
  {
    id: 'invoicing',
    name: 'Facturación',
    url: '/apps/invoicing',
    icon: 'ri-bill-line',
    section: 'Finanzas'
  },
  {
    id: 'invoices',
    name: 'Boletas y facturas',
    url: '/apps/invoicing',
    icon: 'ri-file-list-3-line',
    section: 'Finanzas'
  },
  {
    id: 'sunat',
    name: 'SUNAT',
    url: '/apps/invoicing',
    icon: 'ri-file-text-line',
    section: 'Finanzas'
  },
  {
    id: 'invoicing-issue',
    name: 'Nuevo comprobante',
    url: '/apps/invoicing/issue',
    icon: 'ri-file-add-line',
    section: 'Finanzas'
  },
  {
    id: 'invoicing-settings',
    name: 'Series y SUNAT',
    url: '/apps/hotel/einvoice',
    icon: 'ri-settings-3-line',
    section: 'Administración'
  },
  {
    id: 'reports',
    name: 'Reportes',
    url: '/apps/reports',
    icon: 'ri-file-chart-line',
    section: 'Finanzas'
  },
  {
    id: 'guest-sheet',
    name: 'Parte de huéspedes',
    url: '/apps/reports',
    icon: 'ri-file-list-3-line',
    section: 'Finanzas'
  },
  {
    id: 'subscription',
    name: 'Suscripción',
    url: '/apps/billing',
    icon: 'ri-secure-payment-line',
    section: 'Finanzas'
  },
  {
    id: 'staff',
    name: 'Personal',
    url: '/apps/staff',
    icon: 'ri-id-card-line',
    section: 'Administración'
  },
  {
    id: 'employees',
    name: 'Empleados',
    url: '/apps/staff',
    icon: 'ri-id-card-line',
    section: 'Administración'
  },
  {
    id: 'roles',
    name: 'Roles y permisos',
    url: '/apps/staff?tab=roles',
    icon: 'ri-shield-user-line',
    section: 'Administración'
  },
  {
    id: 'hotel',
    name: 'Hotel',
    url: '/apps/hotel',
    icon: 'ri-building-4-line',
    section: 'Administración'
  },
  {
    id: 'profile',
    name: 'Mi perfil',
    url: '/apps/profile',
    icon: 'ri-user-3-line',
    section: 'Administración'
  }
]

export default data
