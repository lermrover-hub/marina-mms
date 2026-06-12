/**
 * HR Agent - L2 Specialist.
 * Drafts job descriptions, KPI reports, SOPs, and onboarding checklists.
 */
import { ask, askJson } from "../lib/claude-client.js"
import { loadPrompt } from "../lib/load-prompt.js"
import { getAgentConfig } from "../lib/agent-config.js"

const SYSTEM = loadPrompt("hr-agent-system", `You are an HR specialist for a marina and boat yard in Ko Samui, Thailand.
You draft professional HR documents in English (with Thai translations when requested).
Always be concise, practical, and tailored to marina/boat yard operations.

FORBIDDEN - you must NEVER:
- Issue, confirm, or terminate any employment contract
- Disclose individual staff salary, performance rating, or disciplinary record
- Make hiring or firing decisions
- Send any document directly to staff (drafts only - management reviews before use)
- Include real staff names in documents unless explicitly provided by the requester`)

export async function run({ content = "", task, role, language = "en" } = {}) {
  const cfg = await getAgentConfig("hr")
  const effectiveLanguage = language === "en" ? cfg.default_language : language
  const systemPrompt = `${SYSTEM}\n${cfg.extra_instructions || ""}`.trim()

  console.log("[HRAgent] Starting...")
  if (!content && !task) {
    console.log("[HRAgent] No task or content - skipping scheduled run.")
    return { task: "skipped", reason: "no_input" }
  }

  const selectedTask = task ?? inferTask(content)
  console.log(`[HRAgent] Task: ${selectedTask}`)

  switch (selectedTask) {
    case "jd": return runJD(role ?? content, effectiveLanguage, systemPrompt)
    case "kpi": return runKPI(role ?? content, Number(cfg.max_kpis), systemPrompt)
    case "sop": return runSOP(content, systemPrompt)
    case "onboard": return runOnboard(role ?? content, Number(cfg.onboarding_days), systemPrompt)
    default: return runGeneral(content, systemPrompt)
  }
}

function inferTask(text) {
  const value = text.toLowerCase()
  if (value.includes("job description") || value.includes("jd") || value.includes("hire")) return "jd"
  if (value.includes("kpi") || value.includes("performance")) return "kpi"
  if (value.includes("sop") || value.includes("procedure") || value.includes("process")) return "sop"
  if (value.includes("onboard") || value.includes("new staff")) return "onboard"
  return "general"
}

async function runJD(role, language, systemPrompt) {
  const result = await ask(
    systemPrompt,
    `Draft a Job Description for: ${role}\nMarina & Boat Yard context. Include: title, summary, responsibilities (8-10 bullets), qualifications, working conditions. Language: ${language}.`,
    { maxTokens: 1200 }
  )
  return { task: "jd", role, document: result }
}

async function runKPI(role, maxKpis, systemPrompt) {
  const result = await askJson(
    systemPrompt,
    `Create a KPI framework for: ${role} at a marina/boat yard.
Return JSON: { "role": "...", "kpis": [{ "name": "...", "target": "...", "measure": "...", "weight": 10 }] }
Include no more than ${maxKpis} KPIs. Weights must sum to 100.`
  )
  return { task: "kpi", role, kpis: result }
}

async function runSOP(topic, systemPrompt) {
  const result = await ask(
    systemPrompt,
    `Write an SOP for: ${topic}\nFormat: Purpose, Scope, Responsibilities, Step-by-step procedure, Safety notes. Practical and concise.`,
    { maxTokens: 1200 }
  )
  return { task: "sop", topic, document: result }
}

async function runOnboard(role, onboardingDays, systemPrompt) {
  const result = await askJson(
    systemPrompt,
    `Create a ${onboardingDays}-day onboarding checklist for: ${role} at a marina/boat yard.
Return JSON: { "role": "...", "weeks": [{ "week": 1, "theme": "...", "tasks": ["..."] }] }`
  )
  return { task: "onboard", role, plan: result }
}

async function runGeneral(content, systemPrompt) {
  const result = await ask(systemPrompt, content, { maxTokens: 800 })
  return { task: "general", response: result }
}
