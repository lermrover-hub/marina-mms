// Display coordinates only, measured against the approved 1448 x 1086 image.
// These are not berth allocation, capacity or geographic coordinates.
export type YardSlot = { code: string; x: number; y: number; width: number; height: number; angle: number }
export const YARD_SLOTS: YardSlot[] = [
  { code: "B1", x: 287, y: 230, width: 51, height: 160, angle: 0 },
  { code: "B2", x: 341, y: 230, width: 51, height: 160, angle: 0 },
  ...["W1", "W2", "W3"].map((code, i) => ({ code, x: 507 + i * 51, y: 401 + i * 7, width: 48, height: 76, angle: 8 })),
  { code: "W4", x: 546, y: 470, width: 150, height: 55, angle: 8 },
  ...Array.from({ length: 9 }, (_, i) => ({ code: `C${i + 1}`, x: 691 + i * 40, y: 412 + i * 5.5, width: 37, height: 125, angle: 8 })),
  ...Array.from({ length: 8 }, (_, i) => ({ code: `C${i + 10}`, x: 676 + i * 44, y: 590 + i * 6.5, width: 41, height: 105, angle: 9 })),
]
export function normalizedSlotCode(code: string) { return code.trim().toUpperCase().replace(/^([BCW])[- ]?0*(\d+)$/, "$1$2") }
