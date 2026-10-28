'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Tab from '@mui/material/Tab'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import CustomTabList from '@core/components/mui/TabList'
import { useSubscriptionAccess } from '@/contexts/subscriptionAccess'
import {
  RESERVATIONS_CALENDAR_VIEW,
  RESERVATIONS_CREATE,
  RESERVATIONS_LIST_VIEW,
  RESERVATIONS_NOTES_MANAGE,
  RESERVATIONS_NOTES_VIEW
} from '@/types/apps/hotelPermissions'
import DateField from '@/components/date-picker/DateField'
import type { Floor } from '@/types/apps/floorTypes'
import type { RoomType } from '@/types/apps/roomTypeTypes'
import type {
  NewReservationPrefill,
  Planning,
  ReservationNote,
  PlanningBooking,
  PlanningRoom,
  PlanningView
} from '@/types/apps/reservationsTypes'
import {
  addDays,
  applyFilters,
  NOTE_COLORS,
  formatPlanningHeading,
  formatPlanningShort,
  PLANNING_VIEWS,
  todayISO
} from '@/types/apps/reservationsTypes'
import { listFloors } from '@/libs/floorsApi'
import { getReservationsApiErrorMessage, reservationsApi } from '@/libs/reservationsApi'
import { listRoomTypes } from '@/libs/roomTypesApi'
import PendingNotesPanel from './PendingNotesPanel'
import PlanningCalendar from './PlanningCalendar'
import QuickNoteDialog from './QuickNoteDialog'
import PlanningDayList from './PlanningDayList'
import ReservationDrawer from './ReservationDrawer'
import ReservationListTable from './ReservationListTable'
import ReservationPaymentDialog from './ReservationPaymentDialog'
import ReservationWizard from './ReservationWizard'

type MainTab = 'calendar' | 'list' | 'notes'

const ReservationsPage = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { data: session, status } = useSession()
  const { can } = useSubscriptionAccess()
  const showCalendar = can(RESERVATIONS_CALENDAR_VIEW)
  const showList = can(RESERVATIONS_LIST_VIEW)
  const showNotes = can(RESERVATIONS_NOTES_VIEW) || can(RESERVATIONS_NOTES_MANAGE)
  const canCreateReservation = can(RESERVATIONS_CREATE)
  const canManageNotes = can(RESERVATIONS_NOTES_MANAGE)
  const searchParams = useSearchParams()
  const propertyId = session?.user?.propertyId ?? 1

  const [tab, setTab] = useState<MainTab>('calendar')
  const [view, setView] = useState<PlanningView>('FORTNIGHT')
  const [from, setFrom] = useState<string | undefined>(undefined)
  const [mobileDay, setMobileDay] = useState<string>('')
  const [planning, setPlanning] = useState<Planning | null>(null)
  const [loading, setLoading] = useState(true)
  const [roomTypeId, setRoomTypeId] = useState<number | ''>('')
  const [floorId, setFloorId] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [wizardOpen, setWizardOpen] = useState(false)
  const [prefill, setPrefill] = useState<NewReservationPrefill | null>(null)
  const [detailUuid, setDetailUuid] = useState<string | null>(null)
  const [highlightAssign, setHighlightAssign] = useState(false)
  const [highlightedUuid, setHighlightedUuid] = useState<string | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [payUuid, setPayUuid] = useState<string | null>(null)
  const [payBalance, setPayBalance] = useState(0)
  const [payPaid, setPayPaid] = useState(0)
  const [payCancelled, setPayCancelled] = useState(false)
  const [paymentsVersion, setPaymentsVersion] = useState(0)
  const [unassignedOpen, setUnassignedOpen] = useState(false)
  const [unassigned, setUnassigned] = useState<PlanningBooking[]>([])
  const [listKey, setListKey] = useState(0)
  const [notes, setNotes] = useState<ReservationNote[]>([])
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteDate, setNoteDate] = useState('')
  const pendingNoteUuid = useRef<string | null>(null)

  const loadNotes = useCallback(async () => {
    try {
      setNotes(await reservationsApi.notes(propertyId))
    } catch {
      setNotes([])
    }
  }, [propertyId])

  const fetchPlanning = useCallback(async () => {
    setLoading(true)

    try {
      if (isMobile) {
        const day = mobileDay || undefined

        const result = day
          ? await reservationsApi.planningDay(propertyId, day)
          : await reservationsApi.planning(propertyId, 'WEEK')

        setPlanning(result)
        setMobileDay(current => current || result.today)
      } else {
        setPlanning(await reservationsApi.planning(propertyId, view, from))
      }
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo cargar el calendario de reservas.'))
    } finally {
      setLoading(false)
    }
  }, [from, isMobile, mobileDay, propertyId, view])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    fetchPlanning()
    loadNotes()
  }, [fetchPlanning, loadNotes, status])

  useEffect(() => {
    if (searchParams.get('por-completar') === '1') {
      setDetailUuid(null)
      setTab('notes')
    }
  }, [searchParams])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    const loadFilters = async () => {
      try {
        const [types, floorRows] = await Promise.all([
          listRoomTypes(propertyId, { limit: 100 }),
          listFloors(propertyId, { limit: 100 })
        ])

        setRoomTypes(types.data)
        setFloors(floorRows.data)
      } catch {
        setRoomTypes([])
        setFloors([])
      }
    }

    loadFilters()
  }, [propertyId, status])

  const typeOptions = useMemo(() => {
    if (roomTypes.length > 0) {
      return roomTypes.map(type => ({ id: type.id, name: type.name }))
    }

    const unique = new Map<number, string>()

    planning?.rooms.forEach(room => unique.set(room.roomTypeId, room.roomTypeName))

    return [...unique.entries()].map(([id, name]) => ({ id, name }))
  }, [planning?.rooms, roomTypes])

  const openWizard = (next?: NewReservationPrefill | null) => {
    setPrefill(next ?? null)
    setWizardOpen(true)
  }

  const handleEmptyCell = (room: PlanningRoom, day: string) => {
    openWizard({
      roomId: room.id,
      roomTypeId: room.roomTypeId,
      roomNumber: room.number,
      roomTypeName: room.roomTypeName,
      checkInDate: day,
      checkOutDate: addDays(day, 1)
    })
  }

  const handleAvailableRoom = (room: PlanningRoom) => {
    const day = planning?.from || mobileDay

    openWizard({
      roomId: room.id,
      roomTypeId: room.roomTypeId,
      roomNumber: room.number,
      roomTypeName: room.roomTypeName,
      checkInDate: day,
      checkOutDate: addDays(day, 1)
    })
  }

  const openNote = (day?: string) => {
    setNoteDate(day || planning?.today || mobileDay || todayISO())
    setNoteOpen(true)
  }

  const completeNote = (note: ReservationNote) => {
    pendingNoteUuid.current = note.uuid
    openWizard({
      checkInDate: note.stayDate,
      checkOutDate: addDays(note.stayDate, 1),
      notes: note.text
    })
  }

  const discardNote = async (note: ReservationNote) => {
    try {
      await reservationsApi.discardNote(propertyId, note.uuid)
      toast.success('Nota descartada.')
      loadNotes()
    } catch (error) {
      toast.error(getReservationsApiErrorMessage(error, 'No se pudo descartar la nota.'))
    }
  }

  const handleCreated = async (uuid: string, code: string) => {
    const noteUuid = pendingNoteUuid.current

    pendingNoteUuid.current = null
    toast.success(`Reserva ${code} creada`)
    setWizardOpen(false)
    setHighlightedUuid(uuid)
    setHighlightAssign(false)
    setDetailUuid(uuid)
    setListKey(current => current + 1)

    if (noteUuid) {
      try {
        await reservationsApi.completeNote(propertyId, noteUuid, uuid)
      } catch (error) {
        toast.error(getReservationsApiErrorMessage(error, 'La reserva se creó, pero la nota sigue por completar.'))
      }
    }

    fetchPlanning()
    loadNotes()
  }

  const today = planning?.today || mobileDay || todayISO()

  return (
    <div className='flex flex-col gap-5'>
      {canManageNotes || canCreateReservation ? (
      <div className='flex flex-wrap justify-end gap-2'>
          {canManageNotes ? (
          <Button
            variant='contained'
            startIcon={<i className='ri-mic-line' />}
            onClick={() => openNote()}
            sx={{
              bgcolor: NOTE_COLORS.button,
              color: NOTE_COLORS.buttonText,
              '&:hover': { bgcolor: NOTE_COLORS.buttonHover }
            }}
          >
            Anotar
          </Button>
          ) : null}
          {canCreateReservation ? (
          <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={() => openWizard()}>
            Nueva reserva
          </Button>
          ) : null}
      </div>
      ) : null}

      {detailUuid ? (
        <ReservationDrawer
          open
          propertyId={propertyId}
          reservationUuid={detailUuid}
          today={today}
          highlightAssign={highlightAssign}
          onClose={() => setDetailUuid(null)}
          onChanged={() => {
            setListKey(current => current + 1)
            fetchPlanning()
          }}
          paymentsVersion={paymentsVersion}
          onPay={(uuid, balance, paidAmount, cancelled) => {
            setPayUuid(uuid)
            setPayBalance(balance)
            setPayPaid(paidAmount)
            setPayCancelled(cancelled)
            setPayOpen(true)
          }}
        />
      ) : (
      <Card>
        <CardContent className='flex flex-col gap-4'>
          <TabContext value={tab}>
            <CustomTabList onChange={(_, value) => setTab(value as MainTab)} variant='scrollable' pill='true'>
              {showCalendar ? <Tab value='calendar' label='Calendario' /> : null}
              {showList ? <Tab value='list' label='Lista' /> : null}
              {showNotes ? <Tab value='notes' label={`Por completar${notes.length ? ` (${notes.length})` : ''}`} /> : null}
            </CustomTabList>

            <TabPanel value='calendar' className='p-0'>
              {isMobile ? (
                <div className='flex flex-col gap-4'>
                  <Typography variant='h6' className='capitalize'>
                    {formatPlanningHeading(mobileDay || today)}
                  </Typography>
                  <div className='flex flex-wrap gap-2'>
                    <Button size='small' variant={!mobileDay || mobileDay === planning?.today ? 'contained' : 'outlined'} onClick={() => setMobileDay(planning?.today || today)}>
                      Hoy
                    </Button>
                    <Button
                      size='small'
                      variant={mobileDay === addDays(planning?.today || today, 1) ? 'contained' : 'outlined'}
                      onClick={() => setMobileDay(addDays(planning?.today || today, 1))}
                    >
                      Mañana
                    </Button>
                    <DateField size='small' value={mobileDay} onChange={setMobileDay} />
                    <IconButton onClick={() => setMobileDay(addDays(mobileDay || today, -1))}>
                      <i className='ri-arrow-left-s-line' />
                    </IconButton>
                    <IconButton onClick={() => setMobileDay(addDays(mobileDay || today, 1))}>
                      <i className='ri-arrow-right-s-line' />
                    </IconButton>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <Chip
                      label='Todas'
                      color={roomTypeId === '' ? 'primary' : 'default'}
                      onClick={() => setRoomTypeId('')}
                    />
                    {typeOptions.map(type => (
                      <Chip
                        key={type.id}
                        label={type.name}
                        color={roomTypeId === type.id ? 'primary' : 'default'}
                        onClick={() => setRoomTypeId(type.id)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className='flex flex-wrap items-center gap-3'>
                  <ToggleButtonGroup
                    exclusive
                    size='small'
                    value={view}
                    onChange={(_, next) => {
                      if (next) {
                        setView(next)
                      }
                    }}
                  >
                    {PLANNING_VIEWS.map(item => (
                      <ToggleButton key={item.value} value={item.value}>
                        {item.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <IconButton disabled={!planning} onClick={() => setFrom(planning?.previousFrom)}>
                    <i className='ri-arrow-left-s-line' />
                  </IconButton>
                  <DateField size='small' value={from || planning?.from || ''} onChange={value => setFrom(value || undefined)} />
                  <IconButton disabled={!planning} onClick={() => setFrom(planning?.nextFrom)}>
                    <i className='ri-arrow-right-s-line' />
                  </IconButton>
                  <Button size='small' variant='outlined' onClick={() => setFrom(undefined)}>
                    Hoy
                  </Button>
                  <FormControl size='small' sx={{ minWidth: 160 }}>
                    <InputLabel id='filter-type'>Tipo</InputLabel>
                    <Select
                      labelId='filter-type'
                      label='Tipo'
                      value={roomTypeId}
                      onChange={e => {
                        const next = Number(e.target.value)

                        setRoomTypeId(Number.isFinite(next) ? next : '')
                      }}
                    >
                      <MenuItem value=''>Todas</MenuItem>
                      {typeOptions.map(type => (
                        <MenuItem key={type.id} value={type.id}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size='small' sx={{ minWidth: 140 }}>
                    <InputLabel id='filter-floor'>Piso</InputLabel>
                    <Select
                      labelId='filter-floor'
                      label='Piso'
                      value={floorId}
                      onChange={e => {
                        const next = Number(e.target.value)

                        setFloorId(Number.isFinite(next) ? next : '')
                      }}
                    >
                      <MenuItem value=''>Todos</MenuItem>
                      {floors.map(floor => (
                        <MenuItem key={floor.id} value={floor.id}>
                          {floor.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    size='small'
                    placeholder='Buscar huésped o código'
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {planning ? (
                    <Typography variant='body2' color='text.secondary'>
                      {formatPlanningShort(planning.from)} – {formatPlanningShort(planning.to)}
                    </Typography>
                  ) : null}
                </div>
              )}

              <div className='mt-4'>
                {loading && !planning ? (
                  <div className='flex justify-center p-10'>
                    <CircularProgress />
                  </div>
                ) : !planning ? (
                  <Typography color='text.secondary'>
                    No se pudo cargar el calendario. Pulsa Hoy o vuelve a iniciar sesión.
                  </Typography>
                ) : isMobile ? (
                  <div className='flex flex-col gap-3'>
                    {notes
                      .filter(note => note.stayDate === (mobileDay || planning.from))
                      .map(note => (
                        <Alert
                          key={note.uuid}
                          icon={<i className='ri-mic-line' />}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: NOTE_COLORS.wash,
                            color: NOTE_COLORS.mark,
                            border: '1px solid',
                            borderColor: NOTE_COLORS.button,
                            '& .MuiAlert-icon': { color: NOTE_COLORS.mark },
                            'html[data-dark] &': {
                              bgcolor: NOTE_COLORS.washDark,
                              color: NOTE_COLORS.markDark,
                              '& .MuiAlert-icon': { color: NOTE_COLORS.markDark }
                            }
                          }}
                          onClick={() => setTab('notes')}
                        >
                          Por completar: {note.text}
                        </Alert>
                      ))}
                    <PlanningDayList
                      planning={planning}
                      day={planning.from}
                      roomTypeId={roomTypeId || undefined}
                      onBookingClick={booking => {
                        setHighlightAssign(booking.roomId === null)
                        setDetailUuid(booking.reservationUuid)
                      }}
                      onAvailableRoom={handleAvailableRoom}
                      onUnassigned={items => {
                        setUnassigned(items)
                        setUnassignedOpen(true)
                      }}
                    />
                  </div>
                ) : applyFilters(planning, roomTypeId || undefined, floorId || undefined).rooms.length === 0 ? (
                  <Typography color='text.secondary'>No hay habitaciones con estos filtros.</Typography>
                ) : (
                  <PlanningCalendar
                    planning={planning}
                    roomTypeId={roomTypeId || undefined}
                    floorId={floorId || undefined}
                    search={search}
                    highlightedUuid={highlightedUuid}
                    onEmptyCell={handleEmptyCell}
                    onBookingClick={booking => {
                      setHighlightAssign(booking.roomId === null)
                      setDetailUuid(booking.reservationUuid)
                    }}
                    notes={notes}
                    onAnnotateDay={openNote}
                    onOpenNotes={() => setTab('notes')}
                  />
                )}
              </div>
            </TabPanel>

            <TabPanel value='list' className='p-0 pt-4'>
              <ReservationListTable
                propertyId={propertyId}
                refreshKey={listKey}
                onOpen={uuid => {
                  setHighlightAssign(false)
                  setDetailUuid(uuid)
                }}
              />
            </TabPanel>

            <TabPanel value='notes' className='p-0 pt-4'>
              <PendingNotesPanel notes={notes} onComplete={completeNote} onDiscard={discardNote} />
            </TabPanel>
          </TabContext>
        </CardContent>
      </Card>
      )}

      <QuickNoteDialog
        open={noteOpen}
        propertyId={propertyId}
        initialDate={noteDate || today || todayISO()}
        onClose={() => setNoteOpen(false)}
        onSaved={loadNotes}
      />

      <ReservationWizard
        open={wizardOpen}
        propertyId={propertyId}
        today={today || new Date().toISOString().slice(0, 10)}
        prefill={prefill}
        onClose={() => {
          pendingNoteUuid.current = null
          setWizardOpen(false)
        }}
        onCreated={handleCreated}
      />

      <ReservationPaymentDialog
        open={payOpen}
        propertyId={propertyId}
        reservationUuid={payUuid}
        balance={payBalance}
        paidAmount={payPaid}
        cancelled={payCancelled}
        onClose={() => setPayOpen(false)}
        onSuccess={() => {
          setPaymentsVersion(current => current + 1)
          setListKey(current => current + 1)
          fetchPlanning()
        }}
      />

      <Dialog open={unassignedOpen} onClose={() => setUnassignedOpen(false)} fullWidth maxWidth='xs'>
        <DialogTitle>Reservas sin habitación</DialogTitle>
        <DialogContent className='flex flex-col gap-2 pt-4'>
          {unassigned.map(booking => (
            <Button
              key={booking.reservationRoomUuid}
              onClick={() => {
                setUnassignedOpen(false)
                setHighlightAssign(true)
                setDetailUuid(booking.reservationUuid)
              }}
            >
              {booking.reservationCode} · {booking.guestName || booking.companyName || booking.roomTypeName}
            </Button>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ReservationsPage
