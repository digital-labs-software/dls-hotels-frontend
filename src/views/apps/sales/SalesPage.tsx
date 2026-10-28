'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import CustomTabList from '@core/components/mui/TabList'
import DeleteReasonDialog from '@/components/dialogs/DeleteReasonDialog'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import {
  salesApi,
  getSalesApiErrorMessage,
  type Consumption,
  type InHouseRoom,
  type ProductChargeUnit,
  type SaleProduct
} from '@/libs/salesApi'
import { SALES_CREATE, SALES_PRODUCTS, SALES_VOID } from '@/types/apps/hotelPermissions'
import { limaToday, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from '@/types/apps/frontDeskTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'

const money = (value: number) => formatRoomPrice(value)

const CHARGE_UNITS: ProductChargeUnit[] = ['UNIT', 'HOUR', 'NIGHT', 'CUP']

const CHARGE_UNIT_LABEL: Record<ProductChargeUnit, string> = {
  UNIT: 'Unidad',
  HOUR: 'Hora',
  NIGHT: 'Noche',
  CUP: 'Taza'
}

const priceSuffix = (unit: ProductChargeUnit) => {
  if (unit === 'HOUR') return 'por hora'
  if (unit === 'NIGHT') return 'por noche'
  if (unit === 'CUP') return 'por taza'

  return ''
}

const quantityText = (quantity: number, unit: ProductChargeUnit) => {
  const amount = Number.isInteger(quantity) ? String(quantity) : String(quantity)

  if (unit === 'HOUR') return quantity === 1 ? '1 hora' : `${amount} horas`
  if (unit === 'NIGHT') return quantity === 1 ? '1 noche' : `${amount} noches`
  if (unit === 'CUP') return quantity === 1 ? '1 taza' : `${amount} tazas`

  return amount
}

const SalesPage = () => {
  const { data: session, status } = useSession()
  const { can } = useSubscriptionAccess()
  const canSell = can(SALES_CREATE)
  const canProducts = can(SALES_PRODUCTS)
  const canVoid = can(SALES_VOID)
  const propertyId = session?.user?.propertyId ?? 1

  const [tab, setTab] = useState('sell')
  const [products, setProducts] = useState<SaleProduct[]>([])
  const [rooms, setRooms] = useState<InHouseRoom[]>([])
  const [sales, setSales] = useState<Consumption[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [billing, setBilling] = useState<'ROOM' | 'NOW'>('ROOM')
  const [roomUuid, setRoomUuid] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [customerName, setCustomerName] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const lock = useRef(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [chargeUnit, setChargeUnit] = useState<ProductChargeUnit>('UNIT')
  const [note, setNote] = useState('')
  const [voidUuid, setVoidUuid] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [nextProducts, nextRooms, nextSales] = await Promise.all([
        salesApi.products(propertyId),
        salesApi.inHouse(propertyId),
        salesApi.consumptions(propertyId, limaToday())
      ])

      setProducts(nextProducts)
      setRooms(nextRooms)
      setSales(nextSales)
    } catch (error) {
      toast.error(getSalesApiErrorMessage(error, 'No se pudieron cargar las ventas.'))
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    if (status === 'loading') return
    void load()
  }, [load, status])

  const activeProducts = products.filter(product => product.isActive)
  const visibleProducts = activeProducts
    .filter(product => {
      const text = query.trim().toLowerCase()

      if (!text) return true

      return product.name.toLowerCase().includes(text) || (product.note ?? '').toLowerCase().includes(text)
    })
    .sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''))
  const priceNumber = Number(price)
  const priceInvalid = price.trim() !== '' && (!Number.isFinite(priceNumber) || priceNumber < 0)
  const chosen = useMemo(
    () =>
      products
        .filter(product => product.isActive && (quantities[product.uuid] ?? 0) > 0)
        .map(product => ({ product, quantity: quantities[product.uuid] })),
    [products, quantities]
  )
  const total = chosen.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const clearProductForm = () => {
    setEditing(null)
    setName('')
    setPrice('')
    setChargeUnit('UNIT')
    setNote('')
  }

  const sell = async () => {
    if (lock.current || chosen.length === 0) return
    lock.current = true
    setSaving(true)

    try {
      const saved = await salesApi.createConsumption(propertyId, {
        billing,
        reservationRoomUuid: billing === 'ROOM' ? roomUuid : undefined,
        guestUuid: billing === 'ROOM' ? rooms.find(room => room.reservationRoomUuid === roomUuid)?.guestUuid ?? undefined : undefined,
        customerName: billing === 'NOW' ? customerName.trim() || null : null,
        documentType: billing === 'NOW' && documentNumber.trim() ? 'DNI' : null,
        documentNumber: billing === 'NOW' ? documentNumber.trim() || null : null,
        method: billing === 'NOW' ? method : undefined,
        items: chosen.map(item => ({ productUuid: item.product.uuid, quantity: item.quantity }))
      })

      toast.success(saved.billing === 'ROOM' ? 'Se cargó a la habitación.' : 'Venta cobrada.')
      setQuantities({})
      setCustomerName('')
      setDocumentNumber('')
      await load()
    } catch (error) {
      toast.error(getSalesApiErrorMessage(error, 'No se pudo registrar la venta.'))
    } finally {
      lock.current = false
      setSaving(false)
    }
  }

  const saveProduct = async () => {
    const nextName = name.trim()
    const nextPrice = Number(price)

    if (!nextName || !Number.isFinite(nextPrice) || nextPrice < 0 || lock.current) return
    lock.current = true
    setSaving(true)

    const body = { name: nextName, price: nextPrice, note: note.trim() || null, chargeUnit }

    try {
      const saved = editing
        ? await salesApi.updateProduct(propertyId, editing, body)
        : await salesApi.createProduct(propertyId, body)

      toast.success(
        saved.restored
          ? 'Este producto estaba eliminado. Se recuperó con los datos que acaba de guardar.'
          : editing
            ? 'Producto actualizado.'
            : 'Producto guardado.'
      )
      clearProductForm()
      await load()
    } catch (error) {
      toast.error(getSalesApiErrorMessage(error, 'No se pudo guardar el producto.'))
    } finally {
      lock.current = false
      setSaving(false)
    }
  }

  const ticket = (
    <div className='flex flex-col gap-4'>
      <Typography className='font-medium'>Esta venta</Typography>
      {chosen.length === 0 ? (
        <Typography color='text.secondary'>Elija los productos.</Typography>
      ) : (
        chosen.map(item => (
          <div key={item.product.uuid} className='flex items-start justify-between gap-3'>
            <div>
              <Typography>{item.product.name}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {quantityText(item.quantity, item.product.chargeUnit)} × {money(item.product.price)}
              </Typography>
            </div>
            <Typography>{money(item.product.price * item.quantity)}</Typography>
          </div>
        ))
      )}
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={billing}
        onChange={(_, next) => {
          if (next) setBilling(next)
        }}
      >
        <ToggleButton value='ROOM'>A la habitación</ToggleButton>
        <ToggleButton value='NOW'>Cobrar ahora</ToggleButton>
      </ToggleButtonGroup>
      {billing === 'ROOM' ? (
        <TextField select label='Habitación' value={roomUuid} onChange={event => setRoomUuid(event.target.value)}>
          <MenuItem value=''>Elija la habitación</MenuItem>
          {rooms.map(room => (
            <MenuItem key={room.reservationRoomUuid} value={room.reservationRoomUuid}>
              {room.roomNumber}
              {room.guestName ? ` · ${room.guestName}` : ''}
            </MenuItem>
          ))}
        </TextField>
      ) : (
        <div className='flex flex-col gap-3'>
          <TextField select label='Cómo paga' value={method} onChange={event => setMethod(event.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map(item => (
              <MenuItem key={item} value={item}>
                {PAYMENT_METHOD_LABELS[item]}
              </MenuItem>
            ))}
          </TextField>
          <TextField label='Nombre (opcional)' value={customerName} onChange={event => setCustomerName(event.target.value)} />
          <TextField label='DNI, si pide boleta' value={documentNumber} onChange={event => setDocumentNumber(event.target.value)} />
        </div>
      )}
      <div className='flex items-center justify-between gap-3'>
        <Typography className='font-medium'>Total {money(total)}</Typography>
        <Button variant='contained' disabled={!canSell || saving || chosen.length === 0 || (billing === 'ROOM' && !roomUuid)} onClick={() => void sell()}>
          {saving ? <CircularProgress size={20} color='inherit' /> : 'Registrar venta'}
        </Button>
      </div>
    </div>
  )

  return (
    <div className='flex flex-col gap-4'>
      <TabContext value={tab}>
        <CustomTabList pill='true' onChange={(_event, value) => setTab(value)}>
          <Tab value='sell' label='Ventas' />
          <Tab value='products' label='Productos' />
        </CustomTabList>
        <TabPanel value='sell' className='p-0'>
          {loading ? (
            <div className='flex justify-center p-10'>
              <CircularProgress />
            </div>
          ) : (
            <div className='flex flex-col gap-4'>
              {activeProducts.length === 0 ? (
                <Alert severity='info'>Todavía no hay productos. Agréguelos en Productos.</Alert>
              ) : (
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start'>
                  <div className='flex min-is-0 flex-1 flex-col gap-3'>
                    <TextField
                      fullWidth
                      label='Buscar producto'
                      placeholder='Gaseosa, disfraz, calefacción'
                      value={query}
                      onChange={event => setQuery(event.target.value)}
                    />
                    {visibleProducts.length === 0 ? (
                      <Typography color='text.secondary'>No hay productos con ese nombre.</Typography>
                    ) : (
                      <div className='flex max-h-[min(22rem,50vh)] flex-col gap-2 overflow-y-auto p-1 lg:max-h-[400px]'>
                      {visibleProducts.map(product => {
                        const quantity = quantities[product.uuid] ?? 0
                        const suffix = priceSuffix(product.chargeUnit)

                        return (
                          <div key={product.uuid} className='flex items-center justify-between gap-3 rounded border p-3'>
                            <div className='min-is-0'>
                              <Typography className='font-medium'>{product.name}</Typography>
                              <Typography variant='body2' color='text.secondary'>
                                {money(product.price)}
                                {suffix ? ` ${suffix}` : ''}
                              </Typography>
                              {product.note ? (
                                <Typography variant='body2' color='text.secondary'>
                                  {product.note}
                                </Typography>
                              ) : null}
                            </div>
                            <div className='flex shrink-0 items-center gap-1'>
                              <Button
                                size='small'
                                disabled={quantity === 0}
                                onClick={() => setQuantities(current => ({ ...current, [product.uuid]: quantity - 1 }))}
                              >
                                −
                              </Button>
                              <Typography className='min-is-[72px] text-center'>
                                {quantity > 0 ? quantityText(quantity, product.chargeUnit) : '0'}
                              </Typography>
                              <Button
                                size='small'
                                onClick={() => setQuantities(current => ({ ...current, [product.uuid]: quantity + 1 }))}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                      </div>
                    )}
                  </div>
                  <Box className='lg:sticky lg:top-6 lg:is-[360px] lg:shrink-0'>
                    <Card>
                      <CardContent>{ticket}</CardContent>
                    </Card>
                  </Box>
                </div>
              )}
              <Card>
                <CardContent className='flex flex-col gap-3'>
                  <Typography className='font-medium'>Ventas de hoy</Typography>
                  {sales.length === 0 ? <Typography color='text.secondary'>Hoy no hay ventas.</Typography> : null}
                  {sales.map(sale => (
                    <div key={sale.uuid} className='flex flex-wrap items-start justify-between gap-2 border-be pb-3'>
                      <div>
                        <Typography className='font-medium'>
                          {sale.roomNumber ? `Habitación ${sale.roomNumber}` : sale.customerName || sale.guestName || 'Mostrador'}
                          {sale.voidedAt ? ' · Anulada' : ''}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {sale.items.map(item => `${quantityText(item.quantity, item.chargeUnit)} · ${item.description}`).join(' · ')} · {money(sale.total)}
                        </Typography>
                      </div>
                      {canVoid && !sale.voidedAt ? (
                        <Button size='small' color='error' onClick={() => setVoidUuid(sale.uuid)}>
                          Anular
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabPanel>
        <TabPanel value='products' className='p-0'>
          <Card>
            <CardContent className='flex flex-col gap-4'>
              {canProducts ? (
                <div className='flex max-is-[640px] flex-col gap-3'>
                  <TextField fullWidth label='Nombre' value={name} onChange={event => setName(event.target.value)} />
                  <div className='flex flex-col gap-3 sm:flex-row'>
                    <TextField
                      className='sm:is-[160px]'
                      label='Precio'
                      type='number'
                      value={price}
                      error={priceInvalid}
                      helperText={priceInvalid ? 'El precio no puede ser negativo.' : undefined}
                      slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                      onChange={event => setPrice(event.target.value)}
                    />
                    <TextField
                      select
                      fullWidth
                      label='Se cobra por'
                      value={chargeUnit}
                      onChange={event => setChargeUnit(event.target.value as ProductChargeUnit)}
                    >
                      {CHARGE_UNITS.map(unit => (
                        <MenuItem key={unit} value={unit}>
                          {CHARGE_UNIT_LABEL[unit]}
                        </MenuItem>
                      ))}
                    </TextField>
                  </div>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label='Nota (opcional)'
                    placeholder='Por ejemplo: S/ 100 por hora, se cobra al devolver'
                    value={note}
                    onChange={event => setNote(event.target.value)}
                  />
                  <div className='flex gap-2'>
                    <Button variant='contained' disabled={saving || !name.trim() || price === '' || priceInvalid} onClick={() => void saveProduct()}>
                      {saving ? <CircularProgress size={20} color='inherit' /> : editing ? 'Guardar cambios' : 'Guardar'}
                    </Button>
                    {editing ? (
                      <Button variant='outlined' disabled={saving} onClick={clearProductForm}>
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {products.map(product => (
                <div key={product.uuid} className='flex flex-wrap items-start justify-between gap-2'>
                  <div>
                    <Typography>
                      {product.name} · {money(product.price)}
                      {priceSuffix(product.chargeUnit) ? ` ${priceSuffix(product.chargeUnit)}` : ''}
                      {product.isActive ? '' : ' · Inactivo'}
                    </Typography>
                    {product.note ? (
                      <Typography variant='body2' color='text.secondary'>
                        {product.note}
                      </Typography>
                    ) : null}
                  </div>
                  {canProducts ? (
                    <div className='flex gap-2'>
                      <Button
                        size='small'
                        onClick={() => {
                          setEditing(product.uuid)
                          setName(product.name)
                          setPrice(String(product.price))
                          setChargeUnit(product.chargeUnit)
                          setNote(product.note ?? '')
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size='small'
                        onClick={() =>
                          void salesApi
                            .updateProduct(propertyId, product.uuid, { isActive: !product.isActive })
                            .then(() => load())
                            .catch(error => toast.error(getSalesApiErrorMessage(error)))
                        }
                      >
                        {product.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        size='small'
                        color='error'
                        onClick={() =>
                          void salesApi
                            .removeProduct(propertyId, product.uuid)
                            .then(() => load())
                            .catch(error => toast.error(getSalesApiErrorMessage(error)))
                        }
                      >
                        Eliminar
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabPanel>
      </TabContext>
      <DeleteReasonDialog
        open={Boolean(voidUuid)}
        title='Anular venta'
        description='La venta sale de la habitación o de la caja. Escriba por qué.'
        confirmLabel='Anular'
        confirming={saving}
        onClose={() => !saving && setVoidUuid(null)}
        onConfirm={reason => {
          if (!voidUuid || lock.current) return
          lock.current = true
          setSaving(true)
          void salesApi
            .voidConsumption(propertyId, voidUuid, reason)
            .then(() => {
              toast.success('Venta anulada.')
              setVoidUuid(null)
              return load()
            })
            .catch(error => toast.error(getSalesApiErrorMessage(error, 'No se pudo anular la venta.')))
            .finally(() => {
              lock.current = false
              setSaving(false)
            })
        }}
      />
    </div>
  )
}

export default SalesPage
