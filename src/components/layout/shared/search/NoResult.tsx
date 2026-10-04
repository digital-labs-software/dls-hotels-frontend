// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { Locale } from '@configs/i18n'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

type NoResultData = {
  label: string
  href: string
  icon: string
}

const noResultData: NoResultData[] = [
  {
    label: 'Recepción',
    href: '/apps/front-desk',
    icon: 'ri-dashboard-2-line'
  },
  {
    label: 'Reservas',
    href: '/apps/reservations',
    icon: 'ri-calendar-check-line'
  },
  {
    label: 'Facturación',
    href: '/apps/invoicing',
    icon: 'ri-bill-line'
  }
]

const NoResult = ({ searchValue, setOpen }: { searchValue: string; setOpen: (value: boolean) => void }) => {
  const { lang: locale } = useParams()

  return (
    <div className='flex items-center justify-center grow flex-wrap plb-14 pli-16 overflow-y-auto overflow-x-hidden bs-full'>
      <div className='flex flex-col items-center'>
        <i className='ri-file-forbid-line text-[64px] mbe-2.5' />
        <p className='text-lg font-medium leading-[1.55556] mbe-11'>{`Sin resultados para "${searchValue}"`}</p>
        <p className='text-[15px] leading-[1.4667] mbe-4 text-textDisabled'>Prueba buscando</p>
        <ul className='flex flex-col gap-4'>
          {noResultData.map((item, index) => (
            <li key={index} className='flex items-center'>
              <Link
                href={getLocalizedUrl(item.href, locale as Locale)}
                className='flex items-center gap-2 hover:text-primary focus-visible:text-primary focus-visible:outline-0'
                onClick={() => setOpen(false)}
              >
                <i className={classnames(item.icon, 'text-xl shrink-0')} />
                <p className='text-[15px] leading-[1.4667] truncate'>{item.label}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default NoResult
