import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

type ImportRow = {
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

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows } = await request.json() as { rows: ImportRow[] }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'No data provided' }, { status: 400 })
  }

  if (rows.length > 1000) {
    return NextResponse.json({ error: 'Maximum 1000 rows per import' }, { status: 400 })
  }

  // Fetch categories for name matching
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .or(`user_id.eq.${user.id},user_id.is.null`)

  const categoryMap = new Map<string, string>()
  categories?.forEach(c => categoryMap.set(c.name, c.id))

  const result: ImportResult = { success: 0, failed: 0, errors: [] }
  const validRows: any[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    if (!row.issue_date || !row.issue_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      result.failed++
      result.errors.push({ row: rowNum, message: `行${rowNum}: 発行日の形式が正しくありません (YYYY-MM-DD)` })
      continue
    }

    if (!row.payee_name || !row.payee_name.trim()) {
      result.failed++
      result.errors.push({ row: rowNum, message: `行${rowNum}: 支払先名が空です` })
      continue
    }

    const totalAmount = parseInt(String(row.total_amount).replace(/[,，¥￥\s]/g, ''))
    if (isNaN(totalAmount) || totalAmount <= 0) {
      result.failed++
      result.errors.push({ row: rowNum, message: `行${rowNum}: 合計金額が正しくありません` })
      continue
    }

    const taxAmount = row.tax_amount
      ? parseInt(String(row.tax_amount).replace(/[,，¥￥\s]/g, ''))
      : null

    const taxRate = row.tax_rate
      ? parseFloat(String(row.tax_rate).replace(/[%％\s]/g, ''))
      : null

    const categoryId = row.category
      ? categoryMap.get(row.category.trim()) ?? null
      : null

    validRows.push({
      user_id: user.id,
      issue_date: row.issue_date,
      payee_name: row.payee_name.trim(),
      payee_address: row.payee_address?.trim() || null,
      total_amount: totalAmount,
      tax_amount: isNaN(taxAmount!) ? null : taxAmount,
      tax_rate: isNaN(taxRate!) ? null : taxRate,
      category_id: categoryId,
      image_filename: row.image_filename?.trim() || null,
      memo: row.memo?.trim() || null,
      is_verified: true,
      verified_at: new Date().toISOString(),
    })
  }

  if (validRows.length > 0) {
    const { data, error } = await supabase
      .from('receipts')
      .insert(validRows)
      .select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    result.success = data?.length ?? 0

    await supabase.from('audit_log').insert(
      data!.map(r => ({
        user_id: user.id,
        receipt_id: r.id,
        action: 'imported',
      }))
    )
  }

  return NextResponse.json(result)
}
