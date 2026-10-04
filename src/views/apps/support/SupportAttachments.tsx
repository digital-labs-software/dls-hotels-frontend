'use client'

import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import classnames from 'classnames'

import type { SupportAttachment } from '@/types/apps/supportTypes'
import { formatBytes, isImageAttachment } from './supportUtils'

export const SUPPORT_FILE_ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf'

/** Archivos elegidos que aún no se han enviado. */
export const PendingFiles = ({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) => {
  if (!files.length) return null

  return (
    <div className='flex flex-wrap gap-2'>
      {files.map((file, index) => (
        <Chip
          key={`${file.name}-${file.size}-${index}`}
          size='small'
          variant='tonal'
          color='primary'
          icon={<i className={file.type === 'application/pdf' ? 'ri-file-pdf-2-line' : 'ri-image-line'} />}
          label={`${file.name} · ${formatBytes(file.size)}`}
          onDelete={() => onRemove(index)}
        />
      ))}
    </div>
  )
}

/** Adjuntos de un mensaje ya enviado: miniatura para imágenes y enlace para PDF. */
export const MessageAttachments = ({
  attachments,
  inverted
}: {
  attachments: SupportAttachment[]
  inverted: boolean
}) => {
  if (!attachments.length) return null

  return (
    <div className={classnames('flex flex-wrap gap-2', { 'justify-end': inverted })}>
      {attachments.map(attachment =>
        isImageAttachment(attachment) ? (
          <a
            key={attachment.url}
            href={attachment.url}
            target='_blank'
            rel='noopener noreferrer'
            className='block overflow-hidden rounded border bg-backgroundPaper'
            title={attachment.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.url}
              alt={attachment.name}
              className='block max-is-[220px] max-bs-[160px] object-cover'
            />
          </a>
        ) : (
          <a
            key={attachment.url}
            href={attachment.url}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-2 rounded border bg-backgroundPaper pli-3 plb-2 no-underline'
          >
            <i className='ri-file-pdf-2-line text-2xl text-error' />
            <div className='min-is-0'>
              <Typography variant='body2' color='text.primary' className='truncate max-is-[180px]'>
                {attachment.name}
              </Typography>
              {attachment.bytes ? (
                <Typography variant='caption' color='text.secondary'>
                  {formatBytes(attachment.bytes)}
                </Typography>
              ) : null}
            </div>
          </a>
        )
      )}
    </div>
  )
}
