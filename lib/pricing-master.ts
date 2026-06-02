import { prisma } from "@/lib/prisma"

export async function getPricingMaster(category?: string | null, isActive: boolean = true) {
  const where: any = {}
  
  if (isActive) {
    where.isActive = true
  }
  
  if (category) {
    where.category = category
  }

  return await prisma.pricingMaster.findMany({
    where,
    orderBy: { code: "asc" }
  })
}

export async function getPricingMasterById(id: string) {
  return await prisma.pricingMaster.findUnique({
    where: { id }
  })
}

export async function createPricingMaster(data: {
  code: string
  serviceNameEn: string
  serviceNameTh?: string
  category: string
  unit: string
  rateThb: number
  description?: string
  notes?: string
}) {
  return await prisma.pricingMaster.create({
    data: {
      code: data.code,
      serviceNameEn: data.serviceNameEn,
      serviceNameTh: data.serviceNameTh || null,
      category: data.category,
      unit: data.unit,
      rateThb: parseFloat(String(data.rateThb)),
      description: data.description || null,
      notes: data.notes || null,
      isActive: true
    }
  })
}

export async function updatePricingMaster(
  id: string,
  data: {
    serviceNameEn?: string
    serviceNameTh?: string
    category?: string
    unit?: string
    rateThb?: number
    description?: string
    notes?: string
    isActive?: boolean
  }
) {
  return await prisma.pricingMaster.update({
    where: { id },
    data: {
      ...(data.serviceNameEn && { serviceNameEn: data.serviceNameEn }),
      ...(data.serviceNameTh !== undefined && { serviceNameTh: data.serviceNameTh }),
      ...(data.category && { category: data.category }),
      ...(data.unit && { unit: data.unit }),
      ...(data.rateThb !== undefined && { rateThb: parseFloat(String(data.rateThb)) }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.isActive !== undefined && { isActive: data.isActive })
    }
  })
}
