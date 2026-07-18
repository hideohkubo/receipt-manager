'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Category = { id: string; name: string }

export default function NewReceiptPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    issue_date: new Date().toISOString().split('T')[0],
    payee_name: '',
    payee_address: '',
    total_amount: '',
    tax_amount: '',
    tax_rate: '10',
    category_id: '',
    memo: '',
  })

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(setCategories)
  }, [])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!form.payee_name.trim()) {
      setError('支払先名を入力してください')
      setLoading(false)
      return
    }

    if (!form.total_amount || isNaN(Number(form.total_amount))) {
      setError('金額を正しく入力してください')
      setLoading(false)
      return
    }

    const payload = {
      issue_date: form.issue_date,
      payee_name: form.payee_name.trim(),
      payee_address: form.payee_address.trim() || null,
      total_amount: Math.round(Number(form.total_amount)),
      tax_amount: form.tax_amount ? Math.round(Number(form.tax_amount)) : null,
      tax_rate: form.tax_rate ? Number(form.tax_rate) : null,
      category_id: form.category_id || null,
      memo: form.memo.trim() || null,
      image_source: 'upload',
    }

    const res = await fetch('/api/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      router.push('/receipts')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? '登録に失敗しました')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
          ← 戻る
        </Link>
        <h2 className="text-xl font-bold text-gray-800">領収書を追加</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

        {/* Issue date */}
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

        {/* Payee name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            支払先名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="payee_name"
            value={form.payee_name}
            onChange={handleChange}
            placeholder="例：株式会社〇〇"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Payee address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            支払先住所 <span className="text-gray-400 font-normal">(任意)</span>
          </label>
          <input
            type="text"
            name="payee_address"
            value={form.payee_address}
            onChange={handleChange}
            placeholder="例：東京都渋谷区〇〇"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Amount row */}
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
                placeholder="0"
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
                placeholder="0"
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-2 text-sm text-gray-400">円</span>
            </div>
          </div>
        </div>

        {/* Tax rate */}
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
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">{rate}%</span>
              </label>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            カテゴリ <span className="text-gray-400 font-normal">(任意)</span>
          </label>
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

        {/* Memo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            メモ <span className="text-gray-400 font-normal">(任意)</span>
          </label>
          <textarea
            name="memo"
            value={form.memo}
            onChange={handleChange}
            placeholder="備考・メモを入力"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '登録中...' : '登録する'}
          </button>
          <Link
            href="/dashboard"
            className="flex-1 text-center border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </Link>
        </div>

      </form>
    </div>
  )
}
