import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Fiscal year in Japan: April to March
  const fiscalYearStart = currentMonth >= 4
    ? `${currentYear}-04-01`
    : `${currentYear - 1}-04-01`

  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
  const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

  // Total this month
  const { data: monthData } = await supabase
    .from('receipts')
    .select('total_amount')
    .eq('user_id', user.id)
    .gte('issue_date', monthStart)
    .lte('issue_date', monthEnd)

  const monthTotal = monthData?.reduce((sum, r) => sum + r.total_amount, 0) ?? 0

  // Total this fiscal year
  const { data: fyData } = await supabase
    .from('receipts')
    .select('total_amount')
    .eq('user_id', user.id)
    .gte('issue_date', fiscalYearStart)

  const fyTotal = fyData?.reduce((sum, r) => sum + r.total_amount, 0) ?? 0

  // Spending by category (with category name)
  const { data: categoryData } = await supabase
    .from('receipts')
    .select('total_amount, category_id, categories(name)')
    .eq('user_id', user.id)
    .gte('issue_date', fiscalYearStart)
    .not('category_id', 'is', null)

  const categoryTotals: Record<string, { name: string; total: number }> = {}
  categoryData?.forEach((r: any) => {
    const id = r.category_id
    const name = r.categories?.name ?? '未分類'
    if (!categoryTotals[id]) categoryTotals[id] = { name, total: 0 }
    categoryTotals[id].total += r.total_amount
  })

  const topCategories = Object.values(categoryTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Recent receipts
  const { data: recentReceipts } = await supabase
    .from('receipts')
    .select('id, issue_date, payee_name, total_amount, categories(name)')
    .eq('user_id', user.id)
    .order('issue_date', { ascending: false })
    .limit(10)

  // Receipt count
  const { count } = await supabase
    .from('receipts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return NextResponse.json({
    monthTotal,
    fyTotal,
    topCategories,
    recentReceipts: recentReceipts ?? [],
    totalCount: count ?? 0,
    fiscalYearStart,
    currentMonth,
    currentYear,
  })
}
