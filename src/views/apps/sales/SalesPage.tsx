'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
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
import tableStyles from '@core/styles/table.module.css'
import DateField from '@/components/date-picker/DateField'
import DeleteReasonDialog from '@/components/dialogs/DeleteReasonDialog'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import {
  salesApi,
  getSalesApiErrorMessage,
  type Consumption,
  type InHouseRoom,
  priceSuffix,
  quantityText,
  type SaleProduct
} from '@/libs/salesApi'
import ProductsPanel from './ProductsPanel'
import { SALES_CREATE, SALES_PRODUCTS, SALES_VOID } from '@/types/apps/hotelPermissions'
import { addDays, limaToday, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from '@/types/apps/frontDeskTypes'
import { formatRateDate } from '@/types/apps/rateTypes'
import { formatRoomPrice } from '@/types/apps/roomsTypes'

const money = (value: number) => formatRoomPrice(value)

const saleTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false })

const qtyButtonSx = { width: 44, height: 44 } as const

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
  const [salesDay, setSalesDay] = useState(limaToday)
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
  const [voidUuid, setVoidUuid] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [nextProducts, nextRooms] = await Promise.all([
        salesApi.products(propertyId),
        salesApi.inHouse(propertyId)
      ])

      setProducts(nextProducts)
      setRooms(nextRooms)
    } catch (error) {
      toast.error(getSalesApiErrorMessage(error, 'No se pudieron cargar las ventas.'))
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  const loadSales = useCallback(async () => {
    try {
      setSales(await salesApi.consumptions(propertyId, salesDay))
    } catch (error) {
      toast.error(getSalesApiErrorMessage(error, 'No se pudieron cargar las ventas.'))
    }
  }, [propertyId, salesDay])

  useEffect(() => {
    if (status === 'loading') return
    void load()
  }, [load, status])

  useEffect(() => {
    if (status === 'loading') return
    void loadSales()
  }, [loadSales, status])

  const activeProducts = products.filter(product => product.isActive)

  const visibleProducts = activeProducts
    .filter(product => {
      const text = query.trim().toLowerCase()

      if (!text) return true

      return product.name.toLowerCase().includes(text) || (product.note ?? '').toLowerCase().includes(text)
    })
    .sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''))

  const chosen = useMemo(
    () =>
      products
        .filter(product => product.isActive && (quantities[product.uuid] ?? 0) > 0)
        .map(product => ({ product, quantity: quantities[product.uuid] })),
    [products, quantities]
  )

  const total = chosen.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

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
      await loadSales()
    } catch (error) {
      toast.error(getSalesApiErrorMessage(error, 'No se pudo registrar la venta.'))
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
                <div className='grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]'>
                  <div className='flex min-is-0 flex-col gap-3'>
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
                      <div className='grid max-h-[min(28rem,60vh)] grid-cols-1 gap-2 overflow-y-auto p-1 lg:max-h-[460px]'>
                      {visibleProducts.map(product => {
                        const quantity = quantities[product.uuid] ?? 0
                        const suffix = priceSuffix(product.chargeUnit)

                        return (
                          <div key={product.uuid} className='flex items-center justify-between gap-3 rounded border p-3'>
                            <div className='min-is-0'>
                              <Typography className='font-medium break-words'>{product.name}</Typography>
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
                              <IconButton
                                aria-label={`Quitar ${product.name}`}
                                disabled={quantity === 0}
                                onClick={() => setQuantities(current => ({ ...current, [product.uuid]: Math.max(quantity - 1, 0) }))}
                                sx={qtyButtonSx}
                              >
                                <i className='ri-subtract-line text-xl' />
                              </IconButton>
                              <Typography className='min-is-[64px] text-center font-medium'>
                                {quantity > 0 ? quantityText(quantity, product.chargeUnit) : '0'}
                              </Typography>
                              <IconButton
                                color='primary'
                                aria-label={`Agregar ${product.name}`}
                                onClick={() => setQuantities(current => ({ ...current, [product.uuid]: quantity + 1 }))}
                                sx={qtyButtonSx}
                              >
                                <i className='ri-add-line text-xl' />
                              </IconButton>
                            </div>
                          </div>
                        )
                      })}
                      </div>
                    )}
                  </div>
                  <Box className='lg:sticky lg:top-6'>
                    <Card>
                      <CardContent>{ticket}</CardContent>
                    </Card>
                  </Box>
                </div>
              )}
              <Card>
                <div className='flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between'>
                  <Typography className='font-medium'>
                    {salesDay === limaToday() ? 'Ventas de hoy' : `Ventas del ${formatRateDate(salesDay)}`}
                  </Typography>
                  <div className='flex items-center gap-1'>
                    <IconButton aria-label='Día anterior' onClick={() => setSalesDay(day => addDays(day, -1))}>
                      <i className='ri-arrow-left-s-line' />
                    </IconButton>
                    <DateField label='Día' value={salesDay} onChange={setSalesDay} maxDate={limaToday()} size='small' />
                    <IconButton
                      aria-label='Día siguiente'
                      disabled={salesDay >= limaToday()}
                      onClick={() => setSalesDay(day => addDays(day, 1))}
                    >
                      <i className='ri-arrow-right-s-line' />
                    </IconButton>
                  </div>
                </div>
                <div className='overflow-x-auto'>
                  <table className={tableStyles.table}>
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Qué se vendió</th>
                        <th>Para</th>
                        <th>Total</th>
                        {canVoid ? <th /> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {sales.length === 0 ? (
                        <tr>
                          <td colSpan={canVoid ? 5 : 4} className='text-center'>
                            {salesDay === limaToday() ? 'Hoy no hay ventas.' : `El ${formatRateDate(salesDay)} no hay ventas.`}
                          </td>
                        </tr>
                      ) : (
                        sales.map(sale => (
                          <tr key={sale.uuid}>
                            <td>{saleTime(sale.createdAt)}</td>
                            <td className='whitespace-normal'>
                              {sale.items.map(item => `${quantityText(item.quantity, item.chargeUnit)} ${item.description}`).join(', ')}
                              {sale.voidedAt ? ' · Anulada' : ''}
                            </td>
                            <td>
                              {sale.roomNumber
                                ? `Habitación ${sale.roomNumber}`
                                : sale.customerName || sale.guestName || 'Mostrador'}
                            </td>
                            <td>{money(sale.total)}</td>
                            {canVoid ? (
                              <td>
                                {!sale.voidedAt ? (
                                  <Button size='small' color='error' onClick={() => setVoidUuid(sale.uuid)}>
                                    Anular
                                  </Button>
                                ) : null}
                              </td>
                            ) : null}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </TabPanel>
        <TabPanel value='products' className='p-0'>
          <ProductsPanel propertyId={propertyId} products={products} canEdit={canProducts} onChanged={load} />
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

              return loadSales()
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
