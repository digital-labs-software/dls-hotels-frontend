'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'react-toastify'

import { scrollToFirstInvalid } from '@/utils/scrollToFirstInvalid'
import { toPersonName } from '@/utils/string'

import { createRate, getRatesApiErrorMessage, listRates, updateRate } from '@/libs/ratesApi'
import type { HotelRate } from '@/types/apps/rateTypes'
import RateRangeCalendar from './RateRangeCalendar'
import { withRateTones } from './rateTones'

export type RateDrawerMode = 'create' | 'edit' | 'view'

type FormValues = {
  name: string
  validFrom: string
  validTo: string
  isActive: boolean
}

type Props = {
  open: boolean
  mode: RateDrawerMode
  propertyId: number
  rate?: HotelRate | null
  onClose: () => void
  onSuccess: () => void
}

const titles: Record<RateDrawerMode, string> = {
  create: 'Nueva tarifa',
  edit: 'Editar tarifa',
  view: 'Ver tarifa'
}

const emptyValues: FormValues = {
  name: '',
  validFrom: '',
  validTo: '',
  isActive: true
}

const toFormValues = (rate: HotelRate): FormValues => ({
  name: rate.name,
  validFrom: rate.validFrom ?? '',
  validTo: rate.validTo ?? '',
  isActive: rate.isActive
})

const RateFormDrawer = ({ open, mode, propertyId, rate, onClose, onSuccess }: Props) => {
  const isView = mode === 'view'
  const isEdit = mode === 'edit'
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [activeRates, setActiveRates] = useState<HotelRate[]>([])

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ defaultValues: emptyValues })

  const validFrom = useWatch({ control, name: 'validFrom' })
  const validTo = useWatch({ control, name: 'validTo' })
  const isActive = useWatch({ control, name: 'isActive' })

  const taken = useMemo(
    () =>
      withRateTones(activeRates)
        .filter(item => item.uuid !== rate?.uuid)
        .map(item => ({ name: item.name, validFrom: item.validFrom, validTo: item.validTo, tone: item.tone })),
    [activeRates, rate?.uuid]
  )

  useEffect(() => {
    if (!open) {
      return
    }

    reset((isEdit || isView) && rate ? toFormValues(rate) : emptyValues)
  }, [open, mode, rate, isEdit, isView, reset])

  useEffect(() => {
    if (!open || !propertyId) {
      return
    }

    let cancel = false

    listRates(propertyId, { page: 1, limit: 100, isActive: true })
      .then(page => {
        if (!cancel) setActiveRates(page.data)
      })
      .catch(() => {
        if (!cancel) setActiveRates([])
      })

    return () => {
      cancel = true
    }
  }, [open, propertyId])

  const handleReset = () => {
    onClose()
    reset(emptyValues)
  }

  const onSubmit = async (data: FormValues) => {
    if (isView) {
      return
    }

    if (!data.validFrom || !data.validTo) {
      setError('validFrom', { message: 'Elija el inicio y el fin en el calendario' })

      return
    }

    if (data.validTo < data.validFrom) {
      setError('validFrom', { message: 'La fecha de fin no puede ser anterior al inicio' })

      return
    }

    if (data.isActive) {
      const clash = taken.find(item => item.validFrom <= data.validTo && item.validTo >= data.validFrom)

      if (clash) {
        setError('validFrom', { message: `Ese tramo pisa ${clash.name}` })

        return
      }
    }

    const payload = {
      name: toPersonName(data.name),
      validFrom: data.validFrom,
      validTo: data.validTo,
      isActive: data.isActive
    }

    try {
      if (isEdit && rate) {
        await updateRate(propertyId, rate.uuid, payload)
        toast.success('Tarifa actualizada.')
      } else {
        const created = await createRate(propertyId, payload)

        toast.success(
          created.restored
            ? 'Esta tarifa estaba eliminada. Se recuperó con los datos que acaba de guardar.'
            : 'Tarifa creada.'
        )
      }

      onSuccess()
      handleReset()
    } catch (error) {
      toast.error(getRatesApiErrorMessage(error, 'No se pudo guardar la tarifa.'))
    }
  }

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleReset}
      disableAutoFocus
      SlideProps={{ onEntered: () => !isView && nameInputRef.current?.focus() }}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', md: 'fit-content' },
          maxWidth: '100vw',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }
      }}
    >
      <div className='flex shrink-0 items-center justify-between pli-5 plb-4'>
        <Typography variant='h5'>{titles[mode]}</Typography>
        <IconButton size='small' onClick={handleReset}>
          <i className='ri-close-line text-2xl' />
        </IconButton>
      </div>
      <Divider />
      <form
        className='flex min-bs-0 min-is-0 flex-1 flex-col overflow-hidden'
        onSubmit={event => {
          const form = event.currentTarget

          void handleSubmit(onSubmit, () => scrollToFirstInvalid(form))(event)
        }}
      >
        <div className='flex min-bs-0 w-full max-w-full flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto p-5 md:w-max'>
          <div className='w-0 min-w-full'>
          <Controller
            name='name'
            control={control}
            rules={{
              required: 'El nombre es obligatorio.',
              maxLength: { value: 100, message: 'Máximo 100 caracteres.' }
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                inputRef={node => {
                  field.ref(node)
                  nameInputRef.current = node
                }}
                label='Nombre'
                placeholder='Semana Santa'
                disabled={isView || isSubmitting}
                onBlur={() => {
                  field.onChange(toPersonName(field.value))
                  field.onBlur()
                }}
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
              />
            )}
          />
          </div>
          <RateRangeCalendar
            key={`${open ? 'open' : 'closed'}-${mode}-${rate?.uuid ?? 'new'}`}
            from={validFrom || ''}
            to={validTo || ''}
            taken={taken}
            blockTaken={!isView && isActive}
            adjustEnds={isEdit}
            disabled={isView || isSubmitting}
            error={errors.validFrom?.message}
            onBlocked={message => setError('validFrom', { message })}
            onChange={(nextFrom, nextTo) => {
              setValue('validFrom', nextFrom, { shouldDirty: true })
              setValue('validTo', nextTo, { shouldDirty: true })
              clearErrors('validFrom')
            }}
          />
          <div className='w-0 min-w-full'>
            <Controller
              name='isActive'
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_, checked) => field.onChange(checked)}
                      disabled={isView || isSubmitting}
                    />
                  }
                  label={field.value ? 'Activa' : 'Inactiva'}
                />
              )}
            />
          </div>
        </div>
        <Divider />
        <div className='flex shrink-0 flex-col gap-3 p-5 sm:flex-row sm:justify-end'>
          <Button
            variant='outlined'
            color='secondary'
            type='button'
            onClick={handleReset}
            disabled={isSubmitting}
            className='max-sm:is-full'
          >
            {isView ? 'Cerrar' : 'Volver'}
          </Button>
          {!isView ? (
            <Button variant='contained' type='submit' disabled={isSubmitting || !propertyId} className='max-sm:is-full'>
              {isSubmitting ? <CircularProgress size={20} color='inherit' /> : 'Guardar'}
            </Button>
          ) : null}
        </div>
      </form>
    </Drawer>
  )
}

export default RateFormDrawer
