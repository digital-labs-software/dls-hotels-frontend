'use client'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'

type Props = {
  title: string
  name: string
  details: (string | null | undefined)[]
  actionLabel: string
  onAction: () => void
}

/** Aviso de que el documento ya pertenece a un registro del hotel, con acceso directo a él. */
const ExistingRecordAlert = ({ title, name, details, actionLabel, onAction }: Props) => {
  const visibleDetails = details.filter(Boolean)

  return (
    <Alert
      severity='warning'
      action={
        <Button color='inherit' size='small' variant='outlined' onClick={onAction} className='whitespace-nowrap'>
          {actionLabel}
        </Button>
      }
    >
      <AlertTitle>{title}</AlertTitle>
      <strong>{name}</strong>
      {visibleDetails.length ? <span> · {visibleDetails.join(' · ')}</span> : null}
    </Alert>
  )
}

export default ExistingRecordAlert
