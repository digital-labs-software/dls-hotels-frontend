'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { Locale } from '@configs/i18n'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { einvoiceApi, getEinvoiceApiErrorMessage } from '@/libs/einvoiceApi'
import { getLocalizedUrl } from '@/utils/i18n'
import type { EinvoiceSettings, InvoiceSeries } from '@/types/apps/einvoiceTypes'
import { SERIES_PURPOSE_OPTIONS, seriesPurposeLabel } from './einvoiceLabels'

const InvoicingSettingsPage = () => {
  const router = useRouter()
  const { lang: locale } = useParams()
  const { data: session, status } = useSession()
  const { canSettingsInvoices, loaded } = useSubscriptionAccess()
  const propertyId = session?.user?.propertyId ?? 1

  const [settings, setSettings] = useState<EinvoiceSettings | null>(null)
  const [series, setSeries] = useState<InvoiceSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [igvRate, setIgvRate] = useState('18')
  const [pricesIncludeIgv, setPricesIncludeIgv] = useState(true)
  const [sendToCustomer, setSendToCustomer] = useState(false)
  const [apiUrl, setApiUrl] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [seriesOpen, setSeriesOpen] = useState(false)
  const [newKind, setNewKind] = useState<(typeof SERIES_PURPOSE_OPTIONS)[number]['id']>('RECEIPT')
  const [newSeries, setNewSeries] = useState('')

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [nextSettings, nextSeries] = await Promise.all([
        einvoiceApi.settings(propertyId),
        einvoiceApi.series(propertyId)
      ])

      setSettings(nextSettings)
      setSeries(nextSeries)
      setEnabled(nextSettings.enabled)
      setIgvRate(String(nextSettings.igvRate))
      setPricesIncludeIgv(nextSettings.pricesIncludeIgv)
      setSendToCustomer(nextSettings.sendToCustomer)
      setApiUrl(nextSettings.apiUrl || '')
    } catch (error) {
      toast.error(getEinvoiceApiErrorMessage(error, 'No se pudo cargar la configuración.'))
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    if (status === 'loading' || !loaded) {
      return
    }

    if (!canSettingsInvoices) {
      router.replace(getLocalizedUrl('/apps/invoicing', locale as Locale))

      return
    }

    load()
  }, [canSettingsInvoices, load, loaded, locale, router, status])

  const saveSettings = async () => {
    setSaving(true)

    try {
      const next = await einvoiceApi.updateSettings(propertyId, {
        enabled,
        igvRate: Number(igvRate),
        pricesIncludeIgv,
        sendToCustomer,
        apiUrl: apiUrl.trim() || null,
        apiToken: apiToken.trim() || undefined
      })

      setSettings(next)
      setApiToken('')
      toast.success('Configuración guardada.')
    } catch (error) {
      toast.error(getEinvoiceApiErrorMessage(error, 'No se pudo guardar la configuración.'))
    } finally {
      setSaving(false)
    }
  }

  if (!loaded || !canSettingsInvoices) {
    return null
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <Typography variant='h4' className='mbe-1'>
            Series y SUNAT
          </Typography>
          <Typography color='text.secondary'>IGV, series y NubeFact del hotel</Typography>
        </div>
        <Button variant='outlined' color='secondary' component={Link} href={getLocalizedUrl('/apps/hotel', locale as Locale)}>
          Volver al hotel
        </Button>
      </div>

      {loading || !settings ? (
        <div className='flex justify-center p-10'>
          <CircularProgress size={32} />
        </div>
      ) : (
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card className='mbe-6'>
              <CardHeader title='Ajustes' />
              <CardContent className='flex flex-col gap-4'>
                <FormControlLabel
                  control={<Switch checked={enabled} onChange={event => setEnabled(event.target.checked)} />}
                  label='Facturación electrónica activa'
                />
                <TextField label='IGV (%)' type='number' value={igvRate} onChange={event => setIgvRate(event.target.value)} />
                <FormControlLabel
                  control={<Switch checked={pricesIncludeIgv} onChange={event => setPricesIncludeIgv(event.target.checked)} />}
                  label='Los precios incluyen IGV'
                />
                <FormControlLabel
                  control={<Switch checked={sendToCustomer} onChange={event => setSendToCustomer(event.target.checked)} />}
                  label='Enviar comprobante al cliente'
                />
                <TextField label='URL de NubeFact (opcional)' value={apiUrl} onChange={event => setApiUrl(event.target.value)} />
                <TextField
                  label={settings.hasToken ? 'Nuevo token de NubeFact' : 'Token de NubeFact'}
                  type='password'
                  value={apiToken}
                  onChange={event => setApiToken(event.target.value)}
                  helperText={
                    settings.hasToken
                      ? 'El token no se muestra. Déjalo vacío si no quieres cambiarlo.'
                      : 'Si no hay token del hotel, se usa la credencial global de DLS.'
                  }
                />
                <Button variant='contained' disabled={saving} onClick={() => void saveSettings()}>
                  {saving ? <CircularProgress size={20} color='inherit' /> : 'Guardar ajustes'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                title='Series'
                subheader='Cada serie indica si aplica a boleta, factura o a la nota que las corrige.'
                action={
                  <Button size='small' startIcon={<i className='ri-add-line' />} onClick={() => setSeriesOpen(true)}>
                    Nueva serie
                  </Button>
                }
              />
              <CardContent>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Serie</TableCell>
                        <TableCell>Aplica a</TableCell>
                        <TableCell>Siguiente</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align='right'>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {series.map(item => (
                        <TableRow key={item.uuid}>
                          <TableCell>{item.series}</TableCell>
                          <TableCell>{seriesPurposeLabel(item.series, item.documentType)}</TableCell>
                          <TableCell>{item.nextNumber}</TableCell>
                          <TableCell>
                            <div className='flex flex-wrap gap-1'>
                              {item.isDefault ? <Chip size='small' color='primary' label='Por defecto' /> : null}
                              <Chip size='small' variant='tonal' color={item.isActive ? 'success' : 'secondary'} label={item.isActive ? 'Activa' : 'Inactiva'} />
                            </div>
                          </TableCell>
                          <TableCell align='right'>
                            <div className='flex justify-end gap-1'>
                              {!item.isDefault ? (
                                <Button
                                  size='small'
                                  onClick={() =>
                                    void einvoiceApi
                                      .updateSeries(propertyId, item.uuid, { isDefault: true })
                                      .then(load)
                                      .catch(error => toast.error(getEinvoiceApiErrorMessage(error)))
                                  }
                                >
                                  Predeterminar
                                </Button>
                              ) : null}
                              <Button
                                size='small'
                                color='secondary'
                                onClick={() =>
                                  void einvoiceApi
                                    .updateSeries(propertyId, item.uuid, { isActive: !item.isActive })
                                    .then(load)
                                    .catch(error => toast.error(getEinvoiceApiErrorMessage(error)))
                                }
                              >
                                {item.isActive ? 'Desactivar' : 'Activar'}
                              </Button>
                              {!item.used ? (
                                <Button
                                  size='small'
                                  color='error'
                                  onClick={() =>
                                    void einvoiceApi
                                      .deleteSeries(propertyId, item.uuid)
                                      .then(() => {
                                        toast.success('Serie eliminada.')
                                        load()
                                      })
                                      .catch(error => toast.error(getEinvoiceApiErrorMessage(error)))
                                  }
                                >
                                  Eliminar
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Card className='mbe-6'>
              <CardHeader title='Estado del emisor' />
              <CardContent className='flex flex-col gap-3'>
                <Typography>Proveedor: {settings.provider || '—'}</Typography>
                <Typography>Cola: {settings.queueMode || '—'}</Typography>
                <Typography>RUC: {settings.issuer?.ruc || '—'}</Typography>
                <Typography>Razón social: {settings.issuer?.businessName || '—'}</Typography>
                {settings.warnings.length ? (
                  <Alert severity='warning'>
                    <Typography className='font-medium mbe-2'>Pendientes</Typography>
                    <ul className='mis-4'>
                      {settings.warnings.map(warning => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </Alert>
                ) : (
                  <Alert severity='success'>La facturación está lista.</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Dialog open={seriesOpen} onClose={() => setSeriesOpen(false)} fullWidth maxWidth='sm'>
        <DialogTitle>Nueva serie</DialogTitle>
        <DialogContent className='flex flex-col gap-4 pt-4'>
          <FormControl fullWidth>
            <InputLabel id='new-series-type'>A qué comprobante aplica</InputLabel>
            <Select
              labelId='new-series-type'
              label='A qué comprobante aplica'
              value={newKind}
              onChange={event => setNewKind(event.target.value as typeof newKind)}
            >
              {SERIES_PURPOSE_OPTIONS.map(option => (
                <MenuItem key={option.id} value={option.id}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label='Serie'
            placeholder={SERIES_PURPOSE_OPTIONS.find(option => option.id === newKind)?.hint.replace('Ejemplo: ', '')}
            helperText={SERIES_PURPOSE_OPTIONS.find(option => option.id === newKind)?.hint}
            value={newSeries}
            onChange={event => setNewSeries(event.target.value.toUpperCase())}
          />
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setSeriesOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            disabled={!newSeries.trim()}
            onClick={() =>
              void einvoiceApi
                .createSeries(propertyId, {
                  documentType: SERIES_PURPOSE_OPTIONS.find(option => option.id === newKind)?.documentType || 'RECEIPT',
                  series: newSeries.trim(),
                  isDefault: false
                })
                .then(() => {
                  toast.success('Serie creada.')
                  setSeriesOpen(false)
                  setNewSeries('')
                  setNewKind('RECEIPT')
                  load()
                })
                .catch(error => toast.error(getEinvoiceApiErrorMessage(error)))
            }
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default InvoicingSettingsPage
