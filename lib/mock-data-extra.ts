// =============================================================================
// SESSION 7–11 MOCK DATA  (auto-merged into mock-data.ts)
// =============================================================================

// ─── Inventory Items ──────────────────────────────────────────────────────────
export const mockInventoryItems = [
  { id: "inv-item-001", itemCode: "ENG-OIL-15W40",  name: "Engine Oil 15W-40",           category: "Engine",     unit: "L",    onHand: 48,  minStock: 20, avgCost: 95,   sellingPrice: 150,  supplier: "PTT Lubricants",    chargeToCustomer: true, status: "OK"  },
  { id: "inv-item-002", itemCode: "ENG-IMPELLER",    name: "Impeller — Jabsco 18000",     category: "Engine",     unit: "pc",   onHand: 4,   minStock: 5,  avgCost: 1800, sellingPrice: 2800, supplier: "Marine Parts Asia",  chargeToCustomer: true, status: "LOW" },
  { id: "inv-item-003", itemCode: "ENG-ZINCANODE",   name: "Zinc Anode 1kg",              category: "Engine",     unit: "pc",   onHand: 22,  minStock: 10, avgCost: 280,  sellingPrice: 450,  supplier: "Marine Parts Asia",  chargeToCustomer: true, status: "OK"  },
  { id: "inv-item-004", itemCode: "PAINT-AF-JOTUN",  name: "Antifouling — Jotun SeaQ",   category: "Paint",      unit: "L",    onHand: 60,  minStock: 30, avgCost: 420,  sellingPrice: 680,  supplier: "Jotun Thailand",     chargeToCustomer: true, status: "OK"  },
  { id: "inv-item-005", itemCode: "PAINT-PRIMER",    name: "Epoxy Primer — Hempel",       category: "Paint",      unit: "L",    onHand: 12,  minStock: 15, avgCost: 380,  sellingPrice: 580,  supplier: "Hempel Thailand",    chargeToCustomer: true, status: "LOW" },
  { id: "inv-item-006", itemCode: "ELEC-CABLE-4SQ",  name: "Marine Cable 4mm2",           category: "Electrical", unit: "m",    onHand: 200, minStock: 50, avgCost: 45,   sellingPrice: 75,   supplier: "Thai Electric",      chargeToCustomer: true, status: "OK"  },
  { id: "inv-item-007", itemCode: "ELEC-FUSE-60A",   name: "ATO Fuse 60A",                category: "Electrical", unit: "pc",   onHand: 30,  minStock: 20, avgCost: 25,   sellingPrice: 45,   supplier: "Thai Electric",      chargeToCustomer: true, status: "OK"  },
  { id: "inv-item-008", itemCode: "FG-RESIN-ISO",    name: "Isophthalic Resin 20kg",      category: "Fiberglass", unit: "kg",   onHand: 80,  minStock: 40, avgCost: 95,   sellingPrice: 145,  supplier: "Chomthong FRP",      chargeToCustomer: true, status: "OK"  },
  { id: "inv-item-009", itemCode: "FG-CLOTH-450",    name: "Fiberglass Cloth 450g",       category: "Fiberglass", unit: "m2",   onHand: 50,  minStock: 20, avgCost: 85,   sellingPrice: 130,  supplier: "Chomthong FRP",      chargeToCustomer: true, status: "OK"  },
  { id: "inv-item-010", itemCode: "CLEAN-POLISH",    name: "Marine Polish — 3M RP64",     category: "Cleaning",   unit: "L",    onHand: 8,   minStock: 10, avgCost: 450,  sellingPrice: 700,  supplier: "3M Thailand",        chargeToCustomer: true, status: "LOW" },
  { id: "inv-item-011", itemCode: "CLEAN-TEAK-OIL",  name: "Teak Oil 1L",                 category: "Cleaning",   unit: "L",    onHand: 15,  minStock: 8,  avgCost: 280,  sellingPrice: 420,  supplier: "Star Brite",         chargeToCustomer: true, status: "OK"  },
  { id: "inv-item-012", itemCode: "MEC-GLAND-30",    name: "Shaft Seal Gland 30mm",       category: "Mechanical", unit: "pc",   onHand: 3,   minStock: 5,  avgCost: 2200, sellingPrice: 3500, supplier: "Marine Parts Asia",  chargeToCustomer: true, status: "LOW" },
  { id: "inv-item-013", itemCode: "SAFETY-FLARE",    name: "Distress Flare Kit",          category: "Safety",     unit: "set",  onHand: 6,   minStock: 4,  avgCost: 1200, sellingPrice: 1800, supplier: "Marine Safety TH",   chargeToCustomer: true, status: "OK"  },
  { id: "inv-item-014", itemCode: "MISC-SEALANT",    name: "Marine Sealant Sikaflex",     category: "Misc",       unit: "tube", onHand: 24,  minStock: 12, avgCost: 180,  sellingPrice: 280,  supplier: "Sika Thailand",      chargeToCustomer: true, status: "OK"  },
  { id: "inv-item-015", itemCode: "ENG-FILTER-OIL",  name: "Oil Filter — Volvo Penta",   category: "Engine",     unit: "pc",   onHand: 0,   minStock: 6,  avgCost: 850,  sellingPrice: 1300, supplier: "Volvo Penta TH",     chargeToCustomer: true, status: "OUT" },
]

// ─── Stock movements (keyed by item id) ──────────────────────────────────────
export const mockStockMovements: Record<string, Array<{
  id: string; type: "IN" | "OUT" | "ADJUST"; qty: number; balance: number
  date: string; ref: string; note: string
}>> = {
  "inv-item-001": [
    { id: "sm-001-1", type: "IN",  qty: 50, balance: 98, date: "2026-05-01", ref: "PO-2026-011", note: "Purchase order delivery" },
    { id: "sm-001-2", type: "OUT", qty: 20, balance: 78, date: "2026-05-08", ref: "WO-2026-031", note: "Issued to Work Order — Blue Horizon I engine service" },
    { id: "sm-001-3", type: "OUT", qty: 10, balance: 68, date: "2026-05-12", ref: "WO-2026-032", note: "Issued to Work Order — Sea Hawk AC" },
    { id: "sm-001-4", type: "OUT", qty: 20, balance: 48, date: "2026-05-18", ref: "WO-2026-035", note: "Issued to Work Order — Nordic Star" },
  ],
  "inv-item-002": [
    { id: "sm-002-1", type: "IN",  qty: 6,  balance: 10, date: "2026-04-15", ref: "PO-2026-009", note: "Purchase order delivery" },
    { id: "sm-002-2", type: "OUT", qty: 3,  balance: 7,  date: "2026-04-22", ref: "WO-2026-028", note: "Issued — Blue Dream cooling system" },
    { id: "sm-002-3", type: "OUT", qty: 3,  balance: 4,  date: "2026-05-10", ref: "WO-2026-031", note: "Issued to engine overhaul" },
  ],
  "inv-item-015": [
    { id: "sm-015-1", type: "IN",  qty: 10, balance: 10, date: "2026-03-01", ref: "PO-2026-005", note: "Initial stock" },
    { id: "sm-015-2", type: "OUT", qty: 6,  balance: 4,  date: "2026-03-20", ref: "WO-2026-021", note: "Issued — multiple work orders" },
    { id: "sm-015-3", type: "OUT", qty: 4,  balance: 0,  date: "2026-05-05", ref: "WO-2026-030", note: "Last units — Blue Horizon I" },
  ],
}

// ─── Purchase Requests ────────────────────────────────────────────────────────
export const mockPurchaseRequests = [
  { id: "pr-001", prNumber: "PR-2026-015", requestedBy: "Somchai T.",    date: "2026-05-17", status: "PENDING",  supplier: "Volvo Penta TH",   total: 12750, items: 2, notes: "Urgent — out of stock oil filter" },
  { id: "pr-002", prNumber: "PR-2026-014", requestedBy: "Nattapong K.", date: "2026-05-15", status: "APPROVED", supplier: "Marine Parts Asia", total: 28600, items: 4, notes: "Monthly restock" },
  { id: "pr-003", prNumber: "PR-2026-013", requestedBy: "Somchai T.",    date: "2026-05-10", status: "ORDERED",  supplier: "Jotun Thailand",    total: 42000, items: 3, notes: "Antifouling season restock" },
  { id: "pr-004", prNumber: "PR-2026-012", requestedBy: "Krit W.",       date: "2026-05-05", status: "RECEIVED", supplier: "3M Thailand",        total: 8400,  items: 2, notes: "Polishing supplies" },
]

// ─── Staff ────────────────────────────────────────────────────────────────────
export const mockStaff = [
  { id: "staff-001", name: "Somchai Thongsuk",   role: "HEAD_MECHANIC",   department: "Boat Yard",    phone: "+66 81 111 2233", email: "somchai@marinamms.com",   status: "ACTIVE", hireDate: "2020-03-01", specialties: ["Engine","Mechanical"],             activeJobs: 3, completedThisMonth: 8  },
  { id: "staff-002", name: "Nattapong Khemnak",  role: "ELECTRICIAN",     department: "Boat Yard",    phone: "+66 82 222 3344", email: "nat@marinamms.com",       status: "ACTIVE", hireDate: "2021-06-15", specialties: ["Electrical","Navigation Systems"], activeJobs: 2, completedThisMonth: 5  },
  { id: "staff-003", name: "Krit Wongprasert",   role: "PAINTER",         department: "Boat Yard",    phone: "+66 83 333 4455", email: "krit@marinamms.com",      status: "ACTIVE", hireDate: "2019-11-20", specialties: ["Paint","Antifouling","Fiberglass"], activeJobs: 1, completedThisMonth: 6  },
  { id: "staff-004", name: "Apinya Rattana",      role: "OPERATION_STAFF", department: "Marina Ops",   phone: "+66 84 444 5566", email: "apinya@marinamms.com",    status: "ACTIVE", hireDate: "2022-02-01", specialties: ["Launch/Retrieval","Berth Assignment"], activeJobs: 0, completedThisMonth: 12 },
  { id: "staff-005", name: "Wichai Somboon",      role: "OPERATION_STAFF", department: "Marina Ops",   phone: "+66 85 555 6677", email: "wichai@marinamms.com",    status: "ACTIVE", hireDate: "2023-07-01", specialties: ["Ramp Operation","Gate Control"],   activeJobs: 0, completedThisMonth: 10 },
  { id: "staff-006", name: "Priya Suwan",         role: "ACCOUNTANT",      department: "Finance",      phone: "+66 86 666 7788", email: "priya@marinamms.com",     status: "ACTIVE", hireDate: "2021-01-10", specialties: ["Billing","Invoice","Reporting"],    activeJobs: 0, completedThisMonth: 0  },
  { id: "staff-007", name: "Tanakorn Jaidee",     role: "FIBERGLASS_TECH", department: "Boat Yard",    phone: "+66 87 777 8899", email: "tanakorn@marinamms.com",  status: "ACTIVE", hireDate: "2020-09-01", specialties: ["Fiberglass","Hull Repair"],         activeJobs: 2, completedThisMonth: 4  },
  { id: "staff-008", name: "Malee Phonsuk",       role: "CUSTOMER_SERVICE",department: "Front Office", phone: "+66 88 888 9900", email: "malee@marinamms.com",     status: "ACTIVE", hireDate: "2022-05-15", specialties: ["Customer CRM","Quotation"],         activeJobs: 0, completedThisMonth: 0  },
]

export const mockStaffTasks: Record<string, Array<{
  id: string; title: string; workOrderRef: string; boat: string
  status: string; priority: string; dueDate: string; hoursLogged: number
}>> = {
  "staff-001": [
    { id: "st-001-1", title: "Port engine overhaul — disassembly", workOrderRef: "WO-2026-031", boat: "Blue Horizon I", status: "IN_PROGRESS", priority: "HIGH",   dueDate: "2026-05-28", hoursLogged: 28 },
    { id: "st-001-2", title: "Sea trial post engine overhaul",      workOrderRef: "WO-2026-031", boat: "Blue Horizon I", status: "TODO",        priority: "HIGH",   dueDate: "2026-05-30", hoursLogged: 0  },
    { id: "st-001-3", title: "Bilge pump replacement — Sea Hawk",   workOrderRef: "WO-2026-032", boat: "Sea Hawk",       status: "COMPLETED",   priority: "MEDIUM", dueDate: "2026-05-15", hoursLogged: 6  },
  ],
  "staff-002": [
    { id: "st-002-1", title: "Navigation system calibration",       workOrderRef: "WO-2026-032", boat: "Sea Hawk",   status: "IN_PROGRESS", priority: "MEDIUM", dueDate: "2026-05-22", hoursLogged: 8  },
    { id: "st-002-2", title: "Shore power connection upgrade",      workOrderRef: "WO-2026-033", boat: "Night Star", status: "TODO",        priority: "LOW",    dueDate: "2026-06-05", hoursLogged: 0  },
  ],
  "staff-003": [
    { id: "st-003-1", title: "Full hull antifouling — Nordic Star", workOrderRef: "WO-2026-035", boat: "Nordic Star", status: "IN_PROGRESS", priority: "HIGH", dueDate: "2026-05-25", hoursLogged: 16 },
  ],
  "staff-007": [
    { id: "st-007-1", title: "Hull blister repair — Blue Dream",    workOrderRef: "WO-2026-033", boat: "Blue Dream", status: "IN_PROGRESS", priority: "MEDIUM", dueDate: "2026-05-24", hoursLogged: 12 },
    { id: "st-007-2", title: "Fiberglass laminate — port hull",     workOrderRef: "WO-2026-033", boat: "Blue Dream", status: "TODO",        priority: "MEDIUM", dueDate: "2026-05-26", hoursLogged: 0  },
  ],
}

// ─── Ramp Bookings ────────────────────────────────────────────────────────────
export const mockRampBookings = [
  { id: "rb-001", bookingRef: "RB-2026-041", customerId: "cust-001", customerName: "James Thornton",                  boatId: "boat-001", boatName: "Sea Hawk",       boatDraftFt: 4.5, operationType: "LAUNCH",    status: "CONFIRMED", scheduledDate: "2026-05-22", scheduledTime: "07:00", assignedStaff: ["Apinya Rattana","Wichai Somboon"], trailerType: "company", safeWindow: "06:00-10:00", notes: "" },
  { id: "rb-002", bookingRef: "RB-2026-040", customerId: "cust-002", customerName: "Samui Blue Horizon Charter Co.",  boatId: "boat-003", boatName: "Blue Dream",     boatDraftFt: 3.9, operationType: "RETRIEVAL", status: "COMPLETED", scheduledDate: "2026-05-18", scheduledTime: "08:00", assignedStaff: ["Apinya Rattana"],                   trailerType: "company", safeWindow: "07:30-11:00", notes: "Post-repair retrieval" },
  { id: "rb-003", bookingRef: "RB-2026-039", customerId: "cust-004", customerName: "Erik Lindstrom",                  boatId: "boat-006", boatName: "Nordic Star",    boatDraftFt: 5.2, operationType: "HAUL_OUT",  status: "CONFIRMED", scheduledDate: "2026-05-23", scheduledTime: "06:30", assignedStaff: ["Wichai Somboon"],                    trailerType: "company", safeWindow: "06:00-09:00", notes: "Haul-out for antifouling" },
  { id: "rb-004", bookingRef: "RB-2026-038", customerId: "cust-003", customerName: "Sopida Charoenwong",              boatId: "boat-005", boatName: "Koh Samui Lady", boatDraftFt: 2.1, operationType: "LAUNCH",    status: "PENDING",   scheduledDate: "2026-05-25", scheduledTime: "09:00", assignedStaff: [],                                     trailerType: "own",     safeWindow: "TBC",         notes: "Tide check pending" },
  { id: "rb-005", bookingRef: "RB-2026-037", customerId: "cust-001", customerName: "James Thornton",                  boatId: "boat-002", boatName: "Night Star",     boatDraftFt: 6.2, operationType: "HAUL_OUT",  status: "CANCELLED", scheduledDate: "2026-05-16", scheduledTime: "07:00", assignedStaff: [],                                     trailerType: "company", safeWindow: "—",           notes: "Customer postponed" },
]

// ─── Tide data (mock for tide safety calculator) ─────────────────────────────
export const mockTideData: Array<{ time: string; height: number }> = [
  { time: "00:00", height: 0.4 }, { time: "01:00", height: 0.3 },
  { time: "02:00", height: 0.5 }, { time: "03:00", height: 0.9 },
  { time: "04:00", height: 1.4 }, { time: "05:00", height: 1.9 },
  { time: "06:00", height: 2.3 }, { time: "07:00", height: 2.5 },
  { time: "08:00", height: 2.4 }, { time: "09:00", height: 2.1 },
  { time: "10:00", height: 1.6 }, { time: "11:00", height: 1.1 },
  { time: "12:00", height: 0.7 }, { time: "13:00", height: 0.5 },
  { time: "14:00", height: 0.4 }, { time: "15:00", height: 0.5 },
  { time: "16:00", height: 0.9 }, { time: "17:00", height: 1.4 },
  { time: "18:00", height: 1.9 }, { time: "19:00", height: 2.2 },
  { time: "20:00", height: 2.3 }, { time: "21:00", height: 2.1 },
  { time: "22:00", height: 1.7 }, { time: "23:00", height: 1.1 },
]

// ─── Incidents ────────────────────────────────────────────────────────────────
export const mockIncidents = [
  { id: "inc-001", incidentRef: "INC-2026-008", type: "BOAT_DAMAGE",      severity: "MEDIUM", status: "INVESTIGATING", date: "2026-05-15", reportedBy: "Wichai Somboon",   location: "Ramp Area",    boatName: "Nordic Star",    customer: "Erik Lindstrom",             description: "Minor gelcoat scratch on starboard quarter during haul-out. Support pad slipped.", actionTaken: "Photographed, customer notified. Repair quote pending." },
  { id: "inc-002", incidentRef: "INC-2026-007", type: "NEAR_MISS",        severity: "LOW",    status: "CLOSED",        date: "2026-05-10", reportedBy: "Apinya Rattana",   location: "Concrete C4",  boatName: null,             customer: null,                         description: "Forklift came within 1m of yard worker during boat movement. No injury.",          actionTaken: "Safety briefing held. Spotter now mandatory for forklift ops." },
  { id: "inc-003", incidentRef: "INC-2026-006", type: "INJURY",           severity: "LOW",    status: "CLOSED",        date: "2026-04-28", reportedBy: "Somchai Thongsuk", location: "Workshop Bay", boatName: null,             customer: null,                         description: "Minor cut on hand during engine disassembly. First aid applied.",                  actionTaken: "First aid given. Glove policy reminder issued." },
  { id: "inc-004", incidentRef: "INC-2026-005", type: "EQUIPMENT_DAMAGE", severity: "HIGH",   status: "RESOLVED",      date: "2026-04-20", reportedBy: "Wichai Somboon",   location: "Ramp",         boatName: null,             customer: null,                         description: "Hydraulic lift ram seal failure. Lift inoperable for 3 days.",                     actionTaken: "Seal kit replaced. Inspection schedule updated." },
  { id: "inc-005", incidentRef: "INC-2026-004", type: "POLLUTION",        severity: "MEDIUM", status: "RESOLVED",      date: "2026-04-10", reportedBy: "Apinya Rattana",   location: "Wash Area W2", boatName: "Blue Dream",     customer: "Samui Blue Horizon Charter", description: "Engine oil overflow during bilge pump test. Small spill on concrete.",              actionTaken: "Absorbent pads deployed. Area cleaned. Bund check completed." },
]
