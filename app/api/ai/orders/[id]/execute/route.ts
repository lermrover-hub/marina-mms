/**
 * Execute Approved AI Order
 * POST /api/ai/orders/:id/execute
 *
 * This endpoint is called AFTER an order is approved.
 * It takes the input_data from the order and actually creates the entity.
 * Only works if order status = 'approved'
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerClient()

    // Get the order
    const { data: order, error: orderErr } = await supabase
      .from('ai_orders')
      .select('*')
      .eq('id', id)
      .single()

    if (orderErr) throw orderErr
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check status is approved
    if (order.status !== 'approved') {
      return NextResponse.json(
        { error: `Order status is ${order.status}, must be 'approved' to execute` },
        { status: 400 }
      )
    }

    let entityId: string | undefined
    let result: any

    // Execute based on action type
    if (order.action === 'create_quotation' && order.entity_type === 'quotation') {
      result = await executeCreateQuotation(supabase, order)
      entityId = result.id
    } else if (order.action === 'create_invoice' && order.entity_type === 'invoice') {
      result = await executeCreateInvoice(supabase, order)
      entityId = result.id
    } else {
      return NextResponse.json(
        { error: `Unknown action: ${order.action}` },
        { status: 400 }
      )
    }

    // Update order with entity_id and mark executed
    await supabase
      .from('ai_orders')
      .update({
        entity_id: entityId,
        status: 'executed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({ success: true, order_id: id, entity_id: entityId, entity: result })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

async function executeCreateQuotation(supabase: any, order: any) {
  const input = order.input_data

  const quoteNumber = input.quote_number || `QT-${Date.now().toString().slice(-6)}`

  const { data, error } = await supabase
    .from('mms_quotations')
    .insert({
      quote_number: quoteNumber,
      customer_id: input.customer_id,
      boat_id: input.boat_id || null,
      sr_id: input.service_request_id || null,
      title: input.title || null,
      status: 'DRAFT',
      subtotal: input.subtotal || 0,
      discount: input.discount_amount || 0,
      vat_amount: input.tax_amount || 0,
      total_amount: input.grand_total || 0,
      deposit_amount: input.deposit_req || 0,
      valid_until: input.valid_until || null,
      notes: input.notes || null,
      generated_by: 'ai-agent',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  if (Array.isArray(input.items) && input.items.length > 0) {
    const items = input.items.map((item: any, idx: number) => ({
      quotation_id: data.id,
      description: item.description || '',
      qty: Number(item.qty) || 1,
      unit: item.unit || 'item',
      unit_price: Number(item.unitPrice) || 0,
      discount_pct: 0,
      taxable: (input.tax_amount || 0) > 0,
      sort_order: idx + 1,
    }))

    const { error: itemErr } = await supabase
      .from('mms_quotation_items')
      .insert(items)

    if (itemErr) {
      await supabase.from('mms_quotations').delete().eq('id', data.id)
      throw itemErr
    }
  }

  return data
}

async function executeCreateInvoice(supabase: any, order: any) {
  const input = order.input_data

  const invoiceNumber = input.invoice_number || `INV-${Date.now().toString().slice(-6)}`
  const totalAmount = Number(input.total_amount || input.grand_total || 0)

  const { data, error } = await supabase
    .from('mms_invoices')
    .insert({
      invoice_number: invoiceNumber,
      customer_id: input.customer_id,
      boat_id: input.boat_id || null,
      quotation_id: input.quotation_id || null,
      status: 'DRAFT',
      subtotal: Number(input.subtotal || 0),
      discount: Number(input.discount_amount || 0),
      vat_amount: Number(input.vat_amount || input.tax_amount || 0),
      total_amount: totalAmount,
      paid_amount: 0,
      outstanding_balance: totalAmount,
      due_date: input.due_date || null,
      notes: input.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  if (Array.isArray(input.items) && input.items.length > 0) {
    const items = input.items.map((item: any, idx: number) => ({
      invoice_id: data.id,
      description: item.description || '',
      category: item.category || null,
      qty: Number(item.qty) || 1,
      unit: item.unit || 'item',
      unit_price: Number(item.unit_price || item.unitPrice || 0),
      discount_pct: 0,
      taxable: (input.vat_amount || input.tax_amount || 0) > 0,
      sort_order: idx + 1,
    }))

    const { error: itemErr } = await supabase
      .from('mms_invoice_items')
      .insert(items)

    if (itemErr) {
      await supabase.from('mms_invoices').delete().eq('id', data.id)
      throw itemErr
    }
  }

  return data
}
