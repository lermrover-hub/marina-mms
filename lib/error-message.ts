export function toErrorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message.trim()) return value.message
  if (typeof value === "string" && value.trim()) return value

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    for (const key of ["error", "message", "details", "hint"]) {
      const candidate = record[key]
      if (candidate instanceof Error && candidate.message.trim()) return candidate.message
      if (typeof candidate === "string" && candidate.trim()) return candidate
      if (candidate && typeof candidate === "object") {
        const nestedMessage = (candidate as Record<string, unknown>).message
        if (typeof nestedMessage === "string" && nestedMessage.trim()) return nestedMessage
      }
    }
  }

  return fallback
}
