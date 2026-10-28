'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

import { signOut } from 'next-auth/react'
import { toast } from 'react-toastify'

const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/en/pages/auth/login-v1`

let handling = false

const requestHadBearer = (init?: RequestInit) => {
  if (!init?.headers) {
    return false
  }

  try {
    const headers = new Headers(init.headers)

    return /^Bearer\s+\S+/i.test(headers.get('authorization') ?? '')
  } catch {
    return false
  }
}

const SessionExpiredGuard = () => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const original = window.fetch.bind(window)

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await original(input, init)

      if (res.status === 401 && requestHadBearer(init) && !handling) {
        handling = true
        setOpen(true)
      }

      return res
    }

    return () => {
      window.fetch = original
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    const clear = () => toast.dismiss()

    clear()
    const timer = window.setInterval(clear, 250)

    return () => window.clearInterval(timer)
  }, [open])

  const accept = async () => {
    try {
      await signOut({ callbackUrl: loginUrl })
    } catch {
      window.location.assign(loginUrl)
    }
  }

  return (
    <Dialog open={open} disableEscapeKeyDown onClose={() => undefined}>
      <DialogTitle>Sesión terminada</DialogTitle>
      <DialogContent>
        <DialogContentText>Tu sesión ha terminado. Vuelve a ingresar.</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button variant='contained' onClick={accept}>
          Aceptar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SessionExpiredGuard
