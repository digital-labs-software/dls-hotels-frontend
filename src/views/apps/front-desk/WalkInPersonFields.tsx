'use client'

import { useEffect, useState } from 'react'

import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import type { Guest } from '@/types/apps/clientsTypes'
import CreateGuestDialog from '@views/apps/reservations/CreateGuestDialog'
import GuestPicker from './GuestPicker'

export type WalkInPersonDraft = {
  guestId?: number
  locked?: boolean
  documentType: string
  documentNumber: string
  firstName: string
  lastName: string
  phone: string
  email: string
}

export const emptyWalkInPerson = (): WalkInPersonDraft => ({
  documentType: 'DNI',
  documentNumber: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: ''
})

export const fromGuestToWalkInPerson = (guest: Guest): WalkInPersonDraft => ({
  guestId: guest.id,
  locked: true,
  documentType: guest.person.documentType || 'DNI',
  documentNumber: guest.person.documentNumber || '',
  firstName: guest.person.firstName,
  lastName: guest.person.lastName,
  phone: guest.person.phone || '',
  email: guest.person.email || ''
})

type Props = {
  propertyId: number
  person: WalkInPersonDraft
  onChange: (next: WalkInPersonDraft) => void
  title: string
  disabled?: boolean
  nameError?: string
  /** Marca el buscador sin repetir un texto debajo. */
  fieldError?: boolean
  onRemove?: () => void
  autoFocusSearch?: boolean
}

const WalkInPersonFields = ({
  propertyId,
  person,
  onChange,
  title,
  disabled,
  nameError,
  fieldError,
  onRemove,
  autoFocusSearch
}: Props) => {
  const [createOpen, setCreateOpen] = useState(false)
  const [createQuery, setCreateQuery] = useState('')
  const [picked, setPicked] = useState<Guest | null>(null)
  const selected = Boolean(person.guestId)

  useEffect(() => {
    if (!person.guestId) setPicked(null)
  }, [person.guestId])

  const openCreate = (query = '') => {
    setCreateQuery(query)
    setCreateOpen(true)
  }

  return (
    <div className='flex flex-col gap-1'>
      <div className='flex items-start gap-2'>
        <div className='min-is-0 flex-1'>
          <GuestPicker
            propertyId={propertyId}
            label={title}
            placeholder='DNI o nombre'
            autoFocus={autoFocusSearch && !selected}
            disabled={disabled}
            error={Boolean(fieldError || nameError) && !selected}
            selected={picked}
            onSelect={guest => {
              setPicked(guest)
              onChange(guest ? fromGuestToWalkInPerson(guest) : emptyWalkInPerson())
            }}
            onCreate={openCreate}
          />
        </div>
        {onRemove ? (
          <IconButton
            className='mbs-2'
            size='small'
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Quitar ${title.toLowerCase()}`}
          >
            <i className='ri-delete-bin-line' />
          </IconButton>
        ) : null}
      </div>

      {!selected && nameError ? (
        <Typography variant='caption' color='error.main'>
          {nameError}
        </Typography>
      ) : null}

      <CreateGuestDialog
        open={createOpen}
        propertyId={propertyId}
        initialQuery={createQuery}
        onClose={() => setCreateOpen(false)}
        onCreated={guest => {
          setPicked(guest)
          onChange(fromGuestToWalkInPerson(guest))
          setCreateOpen(false)
        }}
      />
    </div>
  )
}

export default WalkInPersonFields
