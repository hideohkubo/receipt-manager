'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'

type Receipt = {
  id: string
  issue_date: string
  payee_name: string
  total_amount: number
  categories: { name: string } | null
}

export default function ReceiptsPage() {
  const t = useTranslations('receipts')
  const locale = useLocale()
  const fmt = (n: number) => locale === 'ja'
    ? n.toLocaleString('ja-JP') + '円'
    : '¥' + n.toLocaleString('ja-JP')

  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtered, setFiltered] = useState<Receipt[]>([])

  useEffect(() => {
    fetch(`/api/receipts?page=${page}`)
      .then(r => r.json())
      .then(d => {
        setReceipts(d.receipts ?? [])
        setFiltered(d.receipts ?? [])
        setTotal(d.total ?? 0)
        setLoading(false)
      })
  }, [page])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(!q ? receipts : receipts.filter(r =>
      r.payee_name.toLowerCase().includes(q) ||
      r.categories?.name.toLowerCase().includes(q) ||
      r.issue_date.includes(q)
    ))
  }, [search, receipts])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          {t('title')}
          <span className="text-sm font-normal text-gray-400 ml-2">{total}{t('unit')}</span>
        </h2>
        <Link href={`/${locale}/receipts/new`}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          {t('addButton')}
        </Link>
      </div>

      <div className="mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-gray-400 text-sm">{t('loading')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm mb-3">{search ? t('noResults') : t('noReceipts')}</p>
          {!search && (
            <Link href={`/${locale}/receipts/new`} className="text-blue-600 text-sm hover:underline">
              {t('firstReceipt')}
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
            <span className="col-span-2">{t('issueDate')}</span>
            <span className="col-span-4">{t('payee')}</span>
            <span className="col-span-3">{t('category')}</span>
            <span className="col-span-3 text-right">{t('amount')}</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {filtered.map(r => (
              <li key={r.id}>
                <Link href={`/${locale}/receipts/${r.id}`}
                  className="grid grid-cols-12 gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors items-center">
                  <span className="col-span-2 text-xs text-gray-500">{r.issue_date}</span>
                  <span className="col-span-4 text-sm font-medium text-gray-800 truncate">{r.payee_name}</span>
                  <span className="col-span-3 text-xs text-gray-400">{r.categories?.name ?? t('unclassified')}</span>
                  <span className="col-span-3 text-sm font-semibold text-gray-700 text-right">{fmt(r.total_amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
            {t('prev')}
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
            {t('next')}
          </button>
        </div>
      )}
    </div>
  )
}
