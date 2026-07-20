'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'

type OcrResult = {
  issue_date: string | null
  payee_name: string | null
  total_amount: number | null
  tax_amount: number | null
  tax_rate: number | null
  raw_text: string
}

type Props = {
  receiptId: string
  existingPath?: string | null
  onUploadComplete: (path: string) => void
  onOcrComplete?: (result: OcrResult) => void
}

export default function ImageUpload({ receiptId, existingPath, onUploadComplete, onOcrComplete }: Props) {
  const t = useTranslations('imageUpload')
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
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
      setUploading(false)

      // Run OCR if callback provided
      if (onOcrComplete) {
        setProcessing(true)
        try {
          const ocrRes = await fetch('/api/receipts/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagePath: path }),
          })
          if (ocrRes.ok) {
            const result = await ocrRes.json()
            onOcrComplete(result)
          }
        } catch (e) {
          console.error('OCR failed:', e)
        }
        setProcessing(false)
      }
    } else {
      const data = await res.json()
      setError(data.error ?? t('errorUpload'))
      setPreview(null)
      setUploading(false)
    }
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

  const isLoading = uploading || processing

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {t('label')} <span className="text-gray-400 font-normal">{t('optional')}</span>
      </label>

      <div
        onClick={() => !isLoading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
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
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <span className="animate-spin">⏳</span>
          <span>{t('uploading')}</span>
        </div>
      )}

      {processing && (
        <div className="flex items-center gap-2 text-sm text-purple-600">
          <span className="animate-spin">🔍</span>
          <span>{t('processing')}</span>
        </div>
      )}

      {existingPath && !preview && (
        <p className="text-xs text-green-600">✓ {t('existing')}</p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
