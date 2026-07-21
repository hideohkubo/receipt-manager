'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import Papa from 'papaparse'

type ParsedRow = {
  issue_date: string
  payee_name: string
  payee_address?: string
  total_amount: string
  tax_amount?: string
  tax_rate?: string
  category?: string
  image_filename?: string
  memo?: string
}

type ImportResult = {
  success: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

const REQUIRED_COLUMNS = ['発行日', '支払先名', '合計金額（税込）']
const COLUMN_MAP: Record<string, keyof ParsedRow> = {
  '発行日': 'issue_date',
  '支払先名': 'payee_name',
  '支払先住所': 'payee_address',
  '合計金額（税込）': 'total_amount',
  '消費税額': 'tax_amount',
  '税率（%）': 'tax_rate',
  'カテゴリ': 'category',
  '画像ファイル名': 'image_filename',
  'メモ': 'memo',
}

export default function ImportCSVPage() {
  const t = useTranslations('import')
  const locale = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function parseFile(file: File) {
    setFile(file)
    setParseError('')
    setResult(null)
    setPreview([])

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const headers = results.meta.fields ?? []

        const missing = REQUIRED_COLUMNS.filter(col => !headers.includes(col))
        if (missing.length > 0) {
          setParseError(`必須列が見つかりません: ${missing.join(', ')}`)
          return
        }

        const rows: ParsedRow[] = (results.data as Record<string, string>[]).map(row => {
          const mapped: Partial<ParsedRow> = {}
          for (const [jpCol, field] of Object.entries(COLUMN_MAP)) {
            if (row[jpCol] !== undefined) {
              mapped[field] = row[jpCol]
            }
          }
          return mapped as ParsedRow
        })

        setPreview(rows)
      },
      error: (err) => {
        setParseError(err.message)
      }
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) parseFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) parseFile(f)
  }

  async function handleImport() {
    if (preview.length === 0) return
    setImporting(true)
    setResult(null)

    try {
      const res = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: preview }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e: any) {
      setParseError(e.message ?? t('errorImport'))
    }
    setImporting(false)
  }

  function reset() {
    setFile(null)
    setPreview([])
    setParseError('')
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function downloadTemplate() {
    const csv = '\uFEFF発行日,支払先名,支払先住所,合計金額（税込）,消費税額,税率（%）,カテゴリ,画像ファイル名,メモ\n2024-04-01,株式会社〇〇,,1100,100,10,交通費,receipt_001.jpg,\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'receipts_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/dashboard`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← {t('back')}
        </Link>
        <h2 className="text-xl font-bold text-gray-800">{t('csvTitle')}</h2>
      </div>

      <div className="space-y-4">

        {/* Format guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-800 mb-2">{t('formatGuide')}</p>
          <p className="text-xs text-blue-700 mb-1">
            {t('requiredColumns')}: <span className="font-mono">発行日, 支払先名, 合計金額（税込）</span>
          </p>
          <p className="text-xs text-blue-700 mb-1">
            {t('optionalColumns')}: <span className="font-mono">支払先住所, 消費税額, 税率（%）, カテゴリ, 画像ファイル名, メモ</span>
          </p>
          <p className="text-xs text-blue-700 mb-1">
            {t('dateFormat')}: <span className="font-mono">YYYY-MM-DD</span>
          </p>
          <p className="text-xs text-blue-600 mt-2">
            💡 {t('imageFilenameHint')}
          </p>
          <button onClick={downloadTemplate} className="mt-3 text-xs text-blue-600 hover:underline">
            📥 {t('downloadTemplate')}
          </button>
        </div>

        {/* Drop zone */}
        {!file && (
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            className={`
              border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
              ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
            `}
          >
            <div className="text-4xl mb-3">📂</div>
            <p className="text-sm text-gray-500">{t('dropzoneCSV')}</p>
            <p className="text-xs text-gray-400 mt-1">.csv</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {parseError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {parseError}
          </div>
        )}

        {/* Preview table */}
        {preview.length > 0 && !result && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                {t('preview')}: {preview.length}{t('rows')}
                {preview.length > 5 && (
                  <span className="text-gray-400 font-normal ml-2">({t('showing5')})</span>
                )}
              </p>
              <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">
                {t('reset')}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">発行日</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">支払先名</th>
                    <th className="px-3 py-2 text-right text-gray-500 font-medium">合計金額</th>
                    <th className="px-3 py-2 text-right text-gray-500 font-medium">消費税</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">カテゴリ</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">画像ファイル名</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">メモ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">{row.issue_date}</td>
                      <td className="px-3 py-2 text-gray-700">{row.payee_name}</td>
                      <td className="px-3 py-2 text-gray-700 text-right">
                        {row.total_amount ? `¥${parseInt(row.total_amount.replace(/[,，¥￥]/g, '')).toLocaleString()}` : ''}
                      </td>
                      <td className="px-3 py-2 text-gray-700 text-right">
                        {row.tax_amount ? `¥${parseInt(row.tax_amount.replace(/[,，¥￥]/g, '')).toLocaleString()}` : ''}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{row.category}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{row.image_filename}</td>
                      <td className="px-3 py-2 text-gray-500">{row.memo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 flex gap-3">
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {importing ? t('importing') : `${t('importButton')} (${preview.length}${t('rows')})`}
              </button>
              <button
                onClick={reset}
                className="border border-gray-300 text-gray-600 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-3">
            <div className={`rounded-xl border p-5 ${result.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`text-base font-semibold mb-3 ${result.failed === 0 ? 'text-green-800' : 'text-amber-800'}`}>
                {result.failed === 0 ? '✅ ' : '⚠️ '}{t('resultTitle')}
              </p>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-gray-500">{t('successCount')}: </span>
                  <span className="font-semibold text-green-700">{result.success}{t('rows')}</span>
                </div>
                {result.failed > 0 && (
                  <div>
                    <span className="text-gray-500">{t('failedCount')}: </span>
                    <span className="font-semibold text-red-600">{result.failed}{t('rows')}</span>
                  </div>
                )}
              </div>
              {result.success > 0 && (
                <p className="text-xs text-gray-500 mt-3">
                  💡 {t('zipHint')}
                </p>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">{t('errors')}:</p>
                <ul className="space-y-1">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-600">{e.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Link
                href={`/${locale}/receipts`}
                className="flex-1 text-center bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {t('viewReceipts')}
              </Link>
              <button
                onClick={reset}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                {t('importMore')}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
