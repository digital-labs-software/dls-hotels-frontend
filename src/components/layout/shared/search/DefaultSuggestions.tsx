// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { Locale } from '@configs/i18n'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

type DefaultSuggestionsType = {
  sectionLabel: string
  items: {
    label: string
    href: string
    icon?: string
  }[]
}

const defaultSuggestions: DefaultSuggestionsType[] = [
  {
    sectionLabel: 'Operación',
    items: [
      {
        label: 'Dashboard',
        href: '/apps/dashboard',
        icon: 'ri-home-smile-line'
      },
      {
        label: 'Recepción',
        href: '/apps/front-desk',
        icon: 'ri-dashboard-2-line'
      },
      {
        label: 'Reservas',
        href: '/apps/reservations',
        icon: 'ri-calendar-check-line'
      }
    ]
  },
  {
    sectionLabel: 'Alojamiento',
    items: [
      {
        label: 'Habitaciones',
        href: '/apps/rooms',
        icon: 'ri-hotel-bed-line'
      },
      {
        label: 'Clientes',
        href: '/apps/clients',
        icon: 'ri-group-line'
      },
      {
        label: 'Tarifas',
        href: '/apps/rooms?tab=rates',
        icon: 'ri-money-dollar-circle-line'
      }
    ]
  },
  {
    sectionLabel: 'Finanzas',
    items: [
      {
        label: 'Facturación',
        href: '/apps/invoicing',
        icon: 'ri-bill-line'
      },
      {
        label: 'Reportes',
        href: '/apps/reports',
        icon: 'ri-file-chart-line'
      },
      {
        label: 'Suscripción',
        href: '/apps/billing',
        icon: 'ri-secure-payment-line'
      }
    ]
  },
  {
    sectionLabel: 'Administración',
    items: [
      {
        label: 'Hotel',
        href: '/apps/hotel',
        icon: 'ri-building-4-line'
      },
      {
        label: 'Personal',
        href: '/apps/staff',
        icon: 'ri-id-card-line'
      },
      {
        label: 'Mi perfil',
        href: '/apps/profile',
        icon: 'ri-user-3-line'
      }
    ]
  }
]

const DefaultSuggestions = ({ setOpen }: { setOpen: (value: boolean) => void }) => {
  // Hooks
  const { lang: locale } = useParams()

  return (
    <div className='flex grow flex-wrap gap-x-[48px] gap-y-8 plb-14 pli-16 overflow-y-auto overflow-x-hidden bs-full'>
      {defaultSuggestions.map((section, index) => (
        <div
          key={index}
          className='flex flex-col justify-center overflow-x-hidden gap-4 basis-full sm:basis-[calc((100%-3rem)/2)]'
        >
          <p className='text-xs leading-[1.16667] uppercase text-textDisabled tracking-[0.8px]'>
            {section.sectionLabel}
          </p>
          <ul className='flex flex-col gap-4'>
            {section.items.map((item, i) => (
              <li key={i} className='flex'>
                <Link
                  href={getLocalizedUrl(item.href, locale as Locale)}
                  className='flex items-center overflow-x-hidden cursor-pointer gap-2 hover:text-primary focus-visible:text-primary focus-visible:outline-0'
                  onClick={() => setOpen(false)}
                >
                  {item.icon && <i className={classnames(item.icon, 'flex text-xl shrink-0')} />}
                  <p className='text-[15px] leading-[1.4667] truncate'>{item.label}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default DefaultSuggestions
