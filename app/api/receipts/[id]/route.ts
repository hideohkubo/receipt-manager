import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('receipts')
    .select('*, categories(id, name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // Fetch current values for audit log
  const { data: before } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (before.is_locked) return NextResponse.json({ error: 'This receipt is locked' }, { status: 403 })

  const { data, error } = await supabase
    .from('receipts')
    .update({
      payee_name: body.payee_name,
      payee_address: body.payee_address ?? null,
      total_amount: body.total_amount,
      tax_amount: body.tax_amount ?? null,
      tax_rate: body.tax_rate ?? null,
      issue_date: body.issue_date,
      category_id: body.category_id ?? null,
      memo: body.memo ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  await supabase.from('audit_log').insert({
    user_id: user.id,
    receipt_id: id,
    action: 'updated',
    changed_fields: { before, after: data },
  })

  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: receipt } = await supabase
    .from('receipts')
    .select('is_locked')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!receipt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (receipt.is_locked) return NextResponse.json({ error: 'This receipt is locked' }, { status: 403 })

  // Audit log before delete
  await supabase.from('audit_log').insert({
    user_id: user.id,
    receipt_id: id,
    action: 'deleted',
  })

  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
