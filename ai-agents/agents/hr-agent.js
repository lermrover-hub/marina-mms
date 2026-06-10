/**
 * HR Agent — L2 Specialist
 * Drafts Job Descriptions, KPI reports, SOPs, onboarding checklists.
 */
import { ask, askJson } from "../lib/claude-client.js"

const SYSTEM = `You are an HR specialist for a marina and boat yard in Ko Samui, Thailand.
You draft professional HR documents in English (with Thai translations when requested).
Always be concise, practical, and tailored to marina/boat yard operations.

FORBIDDEN — you must NEVER:
- Issue, confirm, or terminate any employment contract
- Disclose individual staff salary, performance rating, or disciplinary record
- Make hiring or firing decisions
- Send any document directly to staff (drafts only — management reviews before use)
- Include real staff names in documents unless explicitly provided by the requester`

export async function run({ content = "", task, role, language = "en" } = {}) {
  console.log("[HRAgent] Starting…")
  if (!content && !task) {
    console.log("[HRAgent] No task or content — skipping scheduled run.")
    return { task: "skipped", reason: "no_input" }
  }
  const t = task ?? inferTask(content)
  console.log(`[HRAgent] Task: ${t}`)

  switch (t) {
    case "jd":       return runJD(role ?? content, language)
    case "kpi":      return runKPI(role ?? content)
    case "sop":      return runSOP(content)
    case "onboard":  return runOnboard(role ?? content)
    default:         return runGeneral(content)
  }
}

function inferTask(text) {
  const t = text.toLowerCase()
  if (t.includes("job description") || t.includes("jd") || t.includes("hire")) return "jd"
  if (t.includes("kpi") || t.includes("performance")) return "kpi"
  if (t.includes("sop") || t.includes("procedure") || t.includes("process")) return "sop"
  if (t.includes("onboard") || t.includes("new staff")) return "onboard"
  return "general"
}

async function runJD(role, language) {
  const result = await ask(SYSTEM,
    `Draft a Job Description for: ${role}\nMarina & Boat Yard context. Include: title, summary, responsibilities (8–10 bullets), qualifications, working conditions. Language: ${language}.`,
    { maxTokens: 1200 }
  )
  console.log("[HRAgent] JD drafted.")
  return { task: "jd", role, document: result }
}

async function runKPI(role) {
  const result = await askJson(SYSTEM,
    `Create a KPI framework for: ${role} at a marina/boat yard.
Return JSON: { "role": "...", "kpis": [{ "name": "...", "target": "...", "measure": "...", "weight": 10 }] }
Include 6–8 KPIs. Weights must sum to 100.`
  )
  console.log("[HRAgent] KPI drafted.")
  return { task: "kpi", role, kpis: result }
}

async function runSOP(topic) {
  const result = await ask(SYSTEM,
    `Write an SOP for: ${topic}\nFormat: Purpose, Scope, Responsibilities, Step-by-step procedure, Safety notes. Practical and concise.`,
    { maxTokens: 1200 }
  )
  console.log("[HRAgent] SOP drafted.")
  return { task: "sop", topic, document: result }
}

async function runOnboard(role) {
  const result = await askJson(SYSTEM,
    `Create a 30-day onboarding checklist for: ${role} at a marina/boat yard.
Return JSON: { "role": "...", "weeks": [{ "week": 1, "theme": "...", "tasks": ["..."] }] }`
  )
  console.log("[HRAgent] Onboarding plan drafted.")
  return { task: "onboard", role, plan: result }
}

async function runGeneral(content) {
  const result = await ask(SYSTEM, content, { maxTokens: 800 })
  return { task: "general", response: result }
}
