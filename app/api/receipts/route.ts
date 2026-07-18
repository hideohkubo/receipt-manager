import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('receipts')
    .select('id, issue_date, payee_name, total_amount, categories(name)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('issue_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ receipts: data, total: count })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('receipts')
    .insert({
      user_id: user.id,
      payee_name: body.payee_name,
      payee_address: body.payee_address ?? null,
      total_amount: body.total_amount,
      tax_amount: body.tax_amount ?? null,
      tax_rate: body.tax_rate ?? null,
      issue_date: body.issue_date,
      category_id: body.category_id ?? null,
      memo: body.memo ?? null,
      image_source: body.image_source ?? null,
      is_verified: true,
      verified_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Write to audit log
  await supabase.from('audit_log').insert({
    user_id: user.id,
    receipt_id: data.id,
    action: 'created',
  })

  return NextResponse.json(data, { status: 201 })
}
