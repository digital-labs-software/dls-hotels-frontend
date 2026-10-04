'use client'

import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Tooltip from '@mui/material/Tooltip'

import type { DocumentLookupState } from '@/hooks/useDocumentLookup'

const STATUS_STYLE = {
  loading: { color: 'var(--mui-palette-text-secondary)', icon: null },
  found: { color: 'var(--mui-palette-success-main)', icon: 'ri-checkbox-circle-line' },
  not_found: { color: 'var(--mui-palette-warning-main)', icon: 'ri-error-warning-line' },
  error: { color: 'var(--mui-palette-error-main)', icon: 'ri-close-circle-line' }
} as const

/** Mensaje bajo el input del documento: consultando, encontrado, no encontrado o error. */
export const DocumentLookupHelper = ({ lookup }: { lookup: DocumentLookupState }) => {
  if (lookup.status === 'idle' || !lookup.message) return null

  const style = STATUS_STYLE[lookup.status]

  return (
    <span className='flex items-center gap-1' style={{ color: style.color }}>
      {style.icon ? <i className={`${style.icon} text-base`} /> : null}
      {lookup.message}
    </span>
  )
}

/** Indicador de carga y botón para repetir la consulta, al final del input. */
export const DocumentLookupAdornment = ({
  lookup,
  canSearch,
  onSearch
}: {
  lookup: DocumentLookupState
  canSearch: boolean
  onSearch: () => void
}) => (
  <InputAdornment position='end'>
    {lookup.status === 'loading' ? (
      <CircularProgress size={18} />
    ) : (
      <Tooltip title='Consultar datos'>
        <span>
          <IconButton size='small' edge='end' disabled={!canSearch} onClick={onSearch} aria-label='Consultar datos'>
            <i className='ri-search-line text-lg' />
          </IconButton>
        </span>
      </Tooltip>
    )}
  </InputAdornment>
)
