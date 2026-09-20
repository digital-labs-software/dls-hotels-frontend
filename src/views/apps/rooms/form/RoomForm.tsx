'use client'

import { useEffect, useMemo, useState } from 'react'

import { useParams, useRouter, useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { Controller, useForm } from 'react-hook-form'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import type { Locale } from '@configs/i18n'
import type { Floor } from '@/types/apps/floorTypes'
import type { RoomType } from '@/types/apps/roomTypeTypes'
import type { RoomStatus } from '@/types/apps/roomsTypes'
import { ROOM_STATUS_LABELS, ROOM_STATUSES } from '@/types/apps/roomsTypes'
import { listFloors } from '@/libs/floorsApi'
import { listRoomTypes } from '@/libs/roomTypesApi'
import { createRoom, getRoom, getRoomsApiErrorMessage, updateRoom } from '@/libs/roomsApi'
import { getLocalizedUrl } from '@/utils/i18n'

type FormValues = {
  number: string
  floorId: number | ''
  roomTypeId: number | ''
  status: RoomStatus
  photoUrl: string
  notes: string
}

type Props = {
  uuid?: string
}

const RoomForm = ({ uuid }: Props) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const { data: session, status: sessionStatus } = useSession()
  const propertyId = session?.user?.propertyId ?? 1
  const isView = searchParams.get('mode') === 'view'
  const isEdit = Boolean(uuid) && !isView

  const [loading, setLoading] = useState(Boolean(uuid))
  const [floors, setFloors] = useState<Floor[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      number: '',
      floorId: '',
      roomTypeId: '',
      status: 'AVAILABLE',
      photoUrl: '',
      notes: ''
    }
  })

  const floorsWithId = useMemo(() => floors.filter(floor => typeof floor.id === 'number'), [floors])
  const typesWithId = useMemo(() => roomTypes.filter(type => typeof type.id === 'number'), [roomTypes])
  const missingNumericIds = floors.length > 0 && floorsWithId.length === 0

  useEffect(() => {
    if (sessionStatus === 'loading') {
      return
    }

    const load = async () => {
      try {
        const [floorsRes, typesRes] = await Promise.all([listFloors(), listRoomTypes()])

        setFloors(floorsRes.filter(item => item.propertyId === propertyId))
        setRoomTypes(typesRes.filter(item => item.propertyId === propertyId))

        if (!uuid) {
          setLoading(false)

          return
        }

        const room = await getRoom(uuid)

        reset({
          number: room.number,
          floorId: room.floorId,
          roomTypeId: room.roomTypeId,
          status: room.status,
          photoUrl: room.photoUrl ?? '',
          notes: room.notes ?? ''
        })
      } catch (error) {
        toast.error(getRoomsApiErrorMessage(error, 'No se encontró la habitación solicitada.'))
        router.replace(getLocalizedUrl('/apps/rooms/list', locale as Locale))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [locale, propertyId, reset, router, sessionStatus, uuid])

  const goBack = () => {
    router.push(getLocalizedUrl('/apps/rooms/list', locale as Locale))
  }

  const onSubmit = async (data: FormValues) => {
    if (isView) {
      return
    }

    if (data.floorId === '' || data.roomTypeId === '') {
      toast.error('Selecciona nivel y tipo de habitación.')

      return
    }

    try {
      if (isEdit && uuid) {
        await updateRoom(uuid, {
          floorId: Number(data.floorId),
          roomTypeId: Number(data.roomTypeId),
          status: data.status,
          photoUrl: data.photoUrl.trim() ? data.photoUrl.trim() : null,
          notes: data.notes.trim() ? data.notes.trim() : null
        })
        toast.success('Habitación actualizada.')
      } else {
        await createRoom({
          propertyId,
          floorId: Number(data.floorId),
          roomTypeId: Number(data.roomTypeId),
          number: data.number.trim(),
          status: data.status,
          photoUrl: data.photoUrl.trim() ? data.photoUrl.trim() : null,
          notes: data.notes.trim() ? data.notes.trim() : null
        })
        toast.success('Habitación creada.')
      }

      goBack()
    } catch (error) {
      toast.error(getRoomsApiErrorMessage(error, 'No se pudo guardar la habitación.'))
    }
  }

  const title = isView ? 'Ver habitación' : isEdit ? 'Editar habitación' : 'Agregar habitación'

  if (loading) {
    return (
      <div className='flex justify-center items-center p-10'>
        <CircularProgress size={32} />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-6'>
            <div>
              <Typography variant='h4' className='mbe-1'>
                {title}
              </Typography>
              <Typography>
                {isView
                  ? 'Consulta los datos de la habitación'
                  : isEdit
                    ? 'Actualiza tipo, nivel, estado o notas. El número no se puede cambiar.'
                    : 'Registra una habitación del hotel'}
              </Typography>
            </div>
            <div className='flex flex-wrap max-sm:flex-col gap-4'>
              <Button variant='outlined' color='secondary' type='button' onClick={goBack}>
                {isView ? 'Volver' : 'Descartar'}
              </Button>
              {!isView ? (
                <Button variant='contained' type='submit' disabled={isSubmitting || missingNumericIds}>
                  {isSubmitting ? <CircularProgress size={20} color='inherit' /> : isEdit ? 'Guardar' : 'Publicar habitación'}
                </Button>
              ) : null}
            </div>
          </div>
        </Grid>

        {missingNumericIds ? (
          <Grid size={{ xs: 12 }}>
            <Alert severity='warning'>
              Los listados de niveles y tipos aún no traen el `id` numérico. El backend debe incluir `id` en GET
              /floors y GET /room-types para poder crear habitaciones (`floorId` y `roomTypeId`).
            </Alert>
          </Grid>
        ) : null}

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardHeader title='Información de la habitación' />
            <CardContent className='flex flex-col gap-5'>
              <Controller
                name='number'
                control={control}
                rules={{
                  required: 'El número es obligatorio.',
                  maxLength: { value: 20, message: 'Máximo 20 caracteres.' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label='Número'
                    placeholder='101'
                    disabled={isView || isEdit || isSubmitting}
                    {...(errors.number && { error: true, helperText: errors.number.message })}
                  />
                )}
              />
              <Controller
                name='photoUrl'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label='URL de foto'
                    placeholder='https://cdn.ejemplo.com/rooms/101.jpg'
                    disabled={isView || isSubmitting}
                  />
                )}
              />
              <Controller
                name='notes'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    minRows={5}
                    label='Notas'
                    placeholder='Vista al mar, balcón privado.'
                    disabled={isView || isSubmitting}
                  />
                )}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardHeader title='Organizar' />
            <CardContent className='flex flex-col gap-5'>
              <FormControl fullWidth error={Boolean(errors.floorId)}>
                <InputLabel id='room-floor'>Nivel</InputLabel>
                <Controller
                  name='floorId'
                  control={control}
                  rules={{ required: 'El nivel es obligatorio.' }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label='Nivel'
                      labelId='room-floor'
                      disabled={isView || isSubmitting}
                    >
                      {floorsWithId.map(floor => (
                        <MenuItem key={floor.uuid} value={floor.id}>
                          {floor.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                {errors.floorId ? <FormHelperText>{errors.floorId.message}</FormHelperText> : null}
              </FormControl>

              <FormControl fullWidth error={Boolean(errors.roomTypeId)}>
                <InputLabel id='room-type'>Tipo</InputLabel>
                <Controller
                  name='roomTypeId'
                  control={control}
                  rules={{ required: 'El tipo es obligatorio.' }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label='Tipo'
                      labelId='room-type'
                      disabled={isView || isSubmitting}
                    >
                      {typesWithId.map(type => (
                        <MenuItem key={type.uuid} value={type.id}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                {errors.roomTypeId ? <FormHelperText>{errors.roomTypeId.message}</FormHelperText> : null}
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id='room-status'>Estado</InputLabel>
                <Controller
                  name='status'
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select {...field} label='Estado' labelId='room-status' disabled={isView || isSubmitting}>
                      {ROOM_STATUSES.map(item => (
                        <MenuItem key={item} value={item}>
                          {ROOM_STATUS_LABELS[item]}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </form>
  )
}

export default RoomForm
