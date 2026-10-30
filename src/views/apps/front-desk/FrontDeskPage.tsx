'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Tab from '@mui/material/Tab'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import { useSession } from 'next-auth/react'

import type { Locale } from '@configs/i18n'

import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import { RECEPTION_PAYMENTS_CREATE, RECEPTION_WALK_IN } from '@/types/apps/hotelPermissions'
import { toast } from 'react-toastify'

import CustomTabList from '@core/components/mui/TabList'
import type { FrontDesk, RackRoom, RackStatus, Stay } from '@/types/apps/frontDeskTypes'
import { formatFrontDeskHeading, normalizeSearchText, stayMatchesQuery } from '@/types/apps/frontDeskTypes'
import AssignRoomDialog from './AssignRoomDialog'
import CheckOutDialog from './CheckOutDialog'
import { EarlyDepartureDialog, UndoCheckInDialog } from './InHouseDepartureDialogs'
import PaymentDialog from './PaymentDialog'
import RoomCard from './RoomCard'
import StayDrawer from './StayDrawer'
import StayList from './StayList'
import SummaryBar from './SummaryBar'
import WalkInDialog from './WalkInDialog'
import { frontDeskApi, getFrontDeskApiErrorMessage } from '@/libs/frontDeskApi'
import { getLocalizedUrl } from '@/utils/i18n'
import { ROOM_PHOTO_DETAIL, cloudinaryTransformedUrl } from '@/libs/cloudinary'

type ViewMode = 'compact' | 'photos'
type PanelMode = 'rooms' | 'day'
type SideTab = 'arrivals' | 'departures' | 'inHouse'

const VIEW_KEY = 'frontDesk.view'

const FrontDeskPage = () => {
  const { lang: locale } = useParams()
  const { data: session, status } = useSession()
  const { can } = useSubscriptionAccess()
  const canWalkIn = can(RECEPTION_WALK_IN)
  const canRegisterPayment = can(RECEPTION_PAYMENTS_CREATE)
  const propertyId = session?.user?.propertyId ?? 1

  const [overview, setOverview] = useState<FrontDesk | null>(null)
  const [loading, setLoading] = useState(true)
  const [floorId, setFloorId] = useState<number | 'all'>('all')
  const [roomTypeId, setRoomTypeId] = useState<number | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<RackStatus | ''>('')
  const [arrivingToday, setArrivingToday] = useState(false)
  const [departingToday, setDepartingToday] = useState(false)
  const [withBalance, setWithBalance] = useState(false)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('compact')
  const [panel, setPanel] = useState<PanelMode>('rooms')
  const [sideTab, setSideTab] = useState<SideTab>('arrivals')
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuRoom, setMenuRoom] = useState<RackRoom | null>(null)
  const [walkInRoom, setWalkInRoom] = useState<RackRoom | null>(null)
  const [selectedStay, setSelectedStay] = useState<Stay | null>(null)
  const [stayOpen, setStayOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [checkOutOpen, setCheckOutOpen] = useState(false)
  const [earlyOpen, setEarlyOpen] = useState(false)
  const [undoOpen, setUndoOpen] = useState(false)
  const [refundPreset, setRefundPreset] = useState<{ amount: number; hint: string } | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [photoRoom, setPhotoRoom] = useState<RackRoom | null>(null)
  const [arrivalBusy, setArrivalBusy] = useState<{ id: string; action: 'checkIn' | 'noShow' } | null>(null)
  const arrivalLock = useRef(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_KEY)

    if (stored === 'compact' || stored === 'photos') {
      setView(stored)
    }
  }, [])

  const fetchOverview = useCallback(async () => {
    setLoading(true)

    try {
      setOverview(await frontDeskApi.overview(propertyId))
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo cargar la recepción.'))
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    fetchOverview()
    const timer = window.setInterval(fetchOverview, 60000)

    return () => window.clearInterval(timer)
  }, [fetchOverview, status])

  const roomTypes = useMemo(() => {
    const map = new Map<number, string>()

    overview?.floors.forEach(floor => {
      floor.rooms.forEach(room => map.set(room.roomTypeId, room.roomTypeName))
    })

    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [overview])

  const filteredFloors = useMemo(() => {
    if (!overview) {
      return []
    }

    const query = normalizeSearchText(search)

    return overview.floors
      .filter(floor => floorId === 'all' || floor.floorId === floorId)
      .map(floor => ({
        ...floor,
        rooms: floor.rooms.filter(room => {
          if (roomTypeId !== 'all' && room.roomTypeId !== roomTypeId) return false
          if (statusFilter && room.displayStatus !== statusFilter) return false
          if (arrivingToday && !room.arrival) return false
          if (departingToday && !room.departureDue) return false
          if (withBalance && !((room.currentStay?.reservationBalance ?? 0) > 0)) return false
          if (query) {
            const people = (stay: Stay | null) =>
              stay
                ? [stay.guestName, stay.bookerName, stay.companyName, stay.reservationCode, ...(stay.occupantNames ?? [])]
                : []
            const haystack = normalizeSearchText(
              [room.number, ...people(room.currentStay), ...people(room.arrival)].filter(Boolean).join(' ')
            )

            if (!haystack.includes(query)) return false
          }

          return true
        })
      }))
      .filter(floor => floor.rooms.length > 0)
  }, [arrivingToday, departingToday, floorId, overview, roomTypeId, search, statusFilter, withBalance])

  const closeMenu = () => {
    setMenuAnchor(null)
    setMenuRoom(null)
  }

  const handleSetStatus = async (statusValue: 'AVAILABLE' | 'CLEANING') => {
    if (!menuRoom) {
      return
    }

    try {
      await frontDeskApi.setRoomStatus(propertyId, menuRoom.uuid, statusValue)
      toast.success('Estado de habitación actualizado.')
      closeMenu()
      fetchOverview()
    } catch (error) {
      toast.error(getFrontDeskApiErrorMessage(error, 'No se pudo cambiar el estado.'))
    }
  }

  const openStay = (stay: Stay) => {
    setSelectedStay(stay)
    setStayOpen(true)
  }

  const runArrivalAction = async (stay: Stay, action: 'checkIn' | 'noShow') => {
    if (arrivalLock.current) {
      return
    }

    arrivalLock.current = true
    setArrivalBusy({ id: stay.reservationRoomUuid, action })

    try {
      if (action === 'checkIn') {
        await frontDeskApi.checkIn(propertyId, stay.reservationUuid, stay.reservationRoomUuid)
        toast.success(`Check-in (ingreso) · ${stay.reservationCode}`)
      } else {
        await frontDeskApi.patchRoomLine(propertyId, stay.reservationUuid, stay.reservationRoomUuid, {
          status: 'NO_SHOW'
        })
        toast.success('Marcado como no se presentó.')
      }

      await fetchOverview()
    } catch (error) {
      toast.error(
        getFrontDeskApiErrorMessage(
          error,
          action === 'checkIn' ? 'No se pudo registrar el ingreso (check-in).' : 'No se pudo marcar que no se presentó.'
        )
      )
    } finally {
      arrivalLock.current = false
      setArrivalBusy(null)
    }
  }

  const [listSearch, setListSearch] = useState('')
  const listQuery = normalizeSearchText(listSearch)
  const filterStays = useCallback(
    (rows: Stay[]) => rows.filter(stay => stayMatchesQuery(stay, listQuery)),
    [listQuery]
  )
  const sortedArrivals = useMemo(() => {
    const rows = filterStays(overview?.arrivals ?? [])

    return rows.sort(
      (a, b) =>
        Number(b.arrivalOverdue) - Number(a.arrivalOverdue) ||
        a.reservationCode.localeCompare(b.reservationCode, 'es') ||
        (a.roomNumber || '').localeCompare(b.roomNumber || '', 'es', { numeric: true })
    )
  }, [filterStays, overview])
  const sortedDepartures = useMemo(() => {
    const rows = filterStays(overview?.departures ?? [])

    return rows.sort(
      (a, b) =>
        Number(b.departureOverdue) - Number(a.departureOverdue) ||
        a.reservationCode.localeCompare(b.reservationCode, 'es') ||
        (a.roomNumber || '').localeCompare(b.roomNumber || '', 'es', { numeric: true })
    )
  }, [filterStays, overview])
  const stayingTonight = useMemo(() => {
    if (!overview) return []

    return overview.inHouse.filter(stay => stay.checkOutDate > overview.date)
  }, [overview])
  const sortedInHouse = useMemo(() => {
    const rows = filterStays(stayingTonight)

    return rows.sort(
      (a, b) =>
        a.reservationCode.localeCompare(b.reservationCode, 'es') ||
        (a.roomNumber || '').localeCompare(b.roomNumber || '', 'es', { numeric: true })
    )
  }, [filterStays, stayingTonight])

  return (
    <>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent className='flex flex-col gap-3' sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <Typography variant='subtitle1' className='font-medium capitalize'>
                  {overview ? formatFrontDeskHeading(overview.date) : ''}
                </Typography>
                <div className='flex flex-wrap items-center gap-2'>
                  {overview ? (
                    <SummaryBar summary={overview.summary} selectedStatus={statusFilter} onSelectStatus={setStatusFilter} />
                  ) : null}
                  <Tooltip title='Actualizar'>
                    <span>
                      <IconButton color='secondary' onClick={fetchOverview} disabled={loading} aria-label='Actualizar'>
                        <i className='ri-refresh-line' />
                      </IconButton>
                    </span>
                  </Tooltip>
                </div>
              </div>
              {panel === 'rooms' ? (
                <TabContext value={floorId === 'all' ? 'all' : String(floorId)}>
                  <CustomTabList
                    variant='scrollable'
                    pill='true'
                    onChange={(_event, value) => setFloorId(value === 'all' ? 'all' : Number(value))}
                  >
                    <Tab label='Todos' value='all' />
                    {(overview?.floors ?? []).map(floor => (
                      <Tab key={floor.floorId} label={floor.floorName} value={String(floor.floorId)} />
                    ))}
                  </CustomTabList>
                </TabContext>
              ) : null}
              <div className='flex flex-wrap items-center gap-2'>
                {panel === 'rooms' ? (
                  <>
                <FormControl size='small' className='min-is-[180px]'>
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    label='Tipo'
                    value={roomTypeId}
                    onChange={e => {
                      const raw = String(e.target.value)

                      setRoomTypeId(raw === 'all' ? 'all' : Number(raw))
                    }}
                  >
                    <MenuItem value='all'>Todos</MenuItem>
                    {roomTypes.map(type => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={<Checkbox checked={arrivingToday} onChange={e => setArrivingToday(e.target.checked)} />}
                  label='Llega hoy'
                />
                <FormControlLabel
                  control={<Checkbox checked={departingToday} onChange={e => setDepartingToday(e.target.checked)} />}
                  label='Sale hoy'
                />
                <FormControlLabel
                  control={<Checkbox checked={withBalance} onChange={e => setWithBalance(e.target.checked)} />}
                  label='Con saldo'
                />
                <TextField
                  size='small'
                  placeholder='Buscar número de habitación o huésped'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className='min-is-[220px] is-full sm:is-auto'
                />
                <ToggleButtonGroup
                  exclusive
                  size='small'
                  value={view}
                  onChange={(_, next) => {
                    if (!next) {
                      return
                    }

                    setView(next)
                    window.localStorage.setItem(VIEW_KEY, next)
                  }}
                >
                  <ToggleButton value='compact'>Compacta</ToggleButton>
                  <ToggleButton value='photos'>Con fotos</ToggleButton>
                </ToggleButtonGroup>
                  </>
                ) : null}
                <div className='flex flex-wrap items-center gap-2 mis-auto'>
                  <ToggleButtonGroup
                    exclusive
                    size='small'
                    value={panel}
                    onChange={(_, next: PanelMode | null) => {
                      if (next) setPanel(next)
                    }}
                  >
                    <ToggleButton value='rooms'>Habitaciones</ToggleButton>
                    <ToggleButton value='day'>Del día</ToggleButton>
                  </ToggleButtonGroup>
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>

        {panel === 'rooms' ? (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              {loading && !overview ? (
                <div className='flex justify-center p-10'>
                  <CircularProgress />
                </div>
              ) : !overview ? (
                <Typography color='text.secondary' className='text-center p-6'>
                  No se pudo cargar el rack. Pulsa Actualizar o vuelve a iniciar sesión.
                </Typography>
              ) : filteredFloors.length === 0 ? (
                <Typography color='text.secondary' className='text-center p-6'>
                  No hay habitaciones para estos filtros
                </Typography>
              ) : (
                <div className='flex flex-col gap-4'>
                  {filteredFloors.map(floor => (
                    <div key={floor.floorId} className='flex flex-col gap-2'>
                      <Typography variant='subtitle2'>{floor.floorName}</Typography>
                      <div className='flex flex-wrap gap-3'>
                        {floor.rooms.map(room => (
                          <RoomCard
                            key={room.uuid}
                            room={room}
                            view={view}
                            onOpenMenu={(event, selected) => {
                              setMenuAnchor(event.currentTarget)
                              setMenuRoom(selected)
                            }}
                            onOpenPhoto={setPhotoRoom}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Grid>
        ) : (
        <Grid size={{ xs: 12 }}>
          <Card>
            <TabContext value={sideTab}>
              <div className='flex flex-col gap-6 px-4 pb-2 pt-4'>
                <TextField
                  fullWidth
                  size='small'
                  placeholder='Buscar agencia, titular, reserva o habitación'
                  value={listSearch}
                  onChange={event => setListSearch(event.target.value)}
                />
                <CustomTabList onChange={(_event, value) => setSideTab(value as SideTab)} variant='fullWidth' pill='true'>
                  <Tab label={`Llegadas (${overview?.summary.arrivals ?? 0})`} value='arrivals' />
                  <Tab label={`En casa (${stayingTonight.length})`} value='inHouse' />
                  <Tab label={`Salidas (${overview?.summary.departures ?? 0})`} value='departures' />
                </CustomTabList>
              </div>
              <TabPanel value='arrivals' className='p-0'>
                <StayList
                  kind='arrivals'
                  stays={sortedArrivals}
                  emptyMessage={listQuery && (overview?.arrivals.length ?? 0) > 0 ? 'Nadie coincide con la búsqueda.' : undefined}
                  busy={arrivalBusy}
                  onOpenStay={openStay}
                  today={overview?.date || ''}
                  onCheckIn={stay => void runArrivalAction(stay, 'checkIn')}
                  onCheckOut={() => undefined}
                  onEarlyDeparture={() => undefined}
                  onUndoCheckIn={() => undefined}
                  onAssign={stay => {
                    setSelectedStay(stay)
                    setAssignOpen(true)
                  }}
                  onNoShow={stay => void runArrivalAction(stay, 'noShow')}
                />
              </TabPanel>
              <TabPanel value='inHouse' className='p-0'>
                <StayList
                  kind='inHouse'
                  stays={sortedInHouse}
                  emptyMessage={listQuery && stayingTonight.length > 0 ? 'Nadie coincide con la búsqueda.' : undefined}
                  today={overview?.date || ''}
                  onOpenStay={openStay}
                  onCheckIn={() => undefined}
                  onCheckOut={() => undefined}
                  onEarlyDeparture={stay => {
                    setSelectedStay(stay)
                    setEarlyOpen(true)
                  }}
                  onUndoCheckIn={stay => {
                    setSelectedStay(stay)
                    setUndoOpen(true)
                  }}
                  onAssign={() => undefined}
                  onNoShow={() => undefined}
                />
              </TabPanel>
              <TabPanel value='departures' className='p-0'>
                <StayList
                  kind='departures'
                  stays={sortedDepartures}
                  emptyMessage={listQuery && (overview?.departures.length ?? 0) > 0 ? 'Nadie coincide con la búsqueda.' : undefined}
                  today={overview?.date || ''}
                  onOpenStay={openStay}
                  onCheckIn={() => undefined}
                  onCheckOut={stay => {
                    setSelectedStay(stay)
                    setCheckOutOpen(true)
                  }}
                  onEarlyDeparture={() => undefined}
                  onUndoCheckIn={() => undefined}
                  onAssign={() => undefined}
                  onNoShow={() => undefined}
                />
              </TabPanel>
            </TabContext>
          </Card>
        </Grid>
        )}
      </Grid>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        {canWalkIn && menuRoom?.displayStatus === 'AVAILABLE' && !menuRoom.arrival ? (
          <MenuItem
            onClick={() => {
              setWalkInRoom(menuRoom)
              closeMenu()
            }}
          >
            Nuevo ingreso
          </MenuItem>
        ) : null}
        {menuRoom?.arrival ? (
          <MenuItem
            onClick={() => {
              if (menuRoom.arrival) openStay(menuRoom.arrival)
              closeMenu()
            }}
          >
            Ver reserva
          </MenuItem>
        ) : null}
        {menuRoom?.displayStatus === 'OCCUPIED' && menuRoom.currentStay ? (
          <MenuItem
            onClick={() => {
              if (menuRoom.currentStay) openStay(menuRoom.currentStay)
              closeMenu()
            }}
          >
            Ver estadía
          </MenuItem>
        ) : null}
        {canRegisterPayment &&
        menuRoom?.displayStatus === 'OCCUPIED' &&
        menuRoom.currentStay &&
        menuRoom.currentStay.reservationBalance !== 0 ? (
          <MenuItem
            onClick={() => {
              setRefundPreset(null)
              setSelectedStay(menuRoom.currentStay)
              setPayOpen(true)
              closeMenu()
            }}
          >
            {menuRoom.currentStay.reservationBalance < 0 ? 'Registrar devolución' : 'Registrar pago'}
          </MenuItem>
        ) : null}
        {menuRoom?.displayStatus === 'OCCUPIED' && menuRoom.currentStay ? (
          <MenuItem
            onClick={() => {
              if (menuRoom.currentStay) openStay(menuRoom.currentStay)
              closeMenu()
            }}
          >
            Acompañantes
          </MenuItem>
        ) : null}
        {menuRoom?.displayStatus === 'CLEANING' || menuRoom?.displayStatus === 'AVAILABLE' ? (
          <MenuItem onClick={() => handleSetStatus('CLEANING')}>Marcar en limpieza</MenuItem>
        ) : null}
        {menuRoom?.displayStatus === 'CLEANING' ? <MenuItem onClick={() => handleSetStatus('AVAILABLE')}>Marcar limpia</MenuItem> : null}
        {canWalkIn && menuRoom?.displayStatus === 'CLEANING' ? (
          <MenuItem
            onClick={() => {
              setWalkInRoom(menuRoom)
              closeMenu()
            }}
          >
            Nuevo ingreso
          </MenuItem>
        ) : null}
        {menuRoom && (menuRoom.displayStatus === 'AVAILABLE' || menuRoom.displayStatus === 'CLEANING') ? (
          <MenuItem
            component={Link}
            href={getLocalizedUrl(`/apps/rooms/edit/${menuRoom.uuid}`, locale as Locale)}
            onClick={closeMenu}
          >
            Programar mantenimiento
          </MenuItem>
        ) : null}
        {menuRoom?.displayStatus === 'MAINTENANCE' ? (
          <MenuItem
            component={Link}
            href={getLocalizedUrl(`/apps/rooms/edit/${menuRoom.uuid}`, locale as Locale)}
            onClick={closeMenu}
          >
            Ver mantenimiento
          </MenuItem>
        ) : null}
      </Menu>

      <WalkInDialog
        open={Boolean(walkInRoom)}
        propertyId={propertyId}
        room={walkInRoom}
        date={overview?.date || new Date().toISOString().slice(0, 10)}
        onClose={() => setWalkInRoom(null)}
        onSuccess={fetchOverview}
      />
      <StayDrawer
        open={stayOpen}
        propertyId={propertyId}
        stay={selectedStay}
        onClose={() => setStayOpen(false)}
        onSuccess={fetchOverview}
        onPay={stay => {
          setRefundPreset(null)
          setSelectedStay(stay)
          setPayOpen(true)
        }}
      />
      <PaymentDialog
        open={payOpen}
        propertyId={propertyId}
        stay={selectedStay}
        refundAmount={refundPreset?.amount}
        refundHint={refundPreset?.hint}
        onClose={() => {
          setPayOpen(false)
          setRefundPreset(null)
        }}
        onSuccess={fetchOverview}
      />
      <CheckOutDialog
        open={checkOutOpen}
        propertyId={propertyId}
        stay={selectedStay}
        onClose={() => setCheckOutOpen(false)}
        onSuccess={fetchOverview}
        onPay={stay => {
          setRefundPreset(null)
          setSelectedStay(stay)
          setPayOpen(true)
        }}
      />
      <EarlyDepartureDialog
        open={earlyOpen}
        propertyId={propertyId}
        stay={selectedStay}
        today={overview?.date || ''}
        onClose={() => setEarlyOpen(false)}
        onSuccess={fetchOverview}
        onRefund={(amount, hint) => {
          setRefundPreset({ amount, hint })
          setPayOpen(true)
        }}
      />
      <UndoCheckInDialog
        open={undoOpen}
        propertyId={propertyId}
        stay={selectedStay}
        onClose={() => setUndoOpen(false)}
        onSuccess={fetchOverview}
        onRefund={(amount, hint) => {
          setRefundPreset({ amount, hint })
          setPayOpen(true)
        }}
      />
      <AssignRoomDialog
        open={assignOpen}
        propertyId={propertyId}
        stay={selectedStay}
        onClose={() => setAssignOpen(false)}
        onSuccess={fetchOverview}
      />
      <Dialog open={Boolean(photoRoom)} onClose={() => setPhotoRoom(null)} maxWidth='md' fullWidth>
        {photoRoom?.photoUrl ? (
          <img
            src={cloudinaryTransformedUrl(photoRoom.photoUrl, ROOM_PHOTO_DETAIL) || photoRoom.photoUrl}
            alt={`Habitación ${photoRoom.number}`}
            className='is-full'
          />
        ) : (
          <div className='flex flex-col items-center justify-center gap-2 p-10'>
            <i className='ri-hotel-bed-line text-6xl' />
            <Typography>
              {photoRoom?.number} · {photoRoom?.roomTypeName}
            </Typography>
          </div>
        )}
      </Dialog>
    </>
  )
}

export default FrontDeskPage
