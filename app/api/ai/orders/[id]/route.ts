/**
 * AI Order Detail & Approval
 * GET    /api/ai/orders/:id — get order detail
 * PATCH  /api/ai/orders/:id/approve — approve order
 * PATCH  /api/ai/orders/:id/reject — reject order
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('ai_orders')
      .select(`
        id,
        agent_name,
        action,
        entity_type,
        entity_id,
        status,
        input_data,
        created_at,
        updated_at,
        approval_queue(id, status, approved_by, approved_at, reason)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, reason, approved_by } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Update approval queue
    const queueStatus = action === 'approve' ? 'approved' : 'rejected'
    const { error: queueErr } = await supabase
      .from('approval_queue')
      .update({
        status: queueStatus,
        reason: reason || null,
        approved_by: approved_by || null,
        approved_at: new Date().toISOString(),
      })
      .eq('order_id', id)

    if (queueErr) throw queueErr

    // Update order status
    const orderStatus = action === 'approve' ? 'approved' : 'rejected'
    const { data: updatedOrder, error: orderErr } = await supabase
      .from('ai_orders')
      .update({
        status: orderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (orderErr) throw orderErr

    return NextResponse.json(updatedOrder)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
