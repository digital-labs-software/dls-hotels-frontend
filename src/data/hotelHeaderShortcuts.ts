import type { ShortcutsType } from '@components/layout/shared/ShortcutsDropdown'

const hotelHeaderShortcuts: ShortcutsType[] = [
  {
    url: '/apps/front-desk',
    icon: 'ri-dashboard-2-line',
    title: 'Recepción',
    subtitle: 'Llegadas y salidas'
  },
  {
    url: '/apps/reservations',
    icon: 'ri-calendar-check-line',
    title: 'Reservas',
    subtitle: 'Calendario'
  },
  {
    url: '/apps/clients',
    icon: 'ri-group-line',
    title: 'Clientes',
    subtitle: 'Huéspedes y empresas'
  },
  {
    url: '/apps/rooms',
    icon: 'ri-hotel-bed-line',
    title: 'Habitaciones',
    subtitle: 'Tipos y tarifas'
  },
  {
    url: '/apps/reports',
    icon: 'ri-file-chart-line',
    title: 'Reportes',
    subtitle: 'Parte de huéspedes'
  },
  {
    url: '/apps/dashboard',
    icon: 'ri-home-smile-line',
    title: 'Dashboard',
    subtitle: 'Resumen del día'
  }
]

export default hotelHeaderShortcuts
