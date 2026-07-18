'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Category = { id: string; name: string }
type Receipt = {
  id: string
  issue_date: string
  payee_name: string
  payee_address: string | null
  total_amount: number
  tax_amount: number | null
  tax_rate: number | null
  category_id: string | null
  categories: { id: string; name: string } | null
  memo: string | null
  is_verified: boolean
  is_locked: boolean
  created_at: string
  updated_at: string
}

const fmt = (n: number) => n.toLocaleString('ja-JP') + '円'

export default function ReceiptDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [form, setForm] = useState({
    issue_date: '',
    payee_name: '',
    payee_address: '',
    total_amount: '',
    tax_amount: '',
    tax_rate: '10',
    category_id: '',
    memo: '',
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/receipts/${id}`).then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]).then(([receiptData, categoryData]) => {
      setReceipt(receiptData)
      setCategories(categoryData)
      setForm({
        issue_date: receiptData.issue_date ?? '',
        payee_name: receiptData.payee_name ?? '',
        payee_address: receiptData.payee_address ?? '',
        total_amount: String(receiptData.total_amount ?? ''),
        tax_amount: String(receiptData.tax_amount ?? ''),
        tax_rate: String(receiptData.tax_rate ?? '10'),
        category_id: receiptData.category_id ?? '',
        memo: receiptData.memo ?? '',
      })
      setLoading(false)
    })
  }, [id])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch(`/api/receipts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issue_date: form.issue_date,
        payee_name: form.payee_name.trim(),
        payee_address: form.payee_address.trim() || null,
        total_amount: Math.round(Number(form.total_amount)),
        tax_amount: form.tax_amount ? Math.round(Number(form.tax_amount)) : null,
        tax_rate: form.tax_rate ? Number(form.tax_rate) : null,
        category_id: form.category_id || null,
        memo: form.memo.trim() || null,
      }),
    })

    if (res.ok) {
      const updated = await res.json()
      setReceipt(updated)
      setEditing(false)
    } else {
      const data = await res.json()
      setError(data.error ?? '更新に失敗しました')
    }
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/receipts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/receipts')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? '削除に失敗しました')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-center">
        <p className="text-gray-400 text-sm">領収書が見つかりません</p>
        <Link href="/receipts" className="text-blue-600 text-sm hover:underline mt-2 block">
          一覧に戻る
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/receipts" className="text-gray-400 hover:text-gray-600 text-sm">
            ← 一覧に戻る
          </Link>
          <h2 className="text-xl font-bold text-gray-800">領収書詳細</h2>
        </div>
        {!editing && !receipt.is_locked && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            編集
          </button>
        )}
      </div>

      {editing ? (
        /* ── EDIT FORM ── */
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              発行日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="issue_date"
              value={form.issue_date}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              支払先名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="payee_name"
              value={form.payee_name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              支払先住所 <span className="text-gray-400 font-normal">(任意)</span>
            </label>
            <input
              type="text"
              name="payee_address"
              value={form.payee_address}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                合計金額（税込）<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="total_amount"
                  value={form.total_amount}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2 text-sm text-gray-400">円</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                消費税額 <span className="text-gray-400 font-normal">(任意)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="tax_amount"
                  value={form.tax_amount}
                  onChange={handleChange}
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2 text-sm text-gray-400">円</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">税率</label>
            <div className="flex gap-4">
              {['10', '8', '0'].map(rate => (
                <label key={rate} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tax_rate"
                    value={rate}
                    checked={form.tax_rate === rate}
                    onChange={handleChange}
                  />
                  <span className="text-sm text-gray-700">{rate}%</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">カテゴリを選択</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
            <textarea
              name="memo"
              value={form.memo}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存する'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </div>

        </form>

      ) : (
        /* ── VIEW MODE ── */
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">

          {receipt.is_locked && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
              この領収書はロックされています
            </div>
          )}

          <dl className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-sm text-gray-400">発行日</dt>
              <dd className="col-span-2 text-sm font-medium text-gray-800">{receipt.issue_date}</dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-sm text-gray-400">支払先</dt>
              <dd className="col-span-2 text-sm font-medium text-gray-800">{receipt.payee_name}</dd>
            </div>
            {receipt.payee_address && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-sm text-gray-400">住所</dt>
                <dd className="col-span-2 text-sm text-gray-800">{receipt.payee_address}</dd>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-sm text-gray-400">合計金額</dt>
              <dd className="col-span-2 text-lg font-bold text-gray-800">{fmt(receipt.total_amount)}</dd>
            </div>
            {receipt.tax_amount != null && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-sm text-gray-400">消費税</dt>
                <dd className="col-span-2 text-sm text-gray-800">
                  {fmt(receipt.tax_amount)}
                  {receipt.tax_rate != null && (
                    <span className="text-gray-400 ml-2">({receipt.tax_rate}%)</span>
                  )}
                </dd>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-sm text-gray-400">カテゴリ</dt>
              <dd className="col-span-2 text-sm text-gray-800">
                {receipt.categories?.name ?? '未分類'}
              </dd>
            </div>
            {receipt.memo && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-sm text-gray-400">メモ</dt>
                <dd className="col-span-2 text-sm text-gray-800 whitespace-pre-wrap">{receipt.memo}</dd>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
              <dt className="text-sm text-gray-400">登録日時</dt>
              <dd className="col-span-2 text-xs text-gray-400">
                {new Date(receipt.created_at).toLocaleString('ja-JP')}
              </dd>
            </div>
          </dl>

          {/* Delete */}
          {!receipt.is_locked && (
            <div className="pt-4 border-t border-gray-100">
              {confirmDelete ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700 mb-3">本当に削除しますか？この操作は取り消せません。</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? '削除中...' : '削除する'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm text-red-500 hover:text-red-700 hover:underline"
                >
                  この領収書を削除
                </button>
              )}
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
          )}

        </div>
      )}

    </div>
  )
}
