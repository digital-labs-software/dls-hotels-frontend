'use client'

import { useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import classnames from 'classnames'

import type { SupportStatus, SupportTicket } from '@/types/apps/supportTypes'
import { SUPPORT_CATEGORY_LABELS, SUPPORT_STATUS_COLORS, SUPPORT_STATUS_LABELS } from '@/types/apps/supportTypes'
import SupportStatusCard from './SupportStatusCard'
import { formatListDate } from './supportUtils'

export type SupportListTab = 'active' | 'resolved'

type Props = {
  tickets: SupportTicket[]
  loading: boolean
  activeUuid: string | null
  status: SupportStatus | null
  connected: boolean
  open: boolean
  isBelowMdScreen: boolean
  isBelowSmScreen: boolean
  onClose: () => void
  onSelect: (uuid: string) => void
  onNew: () => void
}

const SupportSidebar = (props: Props) => {
  const {
    tickets,
    loading,
    activeUuid,
    status,
    connected,
    open,
    isBelowMdScreen,
    isBelowSmScreen,
    onClose,
    onSelect,
    onNew
  } = props

  const [tab, setTab] = useState<SupportListTab>('active')
  const [search, setSearch] = useState('')

  const counts = useMemo(
    () => ({
      active: tickets.filter(ticket => ticket.status !== 'RESOLVED').length,
      resolved: tickets.filter(ticket => ticket.status === 'RESOLVED').length
    }),
    [tickets]
  )

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/^#/, '')

    return tickets.filter(ticket => {
      if (tab === 'active' ? ticket.status === 'RESOLVED' : ticket.status !== 'RESOLVED') return false
      if (!term) return true

      return ticket.subject.toLowerCase().includes(term) || String(ticket.number).includes(term)
    })
  }, [search, tab, tickets])

  return (
    <Drawer
      open={open}
      onClose={onClose}
      className='bs-full'
      variant={!isBelowMdScreen ? 'permanent' : 'persistent'}
      ModalProps={{ disablePortal: true, keepMounted: true }}
      sx={{
        zIndex: isBelowMdScreen && open ? 11 : 10,
        position: !isBelowMdScreen ? 'static' : 'absolute',
        ...(isBelowSmScreen && open && { width: '100%' }),
        '& .MuiDrawer-paper': {
          overflow: 'hidden',
          boxShadow: 'none',
          width: isBelowSmScreen ? '100%' : '370px',
          position: !isBelowMdScreen ? 'static' : 'absolute'
        }
      }}
    >
      <div className='flex flex-col gap-4 pli-5 plb-4 border-be'>
        <div className='flex items-start justify-between gap-2'>
          <SupportStatusCard status={status} connected={connected} compact />
          {isBelowMdScreen ? (
            <IconButton size='small' onClick={onClose}>
              <i className='ri-close-line' />
            </IconButton>
          ) : null}
        </div>
        <Button variant='contained' fullWidth startIcon={<i className='ri-add-line' />} onClick={onNew}>
          Nueva consulta
        </Button>
        <TextField
          size='small'
          placeholder='Buscar por asunto o #número'
          value={search}
          onChange={event => setSearch(event.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '999px !important' } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='ri-search-line text-xl' />
                </InputAdornment>
              )
            }
          }}
        />
      </div>

      <Tabs
        value={tab}
        onChange={(_, value: SupportListTab) => setTab(value)}
        variant='fullWidth'
        className='border-be'
      >
        <Tab value='active' label={`Activas (${counts.active})`} />
        <Tab value='resolved' label={`Resueltas (${counts.resolved})`} />
      </Tabs>

      <div className='flex-auto overflow-y-auto overflow-x-hidden'>
        {loading ? (
          <div className='flex justify-center p-6'>
            <CircularProgress size={28} />
          </div>
        ) : visible.length === 0 ? (
          <div className='flex flex-col items-center gap-2 p-6 text-center'>
            <i className='ri-chat-smile-2-line text-4xl text-textDisabled' />
            <Typography variant='body2' color='text.secondary'>
              {search
                ? 'No hay conversaciones que coincidan con la búsqueda.'
                : tab === 'active'
                  ? 'No tienes consultas abiertas. Si necesitas ayuda, crea una nueva consulta.'
                  : 'Aún no hay consultas resueltas.'}
            </Typography>
          </div>
        ) : (
          <ul className='p-3'>
            {visible.map(ticket => {
              const isActive = ticket.uuid === activeUuid

              return (
                <li
                  key={ticket.uuid}
                  className={classnames('flex flex-col gap-1 pli-3 plb-2.5 cursor-pointer rounded mbe-1', {
                    'bg-primary shadow-xs text-[var(--mui-palette-primary-contrastText)]': isActive,
                    'hover:bg-actionHover': !isActive
                  })}
                  onClick={() => onSelect(ticket.uuid)}
                >
                  <div className='flex items-center justify-between gap-2'>
                    <Typography color='inherit' className='truncate font-medium'>
                      {ticket.subject}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='inherit'
                      className={classnames('shrink-0', { 'text-textDisabled': !isActive })}
                    >
                      {formatListDate(ticket.lastMessageAt)}
                    </Typography>
                  </div>
                  <div className='flex items-center justify-between gap-2'>
                    <Typography variant='body2' color={isActive ? 'inherit' : 'text.secondary'} className='truncate'>
                      {ticket.lastAuthorType === 'PLATFORM' ? 'DLS: ' : ''}
                      {ticket.lastMessagePreview || 'Adjunto'}
                    </Typography>
                    {ticket.unreadCount > 0 ? <Chip label={ticket.unreadCount} color='error' size='small' /> : null}
                  </div>
                  <div className='flex flex-wrap items-center gap-1.5'>
                    <Typography variant='caption' color={isActive ? 'inherit' : 'text.disabled'}>
                      #{ticket.number} · {SUPPORT_CATEGORY_LABELS[ticket.category]}
                    </Typography>
                    <Chip
                      size='small'
                      variant={isActive ? 'filled' : 'tonal'}
                      color={SUPPORT_STATUS_COLORS[ticket.status]}
                      label={SUPPORT_STATUS_LABELS[ticket.status]}
                      className='bs-5 text-xs'
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Drawer>
  )
}

export default SupportSidebar
