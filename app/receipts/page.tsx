'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Receipt = {
  id: string
  issue_date: string
  payee_name: string
  total_amount: number
  categories: { name: string } | null
}

const fmt = (n: number) => n.toLocaleString('ja-JP') + '円'

export default function ReceiptsPage() {
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
    if (!q) {
      setFiltered(receipts)
    } else {
      setFiltered(receipts.filter(r =>
        r.payee_name.toLowerCase().includes(q) ||
        r.categories?.name.toLowerCase().includes(q) ||
        r.issue_date.includes(q)
      ))
    }
  }, [search, receipts])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          領収書一覧
          <span className="text-sm font-normal text-gray-400 ml-2">
            {total}件
          </span>
        </h2>
        <Link
          href="/receipts/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          ＋ 領収書を追加
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="支払先・カテゴリ・日付で検索..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Receipt list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-gray-400 text-sm">読み込み中...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm mb-3">
            {search ? '検索結果が見つかりません' : '領収書がまだ登録されていません'}
          </p>
          {!search && (
            <Link href="/receipts/new" className="text-blue-600 text-sm hover:underline">
              最初の領収書を追加する →
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
            <span className="col-span-2">発行日</span>
            <span className="col-span-4">支払先</span>
            <span className="col-span-3">カテゴリ</span>
            <span className="col-span-3 text-right">金額</span>
          </div>

          {/* Rows */}
          <ul className="divide-y divide-gray-100">
            {filtered.map(r => (
              <li key={r.id}>
                <Link
                  href={`/receipts/${r.id}`}
                  className="grid grid-cols-12 gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors items-center"
                >
                  <span className="col-span-2 text-xs text-gray-500">{r.issue_date}</span>
                  <span className="col-span-4 text-sm font-medium text-gray-800 truncate">
                    {r.payee_name}
                  </span>
                  <span className="col-span-3 text-xs text-gray-400">
                    {r.categories?.name ?? '未分類'}
                  </span>
                  <span className="col-span-3 text-sm font-semibold text-gray-700 text-right">
                    {fmt(r.total_amount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            ← 前へ
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            次へ →
          </button>
        </div>
      )}

    </div>
  )
}
