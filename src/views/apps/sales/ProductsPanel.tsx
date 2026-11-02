'use client'

import { useEffect, useRef, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import { scrollToFirstInvalid } from '@/utils/scrollToFirstInvalid'

import {
  CHARGE_UNIT_LABEL,
  CHARGE_UNITS,
  getSalesApiErrorMessage,
  salesApi,
  type ProductChargeUnit,
  type SaleProduct
} from '@/libs/salesApi'
import { formatRoomPrice } from '@/types/apps/roomsTypes'
import tableStyles from '@core/styles/table.module.css'

type Props = {
  propertyId: number
  products: SaleProduct[]
  canEdit: boolean
  onChanged: () => Promise<void> | void
}

type FormState = {
  name: string
  price: string
  chargeUnit: ProductChargeUnit
  note: string
}

const emptyForm: FormState = { name: '', price: '', chargeUnit: 'UNIT', note: '' }

const ProductsPanel = ({ propertyId, products, canEdit, onChanged }: Props) => {
  const [query, setQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<SaleProduct | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyUuid, setBusyUuid] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<SaleProduct | null>(null)
  const lock = useRef(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!drawerOpen) return

    setSubmitted(false)
    setForm(
      editing
        ? {
            name: editing.name,
            price: String(editing.price),
            chargeUnit: editing.chargeUnit,
            note: editing.note ?? ''
          }
        : emptyForm
    )
  }, [drawerOpen, editing])

  const text = query.trim().toLowerCase()

  const rows = [...products]
    .filter(product => !text || product.name.toLowerCase().includes(text) || (product.note ?? '').toLowerCase().includes(text))
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, 'es'))

  const priceNumber = Number(form.price)
  const priceInvalid = form.price.trim() !== '' && (!Number.isFinite(priceNumber) || priceNumber < 0)

  const nameError = !submitted
    ? ''
    : !form.name.trim()
      ? 'El nombre es obligatorio.'
      : form.name.trim().length > 100
        ? 'Máximo 100 caracteres.'
        : ''

  const priceError = !submitted
    ? ''
    : form.price.trim() === ''
      ? 'El precio es obligatorio.'
      : priceInvalid
        ? 'El precio no puede ser negativo.'
        : ''

  const openNew = () => {
    setEditing(null)
    setDrawerOpen(true)
  }

  const openEdit = (product: SaleProduct) => {
    setEditing(product)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    if (saving) return
    setDrawerOpen(false)
    setEditing(null)
  }

  const save = async (formElement?: HTMLFormElement) => {
    setSubmitted(true)

    if (lock.current) {
      return
    }

    if (!form.name.trim() || form.name.trim().length > 100 || form.price.trim() === '' || priceInvalid) {
      scrollToFirstInvalid(formElement)

      return
    }

    lock.current = true
    setSaving(true)

    const body = {
      name: form.name.trim(),
      price: priceNumber,
      note: form.note.trim() || null,
      chargeUnit: form.chargeUnit
    }

    try {
      const saved = editing
        ? await salesApi.updateProduct(propertyId, editing.uuid, body)
        : await salesApi.createProduct(propertyId, body)

      toast.success(
        saved.restored
          ? 'Este producto estaba eliminado. Se recuperó con los datos que acaba de guardar.'
          : editing
            ? 'Producto actualizado.'
            : 'Producto guardado.'
      )
      setDrawerOpen(false)
      setEditing(null)
      await onChanged()
    } catch (error) {
      toast.error(getSalesApiErrorMessage(error, 'No se pudo guardar el producto.'))
    } finally {
      lock.current = false
      setSaving(false)
    }
  }

  const toggleActive = async (product: SaleProduct) => {
    setBusyUuid(product.uuid)

    try {
      await salesApi.updateProduct(propertyId, product.uuid, { isActive: !product.isActive })
      toast.success(product.isActive ? `${product.name} ya no aparece para vender.` : `${product.name} vuelve a aparecer para vender.`)
      await onChanged()
    } catch (error) {
      toast.error(getSalesApiErrorMessage(error))
    } finally {
      setBusyUuid(null)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setBusyUuid(toDelete.uuid)

    try {
      await salesApi.removeProduct(propertyId, toDelete.uuid)
      toast.success(`${toDelete.name} eliminado.`)
      setToDelete(null)
      await onChanged()
    } catch (error) {
      toast.error(getSalesApiErrorMessage(error, 'No se pudo eliminar el producto.'))
    } finally {
      setBusyUuid(null)
    }
  }

  return (
    <Card>
      <div className='flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between'>
        <TextField
          size='small'
          placeholder='Buscar producto'
          value={query}
          onChange={event => setQuery(event.target.value)}
          className='max-sm:is-full sm:is-[280px]'
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='ri-search-line' />
                </InputAdornment>
              )
            }
          }}
        />
        {canEdit ? (
          <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={openNew} className='max-sm:is-full'>
            Nuevo producto
          </Button>
        ) : null}
      </div>

      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Precio</th>
              <th>Se cobra por</th>
              <th>Nota</th>
              <th>Estado</th>
              {canEdit ? <th>Acciones</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className='text-center'>
                  {products.length === 0 ? 'Todavía no hay productos.' : 'No se encontró ningún producto.'}
                </td>
              </tr>
            ) : (
              rows.map(product => (
                <tr key={product.uuid}>
                  <td>
                    <Typography color='text.primary' className='font-medium'>
                      {product.name}
                    </Typography>
                  </td>
                  <td>{formatRoomPrice(product.price)}</td>
                  <td>{CHARGE_UNIT_LABEL[product.chargeUnit] ?? product.chargeUnit}</td>
                  <td className='max-is-[260px]'>
                    <Typography variant='body2' color='text.secondary' className='whitespace-normal'>
                      {product.note || '—'}
                    </Typography>
                  </td>
                  <td>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={product.isActive ? 'success' : 'secondary'}
                      label={product.isActive ? 'Activo' : 'Inactivo'}
                    />
                  </td>
                  {canEdit ? (
                    <td>
                      <div className='flex items-center'>
                        <Tooltip title='Editar'>
                          <IconButton size='small' onClick={() => openEdit(product)} disabled={busyUuid === product.uuid}>
                            <i className='ri-edit-box-line text-textSecondary' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={product.isActive ? 'Desactivar' : 'Activar'}>
                          <IconButton
                            size='small'
                            onClick={() => void toggleActive(product)}
                            disabled={busyUuid === product.uuid}
                          >
                            <i
                              className={
                                product.isActive ? 'ri-eye-off-line text-textSecondary' : 'ri-eye-line text-textSecondary'
                              }
                            />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Eliminar'>
                          <IconButton
                            size='small'
                            onClick={() => setToDelete(product)}
                            disabled={busyUuid === product.uuid}
                          >
                            <i className='ri-delete-bin-7-line text-textSecondary' />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Drawer
        open={drawerOpen}
        anchor='right'
        variant='temporary'
        onClose={closeDrawer}
        disableAutoFocus
        SlideProps={{ onEntered: () => nameInputRef.current?.focus() }}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', md: 440 },
            maxWidth: '100vw',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }
        }}
      >
        <div className='flex shrink-0 items-center justify-between pli-5 plb-4'>
          <Typography variant='h5'>{editing ? 'Editar producto' : 'Nuevo producto'}</Typography>
          <IconButton size='small' onClick={closeDrawer}>
            <i className='ri-close-line text-2xl' />
          </IconButton>
        </div>
        <Divider />
        <form
          className='flex min-bs-0 min-is-0 flex-1 flex-col overflow-hidden'
          onSubmit={event => {
            event.preventDefault()
            void save(event.currentTarget)
          }}
        >
          <div className='flex min-bs-0 min-is-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto p-5'>
          <TextField
            fullWidth
            inputRef={nameInputRef}
            label='Nombre'
            placeholder='Gaseosa'
            value={form.name}
            disabled={saving}
            error={Boolean(nameError)}
            helperText={nameError || undefined}
            onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
          />
          <TextField
            fullWidth
            label='Precio'
            type='number'
            value={form.price}
            disabled={saving}
            error={Boolean(priceError)}
            helperText={priceError || undefined}
            slotProps={{
              htmlInput: { min: 0, step: '0.01' },
              input: { startAdornment: <InputAdornment position='start'>S/</InputAdornment> }
            }}
            onChange={event => setForm(current => ({ ...current, price: event.target.value }))}
          />
          <TextField
            select
            fullWidth
            label='Se cobra por'
            value={form.chargeUnit}
            disabled={saving}
            onChange={event => setForm(current => ({ ...current, chargeUnit: event.target.value as ProductChargeUnit }))}
          >
            {CHARGE_UNITS.map(unit => (
              <MenuItem key={unit} value={unit}>
                {CHARGE_UNIT_LABEL[unit]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label='Nota (opcional)'
            placeholder='Por ejemplo: se cobra al devolver'
            value={form.note}
            disabled={saving}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            onChange={event => setForm(current => ({ ...current, note: event.target.value }))}
          />
          </div>
          <Divider />
          <div className='flex shrink-0 flex-col gap-3 p-5 sm:flex-row sm:justify-end'>
            <Button
              variant='outlined'
              color='secondary'
              type='button'
              onClick={closeDrawer}
              disabled={saving}
              className='max-sm:is-full'
            >
              Volver
            </Button>
            <Button variant='contained' type='submit' disabled={saving} className='max-sm:is-full'>
              {saving ? <CircularProgress size={20} color='inherit' /> : 'Guardar'}
            </Button>
          </div>
        </form>
      </Drawer>

      <Dialog open={Boolean(toDelete)} onClose={() => !busyUuid && setToDelete(null)} fullWidth maxWidth='xs'>
        <DialogTitle>¿Eliminar {toDelete?.name}?</DialogTitle>
        <DialogContent>
          <Typography>
            Deja de aparecer en la lista. Las ventas que ya se hicieron con este producto no cambian.
          </Typography>
          <Typography variant='body2' color='text.secondary' className='mbs-2'>
            Si solo quiere dejar de venderlo por un tiempo, use Desactivar.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' color='secondary' onClick={() => setToDelete(null)} disabled={Boolean(busyUuid)}>
            Volver
          </Button>
          <Button variant='contained' color='error' onClick={() => void confirmDelete()} disabled={Boolean(busyUuid)}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default ProductsPanel
