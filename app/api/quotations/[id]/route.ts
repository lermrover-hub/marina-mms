import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/quotations/:id - Get single quotation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        boat: true,
        items: true
      }
    })

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 })
    }

    return NextResponse.json({ data: quotation })
  } catch (error) {
    console.error("Error fetching quotation:", error)
    return NextResponse.json({ error: "Failed to fetch quotation" }, { status: 500 })
  }
}

// PATCH /api/quotations/:id - Update quotation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await req.json()
    const {
      quoteNumber,
      issueDate,
      validUntilDate,
      subtotal,
      discountAmount,
      discountPercent,
      taxAmount,
      totalAmount,
      depositRequired,
      notes,
      status
    } = body

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        ...(quoteNumber && { quoteNumber }),
        ...(issueDate && { issueDate: new Date(issueDate) }),
        ...(validUntilDate && { validUntilDate: new Date(validUntilDate) }),
        ...(subtotal !== undefined && { subtotal: parseFloat(String(subtotal)) }),
        ...(discountAmount !== undefined && { discountAmount: parseFloat(String(discountAmount)) }),
        ...(discountPercent !== undefined && { discountPercent: parseFloat(String(discountPercent)) }),
        ...(taxAmount !== undefined && { taxAmount: parseFloat(String(taxAmount)) }),
        ...(totalAmount !== undefined && { totalAmount: parseFloat(String(totalAmount)) }),
        ...(depositRequired !== undefined && { depositRequired: parseFloat(String(depositRequired)) }),
        ...(notes !== undefined && { notes }),
        ...(status && { status })
      },
      include: {
        customer: true,
        boat: true,
        items: true
      }
    })

    return NextResponse.json({ data: quotation })
  } catch (error) {
    console.error("Error updating quotation:", error)
    return NextResponse.json({ error: "Failed to update quotation" }, { status: 500 })
  }
}

// DELETE /api/quotations/:id - Delete quotation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const quotation = await prisma.quotation.delete({
      where: { id }
    })

    return NextResponse.json({ data: quotation })
  } catch (error) {
    console.error("Error deleting quotation:", error)
    return NextResponse.json({ error: "Failed to delete quotation" }, { status: 500 })
  }
}
