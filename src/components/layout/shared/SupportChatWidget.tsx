'use client'

import { useEffect, useRef, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Zoom from '@mui/material/Zoom'
import { styled } from '@mui/material/styles'

import { useSession } from 'next-auth/react'

import CustomIconButton from '@core/components/mui/IconButton'

type SupportMessage = {
  id: number
  from: 'hotel' | 'dls'
  text: string
  time: string
}

const BadgeDot = styled('span')({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: 'var(--mui-palette-success-main)',
  boxShadow: '0 0 0 2px var(--mui-palette-background-paper)'
})

const nowLabel = () =>
  new Date().toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit'
  })

const initialMessages: SupportMessage[] = [
  {
    id: 1,
    from: 'dls',
    text: 'Hola, soy el equipo de DLS. Este es el soporte en línea del hotel.',
    time: nowLabel()
  },
  {
    id: 2,
    from: 'dls',
    text: 'Cuéntanos el problema (reservas, pagos, comprobantes u otro) y te ayudamos por aquí.',
    time: nowLabel()
  }
]

const SupportChatWidget = () => {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [messages, setMessages] = useState<SupportMessage[]>(initialMessages)
  const [replied, setReplied] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const hotelName = session?.user?.name?.split(' ')[0] || 'el hotel'

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, open])

  const sendMessage = () => {
    const text = msg.trim()

    if (!text) {
      return
    }

    const hotelMessage: SupportMessage = {
      id: Date.now(),
      from: 'hotel',
      text,
      time: nowLabel()
    }

    setMessages(prev => [...prev, hotelMessage])
    setMsg('')

    if (!replied) {
      setReplied(true)
      window.setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            from: 'dls',
            text: `Recibimos tu mensaje, ${hotelName}. Cuando el chat esté conectado al panel de DLS, te responderemos aquí en tiempo real.`,
            time: nowLabel()
          }
        ])
      }, 700)
    }
  }

  return (
    <Box
      className='mui-fixed'
      sx={{
        position: 'fixed',
        right: { xs: 16, sm: 24 },
        bottom: { xs: 16, sm: 24 },
        zIndex: 1290,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 2
      }}
    >
      <Zoom in={open} unmountOnExit>
        <Paper
          elevation={8}
          className='overflow-hidden flex flex-col'
          sx={{
            width: { xs: 'calc(100vw - 32px)', sm: 380 },
            maxWidth: 380,
            height: 'min(520px, calc(100vh - 140px))',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box
            className='flex items-center justify-between pli-4 plb-3'
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText'
            }}
          >
            <div className='flex items-center gap-3'>
              <Badge
                overlap='circular'
                badgeContent={<BadgeDot />}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              >
                <Avatar sx={{ bgcolor: 'primary.dark', color: 'primary.contrastText' }}>DLS</Avatar>
              </Badge>
              <div>
                <Typography className='font-medium' color='inherit'>
                  Soporte en línea
                </Typography>
                <Typography variant='caption' sx={{ color: 'inherit', opacity: 0.85 }}>
                  DLS · En línea
                </Typography>
              </div>
            </div>
            <IconButton size='small' onClick={() => setOpen(false)} sx={{ color: 'inherit' }}>
              <i className='ri-close-line' />
            </IconButton>
          </Box>

          <Box
            ref={listRef}
            className='flex-1 overflow-y-auto overflow-x-hidden'
            sx={{ bgcolor: 'customColors.chatBg' }}
          >
            {messages.map(item => {
              const isHotel = item.from === 'hotel'

              return (
                <div key={item.id} className={`flex gap-3 p-4 ${isHotel ? 'flex-row-reverse' : ''}`}>
                  {isHotel ? (
                    <Avatar src={session?.user?.image || undefined} alt={session?.user?.name || 'Tú'} className='is-8 bs-8'>
                      {(session?.user?.name || 'T').slice(0, 1)}
                    </Avatar>
                  ) : (
                    <Avatar className='is-8 bs-8' sx={{ bgcolor: 'primary.main', fontSize: 12 }}>
                      DLS
                    </Avatar>
                  )}
                  <div className={`flex flex-col gap-1 max-is-[75%] ${isHotel ? 'items-end' : ''}`}>
                    <Typography
                      className={`whitespace-pre-wrap pli-4 plb-2 shadow-xs ${
                        isHotel ? 'rounded-s rounded-b' : 'rounded-e rounded-b'
                      }`}
                      sx={{
                        wordBreak: 'break-word',
                        bgcolor: isHotel ? 'primary.main' : 'background.paper',
                        color: isHotel ? 'primary.contrastText' : 'text.primary'
                      }}
                    >
                      {item.text}
                    </Typography>
                    <Typography variant='caption' color='text.disabled'>
                      {item.time}
                    </Typography>
                  </div>
                </div>
              )
            })}
          </Box>

          <form
            autoComplete='off'
            className='p-3'
            style={{ background: 'var(--mui-palette-customColors-chatBg)' }}
            onSubmit={event => {
              event.preventDefault()
              sendMessage()
            }}
          >
            <TextField
              fullWidth
              size='small'
              placeholder='Escribe tu mensaje'
              value={msg}
              onChange={event => setMsg(event.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'var(--mui-palette-background-paper)',
                  boxShadow: 'var(--mui-customShadows-xs)'
                }
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <CustomIconButton variant='contained' color='primary' type='submit' className='mis-2'>
                      <i className='ri-send-plane-line' />
                    </CustomIconButton>
                  )
                }
              }}
            />
          </form>
        </Paper>
      </Zoom>

      <Tooltip
        title='Soporte en línea'
        placement='left'
        open={!open && tooltipOpen}
        onOpen={() => setTooltipOpen(true)}
        onClose={() => setTooltipOpen(false)}
      >
        <Fab
          color='primary'
          aria-label='Soporte en línea'
          onClick={() => setOpen(value => !value)}
          sx={{ boxShadow: 6 }}
        >
          <i className={open ? 'ri-close-line text-[22px]' : 'ri-customer-service-2-line text-[22px]'} />
        </Fab>
      </Tooltip>
    </Box>
  )
}

export default SupportChatWidget
