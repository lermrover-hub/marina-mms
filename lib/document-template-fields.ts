export type DocumentFieldKind = "text" | "date" | "time" | "number" | "email" | "tel"

export interface DocumentTemplateField {
  label: string
  name: string
  kind: DocumentFieldKind
  placeholder?: string
}

export const STANDARD_PARTY_FIELDS: DocumentTemplateField[] = [
  { label: "Customer / Company", name: "customerName", kind: "text" },
  { label: "Contact Person", name: "contactPerson", kind: "text" },
  { label: "Mobile Phone", name: "mobilePhone", kind: "tel" },
  { label: "Email", name: "email", kind: "email" },
  { label: "LINE ID", name: "lineId", kind: "text" },
  { label: "WhatsApp", name: "whatsapp", kind: "tel" },
]

export const STANDARD_VESSEL_FIELDS: DocumentTemplateField[] = [
  { label: "Vessel Name", name: "vesselName", kind: "text" },
  { label: "Boat Owner", name: "boatOwner", kind: "text" },
  { label: "LOA (ft)", name: "loaFt", kind: "number" },
  { label: "Beam (m)", name: "beamFt", kind: "number" },
  { label: "Draft (m)", name: "draftFt", kind: "number" },
  { label: "Registration No.", name: "registrationNo", kind: "text" },
  { label: "Country", name: "country", kind: "text" },
]

export const BERTHING_FORM_FIELDS: DocumentTemplateField[] = [
  { label: "Berth No.", name: "berthNo", kind: "text", placeholder: "B-04" },
  ...STANDARD_VESSEL_FIELDS,
  ...STANDARD_PARTY_FIELDS,
  { label: "Commencement Date", name: "commencementDate", kind: "date" },
  { label: "Estimated Arrival Time", name: "estimatedArrivalTime", kind: "time" },
  { label: "Estimated Maturity Date", name: "estimatedMaturityDate", kind: "date" },
]

export const HARDSTAND_FORM_FIELDS: DocumentTemplateField[] = [
  { label: "Form No.", name: "formNo", kind: "text", placeholder: "HS-2026-001" },
  ...STANDARD_VESSEL_FIELDS.filter((field) => field.name !== "beamFt"),
  ...STANDARD_PARTY_FIELDS,
  { label: "Weight (kg)", name: "weightT", kind: "number" },
  { label: "Arrival Date", name: "arrivalDate", kind: "date" },
  { label: "Arrival Time", name: "arrivalTime", kind: "time" },
  { label: "Storage Duration", name: "storageDuration", kind: "text" },
  { label: "Service Date", name: "serviceDate", kind: "date" },
  { label: "Service Time", name: "serviceTime", kind: "time" },
]
