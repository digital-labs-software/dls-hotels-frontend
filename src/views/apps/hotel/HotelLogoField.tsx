'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import type { BoxProps } from '@mui/material/Box'
import { useDropzone } from 'react-dropzone'

import CustomAvatar from '@core/components/mui/Avatar'
import AppReactDropzone from '@/libs/styles/AppReactDropzone'
import { HOTEL_LOGO, cloudinaryTransformedUrl } from '@/libs/cloudinary'
import { validateCloudinaryImageFile } from '@/libs/uploadsApi'

const Dropzone = styled(AppReactDropzone)<BoxProps>(({ theme }) => ({
  '& .dropzone': {
    minHeight: 'unset',
    padding: theme.spacing(6)
  }
}))

type Props = {
  logoUrl: string | null
  disabled?: boolean
  onFileChange: (file: File | null) => void
  onRemove: () => void
  onInvalidFile: (message: string) => void
}

const HotelLogoField = ({ logoUrl, disabled, onFileChange, onRemove, onInvalidFile }: Props) => {
  const [file, setFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const previewUrl = localPreview || cloudinaryTransformedUrl(logoUrl, HOTEL_LOGO)

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview)
      }
    }
  }, [localPreview])

  const applyFile = (next: File) => {
    const error = validateCloudinaryImageFile(next)

    if (error) {
      onInvalidFile(error)

      return
    }

    setFile(next)
    setLocalPreview(prev => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }

      return URL.createObjectURL(next)
    })
    onFileChange(next)
  }

  const { getRootProps, getInputProps, open } = useDropzone({
    disabled,
    multiple: false,
    noClick: Boolean(previewUrl),
    noKeyboard: true,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    onDrop: acceptedFiles => {
      const next = acceptedFiles[0]

      if (next) {
        applyFile(next)
      }
    }
  })

  const handleRemove = () => {
    setFile(null)
    setLocalPreview(prev => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }

      return null
    })
    onFileChange(null)
    onRemove()
  }

  return (
    <div className='flex flex-col gap-3'>
      <Typography variant='body2' color='text.secondary'>
        Logo del hotel
      </Typography>
      <Dropzone>
        <div {...getRootProps({ className: 'dropzone' })}>
          <input {...getInputProps()} />
          {previewUrl ? (
            <img
              src={previewUrl}
              alt='Logo del hotel'
              className='rounded-md object-contain mx-auto'
              style={{ maxHeight: 160, maxWidth: '100%' }}
            />
          ) : (
            <div className='flex items-center flex-col gap-2 text-center'>
              <CustomAvatar variant='rounded' skin='light' color='secondary'>
                <i className='ri-image-add-line' />
              </CustomAvatar>
              <Typography>{disabled ? 'Sin logo' : 'Arrastra el logo o elige un archivo'}</Typography>
              {!disabled ? (
                <>
                  <Typography variant='body2' color='text.disabled'>
                    JPG, PNG o WEBP. Máximo 5 MB.
                  </Typography>
                  <Button
                    variant='outlined'
                    size='small'
                    type='button'
                    onClick={event => {
                      event.preventDefault()
                      event.stopPropagation()
                      open()
                    }}
                  >
                    Elegir logo
                  </Button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </Dropzone>
      {previewUrl && !disabled ? (
        <div className='flex flex-wrap gap-2'>
          <Button
            variant='outlined'
            size='small'
            type='button'
            onClick={event => {
              event.preventDefault()
              event.stopPropagation()
              open()
            }}
          >
            Cambiar logo
          </Button>
          <Button variant='outlined' color='error' size='small' type='button' onClick={handleRemove}>
            Quitar logo
          </Button>
        </div>
      ) : null}
      {file ? (
        <Typography variant='caption' color='text.secondary'>
          {file.name} · se subirá al guardar
        </Typography>
      ) : null}
    </div>
  )
}

export default HotelLogoField
