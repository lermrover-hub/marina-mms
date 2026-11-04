import { z } from "zod"

export const catalogKinds = ["VESSEL_TYPE", "SERVICE_GROUP", "SERVICE"] as const
const optionalBound = z.number().finite().min(0).max(1000).nullable().default(null)
export const catalogFields = z.object({
  name_en: z.string().trim().min(1).max(160),
  name_th: z.string().trim().max(160).default(""),
  status: z.enum(["DRAFT", "ACTIVE", "RETIRED"]).default("DRAFT"),
  parent_id: z.string().uuid().nullable().default(null),
  pricing_id: z.string().uuid().nullable().default(null),
  description: z.string().trim().max(2000).default(""),
  loa_min_ft: optionalBound,
  loa_max_ft: optionalBound,
  engines_min: z.number().int().min(0).max(20).nullable().default(null),
  engines_max: z.number().int().min(0).max(20).nullable().default(null),
  usage: z.enum(["ANY", "PRIVATE", "COMMERCIAL"]).default("ANY"),
}).strict()

export const catalogCreate = catalogFields.extend({
  kind: z.enum(catalogKinds),
  code: z.string().regex(/^[A-Z][A-Z0-9_]{1,79}$/),
}).superRefine((v, ctx) => {
  for (const [min, max] of [["loa_min_ft", "loa_max_ft"], ["engines_min", "engines_max"]] as const) {
    if (v[min] !== null && v[max] !== null && v[min]! > v[max]!) ctx.addIssue({ code: "custom", path: [max], message: "Maximum must not be below minimum" })
  }
  if ((v.kind === "SERVICE") !== Boolean(v.parent_id)) ctx.addIssue({ code: "custom", path: ["parent_id"], message: "Only a service must have a service-group parent" })
  if (v.kind !== "SERVICE" && v.pricing_id) ctx.addIssue({ code: "custom", path: ["pricing_id"], message: "Only a child service can link a Rate Card item" })
  if (v.kind !== "VESSEL_TYPE" && (v.loa_min_ft !== null || v.loa_max_ft !== null || v.engines_min !== null || v.engines_max !== null || v.usage !== "ANY")) ctx.addIssue({ code: "custom", message: "Vessel eligibility belongs only to vessel types" })
})
// Full replacement of editable fields; stable code/kind cannot be changed.
export const catalogUpdate = catalogFields.extend({ expected_version: z.number().int().positive() }).strict()
export function catalogAdmin(role: unknown) { return role === "SUPER_ADMIN" }
export function catalogWritesEnabled(url: string | undefined, flag: string | undefined) {
  try { return flag === "true" && new URL(url ?? "").origin === "https://zanlunbgupdtqznruzok.supabase.co" } catch { return false }
}
