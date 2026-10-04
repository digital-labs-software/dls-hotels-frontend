'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomIconButton from '@core/components/mui/IconButton'
import { getInitials } from '@/utils/getInitials'
import type { SupportMessage, SupportStatus, SupportTicketDetail } from '@/types/apps/supportTypes'
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_MAX_ATTACHMENTS,
  SUPPORT_MAX_MESSAGE,
  SUPPORT_STATUS_COLORS,
  SUPPORT_STATUS_LABELS
} from '@/types/apps/supportTypes'
import { validateSupportFile } from '@/libs/supportApi'
import { MessageAttachments, PendingFiles, SUPPORT_FILE_ACCEPT } from './SupportAttachments'
import SupportStatusCard from './SupportStatusCard'
import { formatTime, groupMessages } from './supportUtils'

type Props = {
  ticket: SupportTicketDetail | null
  loading: boolean
  status: SupportStatus | null
  connected: boolean
  typingName: string | null
  sending: boolean
  resolving: boolean
  isBelowMdScreen: boolean
  isBelowSmScreen: boolean
  onOpenSidebar: () => void
  onNew: () => void
  onSend: (body: string, files: File[]) => Promise<boolean>
  onResolve: () => void
  onTyping: (typing: boolean) => void
}

const AuthorAvatar = ({ message }: { message: SupportMessage }) => {
  const name = message.author?.name || (message.authorType === 'PLATFORM' ? 'Soporte DLS' : 'Hotel')

  if (message.author?.photoUrl) {
    return <Avatar alt={name} src={message.author.photoUrl} className='is-8 bs-8' />
  }

  return (
    <CustomAvatar skin='light' color={message.authorType === 'PLATFORM' ? 'info' : 'primary'} size={32}>
      {message.authorType === 'PLATFORM' && !message.author ? (
        <i className='ri-customer-service-2-line text-lg' />
      ) : (
        getInitials(name)
      )}
    </CustomAvatar>
  )
}

const SupportConversation = (props: Props) => {
  const {
    ticket,
    loading,
    status,
    connected,
    typingName,
    sending,
    resolving,
    isBelowMdScreen,
    isBelowSmScreen,
    onOpenSidebar,
    onNew,
    onSend,
    onResolve,
    onTyping
  } = props

  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingRef = useRef(false)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ticketUuid = ticket?.uuid
  const messageCount = ticket?.messages.length ?? 0

  useEffect(() => {
    setMessage('')
    setFiles([])
    setFileError(null)
    inputRef.current?.focus()
  }, [ticketUuid])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [ticketUuid, messageCount, typingName])

  const stopTyping = () => {
    if (typingTimer.current) clearTimeout(typingTimer.current)

    if (typingRef.current) {
      typingRef.current = false
      onTyping(false)
    }
  }

  useEffect(() => stopTyping, [ticketUuid]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (value: string) => {
    setMessage(value)

    if (!typingRef.current && value.trim()) {
      typingRef.current = true
      onTyping(true)
    }

    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(stopTyping, 3000)
  }

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || [])

    event.target.value = ''

    const invalid = picked.map(file => validateSupportFile(file)).find(Boolean)

    if (invalid) {
      setFileError(invalid)

      return
    }

    setFileError(null)
    setFiles(prev => [...prev, ...picked].slice(0, SUPPORT_MAX_ATTACHMENTS))
  }

  const handleSend = async (event: FormEvent | KeyboardEvent) => {
    event.preventDefault()

    if (sending || (!message.trim() && !files.length)) return

    stopTyping()

    const ok = await onSend(message.trim(), files)

    if (ok) {
      setMessage('')
      setFiles([])
      setFileError(null)
      inputRef.current?.focus()
    }
  }

  if (!ticket) {
    return (
      <CardContent className='flex flex-col flex-auto items-center justify-center bs-full gap-5 bg-[var(--mui-palette-customColors-chatBg)]'>
        {loading ? (
          <CircularProgress size={36} />
        ) : (
          <>
            <CustomAvatar variant='circular' size={98} color='primary' skin='light'>
              <i className='ri-customer-service-2-line text-[50px]' />
            </CustomAvatar>
            <div className='flex flex-col items-center gap-1 text-center max-is-[460px]'>
              <Typography variant='h5'>¿En qué te ayudamos?</Typography>
              <Typography color='text.secondary'>
                Escríbenos sobre reservas, facturación, tu suscripción o cualquier error del sistema. En horario de
                atención te respondemos por chat en vivo; fuera de horario tu consulta queda como ticket.
              </Typography>
            </div>
            <div className='rounded bg-backgroundPaper p-4 shadow-xs max-is-[460px] is-full'>
              <SupportStatusCard status={status} connected={connected} />
            </div>
            <div className='flex flex-wrap justify-center gap-3'>
              <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={onNew}>
                Nueva consulta
              </Button>
              {isBelowMdScreen ? (
                <Button variant='outlined' startIcon={<i className='ri-chat-history-line' />} onClick={onOpenSidebar}>
                  Mis conversaciones
                </Button>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    )
  }

  const groups = groupMessages(ticket.messages)
  const isResolved = ticket.status === 'RESOLVED'

  return (
    <div className='flex flex-col grow bs-full min-is-0'>
      <div className='flex items-center justify-between gap-3 border-be plb-[14px] pli-5 bg-[var(--mui-palette-customColors-chatBg)]'>
        <div className='flex items-center gap-3 min-is-0'>
          {isBelowMdScreen ? (
            <IconButton size='small' onClick={onOpenSidebar}>
              <i className='ri-menu-line text-textSecondary' />
            </IconButton>
          ) : null}
          <div className='min-is-0'>
            <Typography color='text.primary' className='truncate font-medium'>
              {ticket.subject}
            </Typography>
            <div className='flex flex-wrap items-center gap-2'>
              <Typography variant='body2' color='text.secondary'>
                #{ticket.number} · {SUPPORT_CATEGORY_LABELS[ticket.category]}
                {ticket.assignedTo ? ` · Te atiende ${ticket.assignedTo.name}` : ''}
              </Typography>
              <Chip
                size='small'
                variant='tonal'
                color={SUPPORT_STATUS_COLORS[ticket.status]}
                label={SUPPORT_STATUS_LABELS[ticket.status]}
              />
            </div>
          </div>
        </div>
        {!isResolved ? (
          isBelowSmScreen ? (
            <Tooltip title='Marcar como resuelta'>
              <span>
                <IconButton color='success' onClick={onResolve} disabled={resolving}>
                  <i className='ri-checkbox-circle-line' />
                </IconButton>
              </span>
            </Tooltip>
          ) : (
            <Button
              variant='outlined'
              color='success'
              size='small'
              className='shrink-0'
              onClick={onResolve}
              disabled={resolving}
              startIcon={<i className='ri-checkbox-circle-line' />}
            >
              Ya se resolvió
            </Button>
          )
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className='flex-auto overflow-y-auto overflow-x-hidden bg-[var(--mui-palette-customColors-chatBg)]'
      >
        <CardContent className='flex flex-col gap-1 p-0 plb-3'>
          {groups.map(group => {
            const first = group.messages[0]

            return (
              <Fragment key={group.key}>
                {group.dayLabel ? (
                  <div className='flex justify-center plb-2'>
                    <Chip size='small' variant='outlined' label={group.dayLabel} className='capitalize' />
                  </div>
                ) : null}

                {group.authorType === 'SYSTEM' ? (
                  <div className='flex justify-center pli-5 plb-1'>
                    <Typography variant='caption' color='text.secondary' className='text-center italic'>
                      <i className='ri-information-line align-middle mie-1' />
                      {first.body} · {formatTime(first.createdAt)}
                    </Typography>
                  </div>
                ) : (
                  (() => {
                    const isMine = group.authorType === 'HOTEL'
                    const last = group.messages[group.messages.length - 1]

                    return (
                      <div className={classnames('flex gap-3 pli-5 plb-2', { 'flex-row-reverse': isMine })}>
                        <AuthorAvatar message={first} />
                        <div
                          className={classnames('flex flex-col gap-1.5', {
                            'items-end': isMine,
                            'max-is-[65%]': !isBelowMdScreen,
                            'max-is-[75%]': isBelowMdScreen && !isBelowSmScreen,
                            'max-is-[calc(100%-4rem)]': isBelowSmScreen
                          })}
                        >
                          <Typography variant='caption' color='text.secondary'>
                            {isMine ? first.author?.name || 'Hotel' : `${first.author?.name || 'Soporte'} · DLS`}
                          </Typography>
                          {group.messages.map(item => (
                            <Fragment key={item.uuid}>
                              {item.body ? (
                                <Typography
                                  className={classnames('whitespace-pre-wrap pli-4 plb-2 shadow-xs', {
                                    'bg-backgroundPaper rounded-e rounded-b': !isMine,
                                    'bg-primary text-[var(--mui-palette-primary-contrastText)] rounded-s rounded-b':
                                      isMine
                                  })}
                                  style={{ wordBreak: 'break-word' }}
                                >
                                  {item.body}
                                </Typography>
                              ) : null}
                              <MessageAttachments attachments={item.attachments} inverted={isMine} />
                            </Fragment>
                          ))}
                          <Typography variant='caption' color='text.disabled'>
                            {formatTime(last.createdAt)}
                          </Typography>
                        </div>
                      </div>
                    )
                  })()
                )}
              </Fragment>
            )
          })}

          {typingName ? (
            <div className='flex items-center gap-2 pli-5 plb-2'>
              <i className='ri-more-fill text-xl text-primary animate-pulse' />
              <Typography variant='caption' color='text.secondary'>
                {typingName} está escribiendo…
              </Typography>
            </div>
          ) : null}
        </CardContent>
      </div>

      <form
        autoComplete='off'
        onSubmit={handleSend}
        className='flex flex-col gap-2 p-5 bg-[var(--mui-palette-customColors-chatBg)]'
      >
        {isResolved ? (
          <Alert severity='success' icon={<i className='ri-checkbox-circle-line' />} className='plb-1'>
            Esta consulta está resuelta. Si vuelves a escribir, se reabre.
          </Alert>
        ) : status?.mode === 'OFFLINE' ? (
          <Typography variant='caption' color='text.secondary'>
            <i className='ri-time-line align-middle mie-1' />
            Fuera de horario: te responderemos {status.nextOpeningLabel || 'en cuanto volvamos'}.
          </Typography>
        ) : null}
        <PendingFiles files={files} onRemove={index => setFiles(prev => prev.filter((_, i) => i !== index))} />
        {fileError ? (
          <Alert severity='error' onClose={() => setFileError(null)} className='plb-1'>
            {fileError}
          </Alert>
        ) : null}
        <TextField
          fullWidth
          multiline
          maxRows={5}
          size='small'
          placeholder='Escribe un mensaje…'
          value={message}
          onChange={event => handleChange(event.target.value)}
          onBlur={stopTyping}
          inputRef={inputRef}
          disabled={sending}
          sx={{
            '& fieldset': { border: '0' },
            '& .MuiOutlinedInput-root': {
              background: 'var(--mui-palette-background-paper)',
              boxShadow: 'var(--mui-customShadows-xs)'
            }
          }}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              void handleSend(event)
            }
          }}
          slotProps={{
            htmlInput: { maxLength: SUPPORT_MAX_MESSAGE },
            input: {
              endAdornment: (
                <div className='flex items-center gap-1'>
                  <Tooltip title='Adjuntar captura o PDF (máx. 5 MB)'>
                    <span>
                      <IconButton
                        size='small'
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sending || files.length >= SUPPORT_MAX_ATTACHMENTS}
                      >
                        <i className='ri-attachment-2 text-textPrimary' />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {isBelowSmScreen ? (
                    <CustomIconButton variant='contained' color='primary' type='submit' disabled={sending}>
                      <i className={sending ? 'ri-loader-4-line animate-spin' : 'ri-send-plane-line'} />
                    </CustomIconButton>
                  ) : (
                    <Button
                      variant='contained'
                      color='primary'
                      type='submit'
                      disabled={sending}
                      endIcon={<i className={sending ? 'ri-loader-4-line animate-spin' : 'ri-send-plane-line'} />}
                    >
                      Enviar
                    </Button>
                  )}
                </div>
              )
            }
          }}
        />
        <input ref={fileInputRef} hidden type='file' multiple accept={SUPPORT_FILE_ACCEPT} onChange={handleFiles} />
      </form>
    </div>
  )
}

export default SupportConversation
