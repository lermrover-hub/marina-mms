import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/quotations - List all quotations
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customerId")
    const status = searchParams.get("status")

    const where: any = {}
    if (customerId) where.customerId = customerId
    if (status) where.status = status

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        customer: true,
        boat: true,
        items: true
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ data: quotations })
  } catch (error) {
    console.error("Error fetching quotations:", error)
    return NextResponse.json({ error: "Failed to fetch quotations" }, { status: 500 })
  }
}

// POST /api/quotations - Create new quotation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      customerId,
      boatId,
      quoteNumber,
      issueDate,
      validUntilDate,
      items,
      subtotal,
      discountAmount,
      discountPercent,
      taxAmount,
      totalAmount,
      depositRequired,
      notes,
      status = "DRAFT"
    } = body

    if (!customerId || !quoteNumber) {
      return NextResponse.json(
        { error: "Missing required fields: customerId, quoteNumber" },
        { status: 400 }
      )
    }

    const quotation = await prisma.quotation.create({
      data: {
        customerId,
        boatId: boatId || null,
        quoteNumber,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        validUntilDate: validUntilDate ? new Date(validUntilDate) : null,
        subtotal: parseFloat(String(subtotal || 0)),
        discountAmount: parseFloat(String(discountAmount || 0)),
        discountPercent: parseFloat(String(discountPercent || 0)),
        taxAmount: parseFloat(String(taxAmount || 0)),
        totalAmount: parseFloat(String(totalAmount || 0)),
        depositRequired: parseFloat(String(depositRequired || 0)),
        notes: notes || null,
        status,
        items: items
          ? {
              createMany: {
                data: items.map((item: any) => ({
                  description: item.description,
                  quantity: parseFloat(String(item.quantity || 1)),
                  unitPrice: parseFloat(String(item.unitPrice || 0)),
                  amount: parseFloat(String(item.amount || 0))
                }))
              }
            }
          : undefined
      },
      include: {
        customer: true,
        boat: true,
        items: true
      }
    })

    return NextResponse.json({ data: quotation }, { status: 201 })
  } catch (error) {
    console.error("Error creating quotation:", error)
    return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 })
  }
}
