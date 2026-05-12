import React, { useEffect, useState } from 'react'
import { getAttachmentBlob } from '../../api'
import type { AttachmentItem } from '../../types'

interface AttachmentPreviewProps {
  attachment: AttachmentItem
  token: string
  compact?: boolean
}

export function AttachmentPreview({ attachment, token, compact = false }: AttachmentPreviewProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let url: string | null = null
    setObjectUrl(null)
    setError(null)

    getAttachmentBlob(token, attachment.id)
      .then((blob) => {
        if (!active) return
        url = URL.createObjectURL(blob)
        setObjectUrl(url)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar anexo.'))

    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [attachment.id, token])

  if (error) {
    return (
      <p className={`rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F] ${compact ? 'line-clamp-2' : ''}`}>
        {error}
      </p>
    )
  }

  if (!objectUrl) {
    return <div className={`${compact ? 'h-16 w-16' : 'h-48 w-full'} animate-pulse rounded-[8px] bg-gray-100`} />
  }

  if (attachment.mimeType?.startsWith('image/')) {
    return (
      <img
        src={objectUrl}
        alt={attachment.fileName}
        className={
          compact
            ? 'h-16 w-16 rounded-[8px] border border-black/[0.07] bg-white object-cover'
            : 'max-h-[420px] w-full rounded-[8px] border border-black/[0.07] bg-white object-contain'
        }
      />
    )
  }

  return (
    <a href={objectUrl} target="_blank" rel="noreferrer" className="text-[12px] font-medium text-[#3C3489] underline">
      Abrir anexo
    </a>
  )
}
