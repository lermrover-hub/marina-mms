import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { getPricingMaster } from "@/lib/pricing-master"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 }
    )
  }

  try {
    const body = await req.json()
    const {
      boatName,
      boatType,
      loa,
      beam,
      draft,
      serviceDescription,
    } = body

    if (!serviceDescription) {
      return NextResponse.json({ error: "serviceDescription is required." }, { status: 400 })
    }

    // Load active pricing master items as context for Claude
    const pricingItems = await getPricingMaster(null, true)
    const rateCardText = pricingItems
      .map((p) => `${p.code} | ${p.serviceNameEn} | category: ${p.category} | ${p.rateThb} THB/${p.unit}`)
      .join("\n")

    const boatInfo = [
      boatName ? `Boat name: ${boatName}` : null,
      boatType ? `Boat type: ${boatType}` : null,
      loa ? `LOA: ${loa} ft` : null,
      beam ? `Beam: ${beam} ft` : null,
      draft ? `Draft: ${draft} m` : null,
    ]
      .filter(Boolean)
      .join(", ")

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a quotation assistant for a marina and boat yard in Ko Samui, Thailand.

Boat information:
${boatInfo || "Not specified"}

Customer request:
${serviceDescription}

Available rate card (use these codes and prices where applicable):
${rateCardText || "No rate card items available — use standard estimates."}

Generate a quotation line items list for this job. Return ONLY a valid JSON array, no explanation, no markdown.

Each item must follow this exact format:
[
  {
    "description": "string",
    "category": "string",
    "unit": "string",
    "qty": number,
    "unitPrice": number
  }
]

Rules:
- Match items to rate card codes where possible (use the exact price from the rate card)
- For labour, estimate hours realistically based on the job scope
- For materials, add as separate line items with estimated cost
- category must be one of: Engine, Electrical, Fiberglass, Painting, Antifouling, Interior, Canvas, Stainless / Metal, Cleaning, Plumbing, Generator, Air Conditioning, Ramp Access, Haul-out, Yard Services, Wash & Cleaning, Utilities, Wet Berth, Labour, Material, Other
- Return 3–10 line items maximum
- All prices in THB, no VAT included`,
        },
      ],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text : ""

    // Extract JSON array from the response
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI returned an unexpected format. Please try again." }, { status: 502 })
    }

    const items: unknown = JSON.parse(jsonMatch[0])
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "AI returned an invalid items list." }, { status: 502 })
    }

    return NextResponse.json({ items })
  } catch (err) {
    console.error("AI generate error:", err)
    return NextResponse.json({ error: "AI generation failed. Check server logs." }, { status: 500 })
  }
}
