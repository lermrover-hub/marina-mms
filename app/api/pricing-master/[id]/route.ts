import { NextRequest, NextResponse } from "next/server"
import { getPricingMasterById, updatePricingMaster } from "@/lib/pricing-master"

export const dynamic = "force-dynamic"

// GET /api/pricing-master/:id - Get single pricing
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const pricing = await getPricingMasterById(id)

    if (!pricing) {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 })
    }

    return NextResponse.json({ data: pricing })
  } catch (error) {
    console.error("Error fetching pricing:", error)
    return NextResponse.json({ error: "Failed to fetch pricing" }, { status: 500 })
  }
}

// PATCH /api/pricing-master/:id - Update pricing
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await req.json()
    const { serviceNameEn, serviceNameTh, category, unit, rateThb, pilotRateThb, pilotNotes, description, notes, isActive } = body

    const pricing = await updatePricingMaster(id, {
      serviceNameEn,
      serviceNameTh,
      category,
      unit,
      rateThb,
      pilotRateThb,
      pilotNotes,
      description,
      notes,
      isActive,
    })

    if (!pricing) {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 })
    }

    return NextResponse.json({ data: pricing })
  } catch (error) {
    console.error("Error updating pricing:", error)
    return NextResponse.json({ error: "Failed to update pricing" }, { status: 500 })
  }
}

// DELETE /api/pricing-master/:id - Delete pricing (soft delete via isActive)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const pricing = await updatePricingMaster(id, { isActive: false })

    if (!pricing) {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 })
    }

    return NextResponse.json({ data: pricing })
  } catch (error) {
    console.error("Error deleting pricing:", error)
    return NextResponse.json({ error: "Failed to delete pricing" }, { status: 500 })
  }
}
