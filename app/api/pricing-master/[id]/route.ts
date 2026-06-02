import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET /api/pricing-master/:id - Get single pricing
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const pricing = await prisma.pricingMaster.findUnique({
      where: { id }
    })

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
    const { serviceNameEn, serviceNameTh, category, unit, rateThb, description, notes, isActive } = body

    const pricing = await prisma.pricingMaster.update({
      where: { id },
      data: {
        ...(serviceNameEn && { serviceNameEn }),
        ...(serviceNameTh && { serviceNameTh }),
        ...(category && { category }),
        ...(unit && { unit }),
        ...(rateThb !== undefined && { rateThb: parseFloat(rateThb) }),
        ...(description !== undefined && { description }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json({ data: pricing })
  } catch (error: any) {
    console.error("Error updating pricing:", error)
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 })
    }
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
    const pricing = await prisma.pricingMaster.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ data: pricing })
  } catch (error: any) {
    console.error("Error deleting pricing:", error)
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 })
    }
    return NextResponse.json({ error: "Failed to delete pricing" }, { status: 500 })
  }
}
