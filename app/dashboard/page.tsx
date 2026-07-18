'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Category = { name: string; total: number }
type Receipt = {
  id: string
  issue_date: string
  payee_name: string
  total_amount: number
  categories: { name: string } | null
}
type DashboardData = {
  monthTotal: number
  fyTotal: number
  topCategories: Category[]
  recentReceipts: Receipt[]
  totalCount: number
  currentMonth: number
  currentYear: number
}

const fmt = (n: number) => n.toLocaleString('ja-JP') + '円'

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    )
  }

  if (!data) return null

  const fyLabel = data.currentMonth >= 4
    ? `${data.currentYear}年度`
    : `${data.currentYear - 1}年度`

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">ダッシュボード</h2>
        <Link
          href="/receipts/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          ＋ 領収書を追加
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-1">今月の支出</p>
          <p className="text-2xl font-bold text-gray-800">{fmt(data.monthTotal)}</p>
          <p className="text-xs text-gray-400 mt-1">{data.currentYear}年{data.currentMonth}月</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-1">年度累計</p>
          <p className="text-2xl font-bold text-gray-800">{fmt(data.fyTotal)}</p>
          <p className="text-xs text-gray-400 mt-1">{fyLabel}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-1">登録件数（累計）</p>
          <p className="text-2xl font-bold text-gray-800">{data.totalCount.toLocaleString()}件</p>
          <p className="text-xs text-gray-400 mt-1">全期間</p>
        </div>
      </div>

      {/* Category breakdown + Recent receipts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Top categories */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            カテゴリ別支出 <span className="text-gray-400 font-normal">({fyLabel})</span>
          </h3>
          {data.topCategories.length === 0 ? (
            <p className="text-gray-400 text-sm">データがありません</p>
          ) : (
            <ul className="space-y-3">
              {data.topCategories.map((cat, i) => {
                const pct = data.fyTotal > 0
                  ? Math.round((cat.total / data.fyTotal) * 100)
                  : 0
                return (
                  <li key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{cat.name}</span>
                      <span className="text-gray-500">{fmt(cat.total)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div
                        className="h-1.5 bg-blue-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Recent receipts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">最近の領収書</h3>
          {data.recentReceipts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-3">領収書がまだ登録されていません</p>
              <Link
                href="/receipts/new"
                className="text-blue-600 text-sm hover:underline"
              >
                最初の領収書を追加する →
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.recentReceipts.map(r => (
                <li key={r.id}>
                  <Link
                    href={`/receipts/${r.id}`}
                    className="flex items-center justify-between hover:bg-gray-50 rounded-lg p-1 -mx-1 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.payee_name}</p>
                      <p className="text-xs text-gray-400">
                        {r.issue_date} · {r.categories?.name ?? '未分類'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 ml-3 shrink-0">
                      {fmt(r.total_amount)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {data.recentReceipts.length > 0 && (
            <Link
              href="/receipts"
              className="block text-center text-xs text-blue-600 hover:underline mt-4"
            >
              すべての領収書を見る →
            </Link>
          )}
        </div>

      </div>
    </div>
  )
}
