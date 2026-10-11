export type StorageClass = "SB1" | "SB2" | "SB3" | "SB4"
export type StorageSlot = "ANY_APPROVED" | "W4" | "B1"
export type StorageMethod = "TRAILER" | "BOAT_STANDS"

export type StorageRate = { code: string; rateThb: number; fullRateThb?: number | null; unit?: string }
export type StoragePackageLine = StorageRate & { days: 1 | 7 | 30; qty: number; total: number }

export function speedboatStorageClass(loaFt: number): StorageClass {
  if (!Number.isFinite(loaFt) || loaFt <= 0) throw new Error("A valid speedboat LOA is required for storage pricing.")
  if (loaFt <= 27) return "SB1"
  if (loaFt <= 40) return "SB2"
  if (loaFt <= 47) return "SB3"
  if (loaFt <= 60) return "SB4"
  throw new Error("Speedboats over 60 ft are outside the configured v3.6 storage range.")
}

export function storageRateCodes(storageClass: StorageClass, slot?: StorageSlot | null): string[] {
  const prefix = storageClass === "SB4" ? `SB4_${validateSb4Slot(slot)}` : `${storageClass}_STORAGE`
  return [`${prefix}_DAY`, `${prefix}_WEEK`, `${prefix}_MONTH`]
}

export function validateSb4Storage(slot?: StorageSlot | null, method?: StorageMethod | null): "W4" | "B1" {
  const validSlot = validateSb4Slot(slot)
  if (validSlot === "W4" && method !== "TRAILER") throw new Error("W4 permits trailer storage only; boat stands are not allowed.")
  if (validSlot === "B1" && method !== "BOAT_STANDS") throw new Error("B1 is the designated boat-stand slot for SB4 storage.")
  return validSlot
}

function validateSb4Slot(slot?: StorageSlot | null): "W4" | "B1" {
  if (slot !== "W4" && slot !== "B1") throw new Error("SB4 storage requires physical slot W4 or B1.")
  return slot
}

function periodDaysFromCode(code: string): 1 | 7 | 30 {
  if (code.endsWith("_DAY")) return 1
  if (code.endsWith("_WEEK")) return 7
  if (code.endsWith("_MONTH")) return 30
  throw new Error(`Unsupported storage package code: ${code}`)
}

export function lowestStoragePackage(days: number, rates: StorageRate[]): StoragePackageLine[] {
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("Storage duration must be a whole number from 1 to 3650 days.")
  const packages = rates.map((rate) => ({ ...rate, days: periodDaysFromCode(rate.code) }))
  if (![1, 7, 30].every((period) => packages.some((item) => item.days === period))) throw new Error("The approved daily, weekly, and monthly storage rates are required.")
  const best: Array<{ total: number; counts: number[] } | null> = Array(days + 1).fill(null)
  best[0] = { total: 0, counts: packages.map(() => 0) }
  for (let duration = 1; duration <= days; duration += 1) {
    for (let index = 0; index < packages.length; index += 1) {
      const item = packages[index]
      const previous = duration >= item.days ? best[duration - item.days] : null
      if (!previous) continue
      const candidate = { total: previous.total + item.rateThb, counts: [...previous.counts] }
      candidate.counts[index] += 1
      if (!best[duration] || candidate.total < best[duration]!.total) best[duration] = candidate
    }
  }
  const solution = best[days]
  if (!solution) throw new Error(`No exact approved package combination covers ${days} days.`)
  return packages.map((item, index) => ({ ...item, qty: solution.counts[index], total: solution.counts[index] * item.rateThb })).filter((item) => item.qty > 0).sort((left, right) => right.days - left.days)
}
