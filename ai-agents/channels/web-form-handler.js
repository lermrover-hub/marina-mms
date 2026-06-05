/**
 * Web Form / Staff Trigger Channel Handler
 * Receives structured requests from the marina-mms UI or staff CLI.
 */
import { dispatch } from "../orchestrator/ceo-agent.js"

/**
 * @param {object} form
 * @param {string} form.content       – free-text description or task
 * @param {string} [form.agentHint]   – force a specific route (skip classification)
 * @param {string} [form.customerId]
 * @param {string} [form.boatId]
 * @param {object} [form.params]
 */
export async function handleWebForm(form = {}) {
  console.log(`[WebForm] agentHint=${form.agentHint ?? "auto"} content="${String(form.content ?? "").slice(0, 60)}"`)

  return dispatch({
    source:     "web-form",
    content:    form.content ?? "",
    customerId: form.customerId,
    boatId:     form.boatId,
    agentHint:  form.agentHint,
    params:     form.params ?? {},
  })
}
