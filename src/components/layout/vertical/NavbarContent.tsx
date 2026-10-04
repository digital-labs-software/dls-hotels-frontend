// Third-party Imports
import classnames from 'classnames'

// Component Imports
import NavToggle from './NavToggle'
import NavSearch from '@components/layout/shared/search'
// import LanguageDropdown from '@components/layout/shared/LanguageDropdown'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import ShortcutsDropdown from '@components/layout/shared/ShortcutsDropdown'
import TodayAlertsDropdown from '@components/layout/shared/TodayAlertsDropdown'
import UserDropdown from '@components/layout/shared/UserDropdown'
import hotelHeaderShortcuts from '@/data/hotelHeaderShortcuts'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const NavbarContent = () => {
  return (
    <div className={classnames(verticalLayoutClasses.navbarContent, 'flex items-center justify-between gap-4 is-full')}>
      <div className='flex items-center gap-[7px]'>
        <NavToggle />
        <NavSearch />
      </div>
      <div className='flex items-center'>
        {/* Idioma (en/fr/ar de la plantilla). Más adelante: español, inglés y portugués. */}
        {/* <LanguageDropdown /> */}
        <ModeDropdown />
        <ShortcutsDropdown shortcuts={hotelHeaderShortcuts} />
        <TodayAlertsDropdown />
        <UserDropdown />
      </div>
    </div>
  )
}

export default NavbarContent
