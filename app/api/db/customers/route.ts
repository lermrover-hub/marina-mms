import { NextResponse } from "next/server"
import { getCustomers, createCustomer } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const data = await getCustomers()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = await createCustomer(body)
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
