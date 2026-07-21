import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') ?? 'csv'
  const dateFrom = searchParams.get('from')
  const dateTo = searchParams.get('to')

  let query = supabase
    .from('receipts')
    .select('issue_date, payee_name, payee_address, total_amount, tax_amount, tax_rate, memo, categories(name), created_at')
    .eq('user_id', user.id)
    .order('issue_date', { ascending: false })

  if (dateFrom) query = query.gte('issue_date', dateFrom)
  if (dateTo) query = query.lte('issue_date', dateTo)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'No receipts found for the selected period' }, { status: 404 })
  }

  // Record export history (only for actual downloads)
  if (format !== 'json') {
    await supabase.from('export_history').insert({
      user_id: user.id,
      date_from: dateFrom ?? null,
      date_to: dateTo ?? null,
      format,
      record_count: data.length,
    })
  }

  // JSON — for client-side PDF generation
  if (format === 'json') {
    return NextResponse.json({ receipts: data })
  }

  // CSV
  if (format === 'csv') {
    const csv = generateCSV(data as any[])
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="receipts_${dateFrom ?? 'all'}_${dateTo ?? 'all'}.csv"`,
      },
    })
  }

  return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
}

function generateCSV(data: any[]): string {
  const BOM = '\uFEFF'
  const headers = [
    '発行日', '支払先名', '支払先住所',
    '合計金額（税込）', '消費税額', '税率（%）',
    'カテゴリ', 'メモ', '登録日時',
  ]

  const rows = data.map(r => [
    r.issue_date ?? '',
    r.payee_name ?? '',
    r.payee_address ?? '',
    r.total_amount ?? '',
    r.tax_amount ?? '',
    r.tax_rate ?? '',
    r.categories?.name ?? '',
    r.memo ?? '',
    r.created_at ? new Date(r.created_at).toLocaleString('ja-JP') : '',
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  return BOM + csvContent
}
