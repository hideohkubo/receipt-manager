'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'

export default function ExportPage() {
  const t = useTranslations('export')
  const locale = useLocale()

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const fiscalYearStart = currentMonth >= 4
    ? `${currentYear}-04-01`
    : `${currentYear - 1}-04-01`
  const fiscalYearEnd = currentMonth >= 4
    ? `${currentYear + 1}-03-31`
    : `${currentYear}-03-31`

  const [dateFrom, setDateFrom] = useState(fiscalYearStart)
  const [dateTo, setDateTo] = useState(fiscalYearEnd)
  const [loading, setLoading] = useState<'csv' | 'pdf' | null>(null)
  const [error, setError] = useState('')

  async function fetchReceipts() {
    const params = new URLSearchParams({ format: 'json' })
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)
    const res = await fetch(`/api/export?${params}`)
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? t('errorExport'))
    }
    return res.json()
  }

  async function handleCSV() {
    setLoading('csv')
    setError('')
    try {
      const params = new URLSearchParams({ format: 'csv' })
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      const res = await fetch(`/api/export?${params}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? t('errorExport'))
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipts_${dateFrom}_${dateTo}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message ?? t('errorExport'))
    }
    setLoading(null)
  }

  async function handlePDF() {
    setLoading('pdf')
    setError('')
    try {
      const data = await fetchReceipts()
      const receipts = data.receipts

      // Build HTML with Japanese text — browser renders it natively
      const fyLabel = locale === 'ja'
        ? (currentMonth >= 4 ? `${currentYear}年度` : `${currentYear - 1}年度`)
        : (currentMonth >= 4 ? `FY${currentYear}` : `FY${currentYear - 1}`)

      const total = receipts.reduce((sum: number, r: any) => sum + (r.total_amount ?? 0), 0)
      const period = dateFrom && dateTo ? `${dateFrom} 〜 ${dateTo}` : '全期間'

      const rows = receipts.map((r: any) => `
        <tr>
          <td>${r.issue_date ?? ''}</td>
          <td>${r.payee_name ?? ''}</td>
          <td class="num">¥${(r.total_amount ?? 0).toLocaleString()}</td>
          <td class="num">${r.tax_amount ? '¥' + r.tax_amount.toLocaleString() : ''}</td>
          <td class="center">${r.tax_rate ? r.tax_rate + '%' : ''}</td>
          <td>${r.categories?.name ?? ''}</td>
          <td>${r.memo ?? ''}</td>
        </tr>
      `).join('')

      const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>領収書一覧</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif; font-size: 11px; color: #1a1a1a; padding: 20mm; }
  h1 { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
  .meta { font-size: 11px; color: #555; margin-bottom: 4px; }
  .summary { margin: 12px 0 16px; padding: 10px 14px; background: #f5f7fa; border-radius: 6px; display: flex; gap: 24px; }
  .summary span { font-size: 12px; }
  .summary strong { font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #3b82f6; color: white; padding: 7px 8px; text-align: left; font-size: 10px; font-weight: bold; }
  td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fafb; }
  .num { text-align: right; }
  .center { text-align: center; }
  .footer { margin-top: 16px; font-size: 9px; color: #999; text-align: right; }
  @media print {
    body { padding: 0; }
    @page { margin: 15mm; size: A4 landscape; }
  }
</style>
</head>
<body>
<h1>領収書一覧</h1>
<div class="meta">対象期間: ${period}</div>
<div class="meta">出力日時: ${new Date().toLocaleString('ja-JP')}</div>
<div class="summary">
  <div><div class="meta">件数</div><strong>${receipts.length}件</strong></div>
  <div><div class="meta">合計金額</div><strong>¥${total.toLocaleString()}</strong></div>
</div>
<table>
  <thead>
    <tr>
      <th style="width:80px">発行日</th>
      <th style="width:160px">支払先名</th>
      <th style="width:80px">合計金額</th>
      <th style="width:70px">消費税</th>
      <th style="width:45px">税率</th>
      <th style="width:90px">カテゴリ</th>
      <th>メモ</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">領収書管理システム — 電子帳簿保存法対応</div>
</body>
</html>`

      // Open in new window and trigger print dialog
      const win = window.open('', '_blank')
      if (!win) throw new Error('ポップアップがブロックされました。ブラウザのポップアップ設定を確認してください。')
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => { win.print() }, 500)

    } catch (e: any) {
      setError(e.message ?? t('errorExport'))
    }
    setLoading(null)
  }

  function setThisMonth() {
    const m = String(currentMonth).padStart(2, '0')
    const lastDay = new Date(currentYear, currentMonth, 0).getDate()
    setDateFrom(`${currentYear}-${m}-01`)
    setDateTo(`${currentYear}-${m}-${lastDay}`)
  }

  function setThisQuarter() {
    const q = Math.floor((currentMonth - 1) / 3)
    const startMonth = q * 3 + 1
    const endMonth = startMonth + 2
    const lastDay = new Date(currentYear, endMonth, 0).getDate()
    setDateFrom(`${currentYear}-${String(startMonth).padStart(2, '0')}-01`)
    setDateTo(`${currentYear}-${String(endMonth).padStart(2, '0')}-${lastDay}`)
  }

  function setThisFiscalYear() {
    setDateFrom(fiscalYearStart)
    setDateTo(fiscalYearEnd)
  }

  function setLastFiscalYear() {
    const lastFYStart = currentMonth >= 4 ? `${currentYear - 1}-04-01` : `${currentYear - 2}-04-01`
    const lastFYEnd = currentMonth >= 4 ? `${currentYear}-03-31` : `${currentYear - 1}-03-31`
    setDateFrom(lastFYStart)
    setDateTo(lastFYEnd)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/dashboard`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← {t('back')}
        </Link>
        <h2 className="text-xl font-bold text-gray-800">{t('title')}</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">{t('period')}</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { label: t('thisMonth'), action: setThisMonth },
              { label: t('thisQuarter'), action: setThisQuarter },
              { label: t('thisFiscalYear'), action: setThisFiscalYear },
              { label: t('lastFiscalYear'), action: setLastFiscalYear },
            ].map(({ label, action }) => (
              <button key={label} onClick={action}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('from')}</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('to')}</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">{t('format')}</label>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={handleCSV} disabled={loading !== null}
              className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 group">
              <span className="text-3xl">📊</span>
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                {loading === 'csv' ? t('exporting') : t('csvButton')}
              </span>
              <span className="text-xs text-gray-400">{t('csvDesc')}</span>
            </button>

            <button onClick={handlePDF} disabled={loading !== null}
              className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition-colors disabled:opacity-50 group">
              <span className="text-3xl">📄</span>
              <span className="text-sm font-medium text-gray-700 group-hover:text-red-700">
                {loading === 'pdf' ? t('exporting') : t('pdfButton')}
              </span>
              <span className="text-xs text-gray-400">{t('pdfDesc')}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">{t('note')}</p>
      </div>
    </div>
  )
}
