import { NextResponse } from "next/server"
import { getPricingWriteAccess } from "@/lib/pricing-access"
import { getPricingMasterHistory } from "@/lib/pricing-master"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await getPricingWriteAccess()
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  try {
    const { id } = await params
    const history = await getPricingMasterHistory(id)
    return NextResponse.json({ data: history })
  } catch (error) {
    console.error("Error fetching pricing history:", error)
    return NextResponse.json({ error: "Failed to fetch pricing history" }, { status: 500 })
  }
}
