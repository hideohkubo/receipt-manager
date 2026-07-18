'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'

type Category = { id: string; name: string }

export default function NewReceiptPage() {
  const t = useTranslations('receiptForm')
  const locale = useLocale()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    issue_date: new Date().toISOString().split('T')[0],
    payee_name: '', payee_address: '', total_amount: '',
    tax_amount: '', tax_rate: '10', category_id: '', memo: '',
  })

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!form.payee_name.trim()) { setError(t('errorPayee')); setLoading(false); return }
    if (!form.total_amount || isNaN(Number(form.total_amount))) { setError(t('errorAmount')); setLoading(false); return }

    const res = await fetch('/api/receipts', {
      method: 'POST',
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
        image_source: 'upload',
      }),
    })

    if (res.ok) { router.push(`/${locale}/receipts`); router.refresh() }
    else { const d = await res.json(); setError(d.error ?? t('errorSubmit')); setLoading(false) }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/dashboard`} className="text-gray-400 hover:text-gray-600 text-sm">{t('back')}</Link>
        <h2 className="text-xl font-bold text-gray-800">{t('addTitle')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('issueDate')} <span className="text-red-500">{t('required')}</span></label>
          <input type="date" name="issue_date" value={form.issue_date} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('payeeName')} <span className="text-red-500">{t('required')}</span></label>
          <input type="text" name="payee_name" value={form.payee_name} onChange={handleChange} placeholder={t('payeeNamePlaceholder')} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('payeeAddress')} <span className="text-gray-400 font-normal">{t('optional')}</span></label>
          <input type="text" name="payee_address" value={form.payee_address} onChange={handleChange} placeholder={t('payeeAddressPlaceholder')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('totalAmount')} <span className="text-red-500">{t('required')}</span></label>
            <div className="relative">
              <input type="number" name="total_amount" value={form.total_amount} onChange={handleChange} placeholder="0" required min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="absolute right-3 top-2 text-sm text-gray-400">{t('currencyUnit')}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('taxAmount')} <span className="text-gray-400 font-normal">{t('optional')}</span></label>
            <div className="relative">
              <input type="number" name="tax_amount" value={form.tax_amount} onChange={handleChange} placeholder="0" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="absolute right-3 top-2 text-sm text-gray-400">{t('currencyUnit')}</span>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('taxRate')}</label>
          <div className="flex gap-4">
            {['10', '8', '0'].map(rate => (
              <label key={rate} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="tax_rate" value={rate} checked={form.tax_rate === rate} onChange={handleChange} className="text-blue-600" />
                <span className="text-sm text-gray-700">{rate}%</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')} <span className="text-gray-400 font-normal">{t('optional')}</span></label>
          <select name="category_id" value={form.category_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">{t('categoryPlaceholder')}</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('memo')} <span className="text-gray-400 font-normal">{t('optional')}</span></label>
          <textarea name="memo" value={form.memo} onChange={handleChange} placeholder={t('memoPlaceholder')} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? t('submitLoading') : t('submitButton')}
          </button>
          <Link href={`/${locale}/dashboard`} className="flex-1 text-center border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            {t('cancelButton')}
          </Link>
        </div>
      </form>
    </div>
  )
}
