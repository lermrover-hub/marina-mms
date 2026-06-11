/**
 * Agent Tool Call Logging & Approval Gate
 * All agent API calls go through this layer to:
 * 1. Create approval orders for high-risk writes
 * 2. Log tool calls for audit
 * 3. Check permissions before execution
 */

import { createServerClient } from './supabase-server'

interface ToolCallLog {
  agentName: string
  orderId?: string
  apiEndpoint: string
  method: string
  inputData?: Record<string, any>
  outputData?: Record<string, any>
  statusCode?: number
  errorMessage?: string
  durationMs?: number
}

interface CreateOrderOptions {
  agentName: string
  action: string
  entityType: string
  inputData: Record<string, any>
  approvalRole?: string
}

/**
 * Create an AI order for approval (instead of direct write)
 * Returns the created order so agent can track it
 */
export async function createApprovalOrder(opts: CreateOrderOptions) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('ai_orders')
    .insert({
      agent_name: opts.agentName,
      action: opts.action,
      entity_type: opts.entityType,
      input_data: opts.inputData,
      status: 'pending',
      approval_required_role: opts.approvalRole || 'MANAGING_DIRECTOR',
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  // Also create approval queue entry
  await supabase
    .from('approval_queue')
    .insert({
      order_id: data.id,
      approver_role: opts.approvalRole || 'MANAGING_DIRECTOR',
      status: 'pending',
      created_at: new Date().toISOString(),
    })

  return data
}

/**
 * Log a tool call for audit trail
 */
export async function logToolCall(log: ToolCallLog) {
  const supabase = createServerClient()

  try {
    const { error } = await supabase
      .from('ai_tool_calls')
      .insert({
        agent_name: log.agentName,
        order_id: log.orderId || null,
        api_endpoint: log.apiEndpoint,
        method: log.method,
        input_data: log.inputData || null,
        output_data: log.outputData || null,
        status_code: log.statusCode || null,
        error_message: log.errorMessage || null,
        duration_ms: log.durationMs || null,
        created_at: new Date().toISOString(),
      })
    if (error) console.warn('[agent-tools] Tool call log failed:', error.message)
  } catch (err: unknown) {
    console.warn('[agent-tools] Tool call log failed:', err instanceof Error ? err.message : String(err))
  }
}

/**
 * Check if agent can perform action
 * Returns permission record or null if not allowed
 */
export async function checkAgentPermission(agentName: string, action: string, entityType: string) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('ai_permissions')
    .select('*')
    .eq('agent_name', agentName)
    .eq('action', action)
    .eq('entity_type', entityType)
    .single()

  if (error) {
    // If permission not defined, deny by default
    console.warn(`[agent-tools] No permission found for ${agentName} ${action} ${entityType}`)
    return null
  }

  return data
}

/**
 * Check if amount exceeds approval threshold
 */
export function exceedsApprovalThreshold(amount: number, maxAmount?: number): boolean {
  if (!maxAmount) return false // No threshold = always needs approval
  return amount > maxAmount
}

/**
 * Validate quotation data before creating approval order
 */
export function validateQuotationInput(input: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!input.customer_id) errors.push('customer_id required')
  if (!input.title) errors.push('title required')
  if (typeof input.grand_total !== 'number' || input.grand_total < 0) {
    errors.push('grand_total must be a positive number')
  }
  if (input.tax_rate && (input.tax_rate < 0 || input.tax_rate > 100)) {
    errors.push('tax_rate must be 0-100')
  }
  if (input.deposit_pct && (input.deposit_pct < 0 || input.deposit_pct > 100)) {
    errors.push('deposit_pct must be 0-100')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate invoice data before creating approval order
 */
export function validateInvoiceInput(input: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!input.customer_id) errors.push('customer_id required')
  if (!input.invoice_number) errors.push('invoice_number required')
  if (typeof input.total_amount !== 'number' || input.total_amount < 0) {
    errors.push('total_amount must be a positive number')
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    errors.push('items array required and non-empty')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
