'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

type Props = {
  imagePath: string
}

export default function ReceiptImage({ imagePath }: Props) {
  const t = useTranslations('imageUpload')
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const isPdf = imagePath.endsWith('.pdf')

  useEffect(() => {
    fetch(`/api/receipts/image?path=${encodeURIComponent(imagePath)}`)
      .then(r => r.json())
      .then(d => {
        if (d.url) setUrl(d.url)
        else setError(true)
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [imagePath])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-gray-400 text-sm">{t('loading')}</p>
      </div>
    )
  }

  if (error || !url) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-gray-400 text-sm">{t('errorLoad')}</p>
      </div>
    )
  }

  if (isPdf) {
    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <iframe src={url} className="w-full h-96" title="Receipt PDF" />
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline">
            {t('openPdf')} →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
      <img
        src={url}
        alt="Receipt"
        className="w-full object-contain max-h-96"
      />
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline">
          {t('openFull')} →
        </a>
      </div>
    </div>
  )
}
