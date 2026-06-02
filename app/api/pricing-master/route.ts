import { NextRequest, NextResponse } from "next/server"
import { createPricingMaster, getPricingMaster } from "@/lib/pricing-master"

export const dynamic = "force-dynamic"

// GET /api/pricing-master - List all pricing
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const isActive = searchParams.get("isActive") === "true"

    const pricing = await getPricingMaster(category, isActive)

    return NextResponse.json({ data: pricing })
  } catch (error) {
    console.error("Error fetching pricing:", error)
    return NextResponse.json({ error: "Failed to fetch pricing" }, { status: 500 })
  }
}

// POST /api/pricing-master - Create new pricing
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, serviceNameEn, serviceNameTh, category, unit, rateThb, description, notes } = body

    if (!code || !serviceNameEn || !category || !unit || rateThb === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const pricing = await createPricingMaster({
      code,
      serviceNameEn,
      serviceNameTh,
      category,
      unit,
      rateThb,
      description,
      notes,
    })

    return NextResponse.json({ data: pricing }, { status: 201 })
  } catch (error) {
    console.error("Error creating pricing:", error)
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : ""
    if (code === "23505") {
      return NextResponse.json({ error: "Code already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create pricing" }, { status: 500 })
  }
}
