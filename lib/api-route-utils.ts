import { NextResponse } from "next/server"

export function apiServerError(scope: string, error: unknown) {
  console.error(`[${scope}]`, error)
  return NextResponse.json({ error: "Server operation failed" }, { status: 500 })
}

export function pickFields(body: Record<string, unknown>, fields: readonly string[]) {
  return Object.fromEntries(fields.filter((field) => Object.prototype.hasOwnProperty.call(body, field)).map((field) => [field, body[field]]))
}

export function finiteNonNegative(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}
