import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const SKIP_CLAUDE = process.env.AI_AGENT_SKIP_CLAUDE === "true"

export async function ask(
  systemPrompt,
  userMessage,
  { maxTokens = 1024, model = "claude-sonnet-4-6" } = {}
) {
  if (SKIP_CLAUDE) {
    return "Dry-run AI response: workflow reached the Claude step successfully."
  }

  const msg = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  })
  return msg.content[0].type === "text" ? msg.content[0].text : ""
}

export async function askJson(systemPrompt, userMessage, opts = {}) {
  if (SKIP_CLAUDE) {
    return {
      title: "Dry-run quotation",
      notes: "Generated during workflow verification. No data was written.",
      items: [
        {
          pricingCode: "CUSTOM",
          description: "Dry-run service item",
          category: "Test",
          unit: "item",
          qty: 1,
          unitPrice: 1,
          requiresApproval: true,
        },
      ],
    }
  }

  const raw = await ask(systemPrompt, userMessage, { maxTokens: 2048, ...opts })
  const match = raw.match(/```json\s*([\s\S]*?)```/) ?? raw.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
  if (!match) throw new Error(`Claude did not return valid JSON.\nRaw: ${raw.slice(0, 300)}`)
  return JSON.parse(match[1] ?? match[0])
}
