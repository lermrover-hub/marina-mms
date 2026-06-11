/**
 * AI Orders API
 * GET  /api/ai/orders — list orders
 * POST /api/ai/orders — create order (for agents)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const status = req.nextUrl.searchParams.get('status')
    const agent = req.nextUrl.searchParams.get('agent')

    let query = supabase
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
        approval_queue(id, status, approved_by, approved_at)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    if (agent) {
      query = query.eq('agent_name', agent)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createServerClient()

    const { agent_name, action, entity_type, input_data, approval_required_role } = body

    if (!agent_name || !action || !entity_type || !input_data) {
      return NextResponse.json(
        { error: 'agent_name, action, entity_type, input_data required' },
        { status: 400 }
      )
    }

    // Create order
    const { data: order, error: orderErr } = await supabase
      .from('ai_orders')
      .insert({
        agent_name,
        action,
        entity_type,
        input_data,
        status: 'pending',
        approval_required_role: approval_required_role || 'MANAGING_DIRECTOR',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (orderErr) throw orderErr

    // Create approval queue entry
    const { error: queueErr } = await supabase
      .from('approval_queue')
      .insert({
        order_id: order.id,
        approver_role: approval_required_role || 'MANAGING_DIRECTOR',
        status: 'pending',
        created_at: new Date().toISOString(),
      })

    if (queueErr) {
      await supabase.from('ai_orders').delete().eq('id', order.id)
      throw queueErr
    }

    return NextResponse.json(order, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
