'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import type { Reservation } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import { reservationsApi, getReservationsApiErrorMessage } from '@/libs/reservationsApi'
import BalanceChip from './BalanceChip'
import PaymentDialog from './PaymentDialog'

type Props = {
  open: boolean
  propertyId: number
  reservationUuid?: string | null
  onClose: () => void
  onSuccess: () => void
}

const CashMovementDialog = ({ open, propertyId, reservationUuid, onClose, onSuccess }: Props) => {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Reservation[]>([])
  const [selected, setSelected] = useState<Reservation | null>(null)
  const [payOpen, setPayOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setSearch('')
    setResults([])
    setSelected(null)
    setPayOpen(false)

    if (!reservationUuid) {
      return
    }

    const load = async () => {
      setLoading(true)

      try {
        setSelected(await reservationsApi.get(propertyId, reservationUuid))
        setPayOpen(true)
      } catch (error) {
        toast.error(getReservationsApiErrorMessage(error, 'No se encontró la reserva.'))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [open, propertyId, reservationUuid])

  const handleSearch = async () => {
    const query = search.trim()

    if (!query) {
      return
    }

    setLoading(true)

    try {
      const page = await reservationsApi.list(propertyId, { search: query, limit: 8 })

      setResults(page.data)
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudieron buscar reservas.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open && !payOpen} onClose={onClose} fullWidth maxWidth='sm'>
        <DialogTitle>Registrar movimiento</DialogTitle>
        <DialogContent className='flex flex-col gap-4 pt-4'>
          {loading && reservationUuid ? (
            <div className='flex justify-center p-6'>
              <CircularProgress size={28} />
            </div>
          ) : (
            <>
              <div className='flex gap-2'>
                <TextField
                  fullWidth
                  label='Buscar reserva'
                  placeholder='Código o huésped'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleSearch()
                    }
                  }}
                />
                <Button variant='outlined' onClick={handleSearch} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : 'Buscar'}
                </Button>
              </div>
              {results.map(reservation => (
                <button
                  key={reservation.uuid}
                  type='button'
                  className='flex items-center justify-between gap-3 rounded-md border p-3 text-start'
                  onClick={() => {
                    setSelected(reservation)
                    setPayOpen(true)
                  }}
                >
                  <div>
                    <Typography className='font-medium'>{reservation.code}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {reservation.guest
                        ? `${reservation.guest.firstName} ${reservation.guest.lastName}`
                        : 'Sin titular'}
                    </Typography>
                  </div>
                  <div className='flex flex-col items-end gap-1'>
                    <Typography variant='caption'>{formatRoomPrice(reservation.totalAmount)}</Typography>
                    <BalanceChip balance={reservation.balance} />
                  </div>
                </button>
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' color='secondary' onClick={onClose}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
      <PaymentDialog
        open={payOpen}
        propertyId={propertyId}
        reservationUuid={selected?.uuid}
        reservationCode={selected?.code}
        balance={selected?.balance}
        onClose={() => {
          setPayOpen(false)

          if (reservationUuid) {
            onClose()
          }
        }}
        onSuccess={onSuccess}
      />
    </>
  )
}

export default CashMovementDialog
