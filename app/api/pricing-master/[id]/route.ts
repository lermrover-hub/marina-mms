import { NextRequest, NextResponse } from "next/server"
import { getPricingMasterById, updatePricingMaster } from "@/lib/pricing-master"
import { getPricingWriteAccess } from "@/lib/pricing-access"
import { pricingUpdateSchema, pricingValidationMessage, validatePricingTransition } from "@/lib/pricing-validation"
import { assertWetBerthUnavailable } from "@/lib/pricing-governance"

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
    const access = await getPricingWriteAccess()
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const parsed = pricingUpdateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: pricingValidationMessage(parsed.error) }, { status: 400 })
    }

    const current = await getPricingMasterById(id)
    if (!current) {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 })
    }
    for (const value of [parsed.data.category, parsed.data.serviceNameEn]) {
      try {
        assertWetBerthUnavailable(value)
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Wet berth is unavailable" }, { status: 400 })
      }
    }
    const transitionError = validatePricingTransition(current, parsed.data)
    if (transitionError) {
      return NextResponse.json({ error: transitionError }, { status: 400 })
    }

    // The edit form sends the current status along with other fields. Do not
    // recalculate is_active when the workflow status was not changed.
    const update = { ...parsed.data, priceStatus: parsed.data.priceStatus === current.priceStatus ? undefined : parsed.data.priceStatus }
    const approvedStatus = update.priceStatus ?? current.priceStatus
    const approvalRelevantChange = (["priceStatus", "quoteAllowed", "rateThb", "fullRateThb", "pilotRateThb", "calcType"] as const)
      .some((field) => parsed.data[field] !== undefined && parsed.data[field] !== current[field])

    const pricing = await updatePricingMaster(id, {
      ...update,
      updatedBy: access.actorId,
      approvedBy: approvalRelevantChange && (approvedStatus === "ACTIVE" || approvedStatus === "APPROVED" || approvedStatus.startsWith("APPROVED_")) ? access.actorId : undefined,
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
    const access = await getPricingWriteAccess()
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const pricing = await updatePricingMaster(id, {
      isActive: false,
      priceStatus: "INACTIVE",
      updatedBy: access.actorId,
      approvedBy: access.actorId,
    })

    if (!pricing) {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 })
    }

    return NextResponse.json({ data: pricing })
  } catch (error) {
    console.error("Error deleting pricing:", error)
    return NextResponse.json({ error: "Failed to delete pricing" }, { status: 500 })
  }
}
