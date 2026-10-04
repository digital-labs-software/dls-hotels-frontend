'use client'

// Next Imports
import Link from 'next/link'

// Third-party Imports
import classnames from 'classnames'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const FooterContent = () => {
  return (
    <div className={classnames(verticalLayoutClasses.footerContent, 'flex items-center justify-between flex-wrap gap-4')}>
      <p>
        <span>{`© ${new Date().getFullYear()} `}</span>
        <Link href='https://dls.com.pe' target='_blank' rel='noopener noreferrer' className='text-primary'>
          DLS
        </Link>
        <span>{` · Todos los derechos reservados`}</span>
      </p>
      <div className='flex items-center gap-4'>
        <Link
          href='/images/docs/manual-usuario-dls-hoteles.pdf'
          target='_blank'
          rel='noopener noreferrer'
          className='text-primary'
        >
          Manual de usuario
        </Link>
        <Link href='mailto:soporte@dls.com.pe' className='text-primary'>
          Soporte
        </Link>
      </div>
    </div>
  )
}

export default FooterContent
