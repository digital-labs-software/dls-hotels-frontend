'use client'

import { useEffect, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

import { toast } from 'react-toastify'

import type { RoomPriceBoardRow } from '@/libs/roomsApi'
import { adjustRoomPrices, getRoomPriceBoard, getRoomsApiErrorMessage } from '@/libs/roomsApi'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import tableStyles from '@core/styles/table.module.css'

type Props = {
  open: boolean
  propertyId: number
  onClose: () => void
  onSaved: () => void
}

const money = (value: number) => Math.round(value * 100) / 100

const parseMoney = (value: string) => {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value.replace(',', '.').trim())

  return Number.isFinite(parsed) ? money(parsed) : null
}

const roomsLabel = (count: number) => (count === 1 ? '1 habitación' : `${count} habitaciones`)

const stickyHeader = {
  position: 'sticky',
  insetBlockStart: 0,
  zIndex: 1,
  backgroundColor: 'var(--mui-palette-background-paper)',
  boxShadow: 'inset 0 -1px 0 var(--mui-palette-divider)'
} as const

const RoomPriceAdjustDialog = ({ open, propertyId, onClose, onSaved }: Props) => {
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))
  const onCloseRef = useRef(onClose)

  onCloseRef.current = onClose

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rooms, setRooms] = useState<RoomPriceBoardRow[]>([])
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [nextPrice, setNextPrice] = useState<Record<number, string>>({})
  const [amount, setAmount] = useState('20')
  const [typeFilter, setTypeFilter] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    setChecked({})
    setNextPrice({})
    setAmount('20')
    setTypeFilter('')
    setNotice('')
    setLoading(true)

    void getRoomPriceBoard(propertyId)
      .then(rows => {
        if (!cancelled) {
          setRooms(rows)
        }
      })
      .catch(error => {
        if (!cancelled) {
          toast.error(getRoomsApiErrorMessage(error, 'No se pudieron cargar las habitaciones.'))
          onCloseRef.current()
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, propertyId])

  const changeTypeFilter = (value: string) => {
    setTypeFilter(value)
    setChecked({})
    setNextPrice({})
    setNotice('')
  }

  const selected = rooms.filter(room => checked[room.id])
  const typeNames = [...new Set(rooms.map(room => room.roomTypeName))]
  const visible = typeFilter ? rooms.filter(room => room.roomTypeName === typeFilter) : rooms
  const visibleSelected = visible.filter(room => checked[room.id])
  const allChecked = visible.length > 0 && visibleSelected.length === visible.length

  const toggleRoom = (room: RoomPriceBoardRow, value: boolean) => {
    setNotice('')
    setChecked(current => ({ ...current, [room.id]: value }))

    if (value) {
      setNextPrice(current =>
        current[room.id] ? current : { ...current, [room.id]: room.priceOverride.toFixed(2) }
      )
    }
  }

  const toggleAll = (value: boolean) => {
    setNotice('')
    setChecked(current => ({ ...current, ...Object.fromEntries(visible.map(room => [room.id, value])) }))

    if (value) {
      setNextPrice(current => {
        const copy = { ...current }

        visible.forEach(room => {
          copy[room.id] = copy[room.id] || room.priceOverride.toFixed(2)
        })

        return copy
      })
    }
  }

  const shift = (sign: 1 | -1) => {
    if (!visibleSelected.length) {
      setNotice('Marque primero las habitaciones en la tabla.')

      return
    }

    const value = parseMoney(amount)

    if (value === null || value <= 0) {
      setNotice('Escriba cuántos soles.')

      return
    }

    const tooLow = visibleSelected.find(room => money(room.priceOverride + sign * value) <= 0)

    if (tooLow) {
      setNotice(`La habitación ${tooLow.number} quedaría sin precio. Baje un monto menor.`)

      return
    }

    setNotice('')

    setNextPrice(current => {
      const copy = { ...current }

      visibleSelected.forEach(room => {
        copy[room.id] = money(room.priceOverride + sign * value).toFixed(2)
      })

      return copy
    })
  }

  const save = async () => {
    if (!selected.length) {
      setNotice('Marque al menos una habitación.')

      return
    }

    setNotice('')

    const items: { roomId: number; price: number }[] = []

    for (const room of selected) {
      const price = parseMoney(nextPrice[room.id] ?? '')

      if (price === null || price <= 0) {
        setNotice(`Escriba el precio nuevo de la habitación ${room.number}.`)

        return
      }

      items.push({ roomId: room.id, price })
    }

    setSaving(true)

    try {
      const result = await adjustRoomPrices(propertyId, { rooms: items })

      toast.success(
        result.updated
          ? `Listo: cambió el precio normal de ${roomsLabel(result.updated)}.`
          : 'No había precios distintos que guardar.'
      )
      onSaved()
      onClose()
    } catch (error) {
      toast.error(getRoomsApiErrorMessage(error, 'No se pudo cambiar el precio.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth='md' fullScreen={isMobile}>
      <DialogTitle className='flex items-center justify-between gap-4'>
        Cambiar precios
        <IconButton onClick={onClose} disabled={saving} aria-label='Cerrar'>
          <i className='ri-close-line' />
        </IconButton>
      </DialogTitle>
      <DialogContent className='flex flex-col gap-4 pbs-2'>
        {loading ? (
          <div className='flex justify-center p-10'>
            <CircularProgress size={32} />
          </div>
        ) : rooms.length === 0 ? (
          <Typography>Todavía no hay habitaciones.</Typography>
        ) : (
          <>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pbs-2'>
              <TextField
                select
                size='small'
                label='Tipo de habitación'
                value={typeFilter}
                onChange={event => changeTypeFilter(event.target.value)}
                className='is-full sm:is-[220px]'
              >
                <MenuItem value=''>Todos los tipos</MenuItem>
                {typeNames.map(name => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
              <div className='flex items-center gap-2'>
                <TextField
                  size='small'
                  value={amount}
                  onChange={event => setAmount(event.target.value)}
                  inputProps={{ inputMode: 'decimal', 'aria-label': 'Soles' }}
                  InputProps={{ startAdornment: <InputAdornment position='start'>S/</InputAdornment> }}
                  className='is-[120px]'
                />
                <Button
                  variant='outlined'
                  color='secondary'
                  onClick={() => shift(-1)}
                  startIcon={<i className='ri-subtract-line' />}
                >
                  Bajar
                </Button>
                <Button variant='contained' onClick={() => shift(1)} startIcon={<i className='ri-add-line' />}>
                  Subir
                </Button>
              </div>
            </div>

            {notice ? <Alert severity='warning'>{notice}</Alert> : null}

            <div className='overflow-auto border rounded max-bs-[400px]'>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th style={stickyHeader}>
                      <Checkbox
                        checked={allChecked}
                        indeterminate={visibleSelected.length > 0 && !allChecked}
                        onChange={event => toggleAll(event.target.checked)}
                        inputProps={{ 'aria-label': 'Marcar todas' }}
                      />
                    </th>
                    <th style={stickyHeader}>Habitación</th>
                    <th style={stickyHeader}>Tipo</th>
                    <th style={stickyHeader}>Precio normal</th>
                    <th style={stickyHeader}>Nuevo</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(room => {
                    const isChecked = Boolean(checked[room.id])

                    return (
                      <tr key={room.id}>
                        <td>
                          <Checkbox
                            checked={isChecked}
                            onChange={event => toggleRoom(room, event.target.checked)}
                            inputProps={{ 'aria-label': `Marcar habitación ${room.number}` }}
                          />
                        </td>
                        <td>
                          <Typography color='text.primary' className='font-medium'>
                            {room.number}
                          </Typography>
                        </td>
                        <td>{room.roomTypeName}</td>
                        <td>{formatRoomPrice(room.priceOverride)}</td>
                        <td>
                          {isChecked ? (
                            <TextField
                              size='small'
                              value={nextPrice[room.id] ?? ''}
                              onChange={event =>
                                setNextPrice(current => ({ ...current, [room.id]: event.target.value }))
                              }
                              inputProps={{ inputMode: 'decimal', 'aria-label': `Precio nuevo ${room.number}` }}
                              InputProps={{ startAdornment: <InputAdornment position='start'>S/</InputAdornment> }}
                              className='is-[130px]'
                            />
                          ) : (
                            <Typography variant='body2' color='text.disabled'>
                              Sin cambio
                            </Typography>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Typography variant='body2' color='text.secondary'>
              Las tarifas con fechas, como Semana Santa, no cambian: en sus días se sigue cobrando la tarifa.
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' color='secondary' onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant='contained' onClick={() => void save()} disabled={loading || saving || !selected.length}>
          {saving ? 'Guardando…' : selected.length ? `Guardar cambios (${selected.length})` : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RoomPriceAdjustDialog
