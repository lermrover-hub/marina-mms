import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET /api/pricing-master - List all pricing
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const isActive = searchParams.get("isActive") === "true"

    const where = {
      ...(category && { category: { contains: category, mode: "insensitive" as const } }),
      ...(isActive && { isActive: true })
    }

    const pricing = await prisma.pricingMaster.findMany({
      where,
      orderBy: { code: "asc" }
    })

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

    const pricing = await prisma.pricingMaster.create({
      data: {
        code,
        serviceNameEn,
        serviceNameTh,
        category,
        unit,
        rateThb: parseFloat(rateThb),
        description,
        notes,
        isActive: true
      }
    })

    return NextResponse.json({ data: pricing }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating pricing:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Code already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create pricing" }, { status: 500 })
  }
}
