'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'

type Props = {
  receiptId: string
  existingPath?: string | null
  onUploadComplete: (path: string) => void
}

export default function ImageUpload({ receiptId, existingPath, onUploadComplete }: Props) {
  const t = useTranslations('imageUpload')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setUploading(true)
    setError('')

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('receiptId', receiptId)

    const res = await fetch('/api/receipts/upload', {
      method: 'POST',
      body: formData,
    })

    if (res.ok) {
      const { path } = await res.json()
      onUploadComplete(path)
    } else {
      const data = await res.json()
      setError(data.error ?? t('errorUpload'))
      setPreview(null)
    }

    setUploading(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {t('label')} <span className="text-gray-400 font-normal">{t('optional')}</span>
      </label>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        {preview ? (
          <img src={preview} alt="Receipt preview" className="max-h-48 mx-auto rounded-lg object-contain" />
        ) : (
          <div className="space-y-2">
            <div className="text-3xl">📄</div>
            <p className="text-sm text-gray-500">{t('dropzone')}</p>
            <p className="text-xs text-gray-400">{t('fileTypes')}</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {uploading && (
        <p className="text-sm text-blue-600 text-center">{t('uploading')}</p>
      )}

      {existingPath && !preview && (
        <p className="text-xs text-green-600 text-center">✓ {t('existing')}</p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
