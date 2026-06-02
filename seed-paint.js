const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const paintServices = [
  {
    code: "P01",
    serviceNameEn: "Compound & Polish – Speedboat",
    serviceNameTh: "ขัดและเงาเรือเร็ว",
    category: "Paint Service",
    unit: "sqm",
    rateThb: 150,
    description: "Machine compound + polish + wax; min 5,000 THB",
    notes: "Economy compound and polish service for speedboats under 24ft",
  },
  {
    code: "P02",
    serviceNameEn: "Compound & Polish – Yacht ≥30 ft",
    serviceNameTh: "ขัดและเงายอชต์",
    category: "Paint Service",
    unit: "sqm",
    rateThb: 200,
    description: "Larger hull; min charge 5,000 THB",
    notes: "Premium compound and polish for larger yachts",
  },
  {
    code: "P03",
    serviceNameEn: "Antifouling Labor – Economy",
    serviceNameTh: "งานป้องกันสาหร่ายแบบประหยัด",
    category: "Paint Service",
    unit: "sqm",
    rateThb: 160,
    description: "Light sand + 2 coats antifouling; paint extra",
    notes: "Basic antifouling labor (material not included)",
  },
  {
    code: "P04",
    serviceNameEn: "Antifouling Labor – Standard",
    serviceNameTh: "งานป้องกันสาหร่ายมาตรฐาน",
    category: "Paint Service",
    unit: "sqm",
    rateThb: 250,
    description: "Strip 1 layer + sand + prime + 2 coats AF",
    notes: "Standard antifouling with surface preparation",
  },
  {
    code: "P05",
    serviceNameEn: "Antifouling Full System – Labor",
    serviceNameTh: "ระบบป้องกันสาหร่ายแบบเต็มรูป",
    category: "Paint Service",
    unit: "sqm",
    rateThb: 380,
    description: "Full strip + epoxy barrier + 2 coats AF",
    notes: "Complete antifouling system with epoxy barrier coat",
  },
  {
    code: "P06",
    serviceNameEn: "Topside 2K PU Labor (spray)",
    serviceNameTh: "งานเคลือบด้านข้างเรือ 2K PU",
    category: "Paint Service",
    unit: "sqm",
    rateThb: 750,
    description: "Sand + epoxy prime + 2K PU spray; subcontract",
    notes: "Professional 2K polyurethane topside coating (requires spray booth)",
  },
  {
    code: "P07",
    serviceNameEn: "Gelcoat Spot Repair",
    serviceNameTh: "ซ่อมแซมเจลโคท (จุดเล็ก)",
    category: "Paint Service",
    unit: "zone",
    rateThb: 1500,
    description: "Per zone ≤0.1 sqm; colour match + polish",
    notes: "Small gelcoat repairs per zone (max 0.1 sqm)",
  },
  {
    code: "P08",
    serviceNameEn: "Gelcoat Repair – Full Section",
    serviceNameTh: "ซ่อมแซมเจลโคท (ส่วนใหญ่)",
    category: "Paint Service",
    unit: "sqm",
    rateThb: 1000,
    description: "Grind + laminate + gelcoat + polish",
    notes: "Full section gelcoat repair with fiberglass reinforcement",
  },
  {
    code: "P09",
    serviceNameEn: "Paint Stripping – Old Antifouling",
    serviceNameTh: "ขูดปลอกเก่า",
    category: "Paint Service",
    unit: "sqm",
    rateThb: 220,
    description: "+80 THB/sqm per extra layer",
    notes: "Base rate for one layer stripping; add 80 THB per additional layer",
  },
  {
    code: "P10",
    serviceNameEn: "Epoxy Primer Coat – Labor",
    serviceNameTh: "งานทาสีรองพื้นเอพ็อกซี่",
    category: "Paint Service",
    unit: "sqm",
    rateThb: 200,
    description: "Per coat; typically 2 coats needed",
    notes: "Epoxy primer labor (typically 2 coats required)",
  },
  {
    code: "P11",
    serviceNameEn: "Non-Skid Deck Coating – Labor",
    serviceNameTh: "งานเคลือบป้องกันการลื่นบนดาดฟ้า",
    category: "Paint Service",
    unit: "sqm",
    rateThb: 400,
    description: "Deck prep + epoxy base + texture finish",
    notes: "Non-slip deck coating with texture",
  },
  {
    code: "P12",
    serviceNameEn: "Bottom Paint Package – Speedboat <30 ft",
    serviceNameTh: "แพ็กเกจเคลือบท้องเรือ สปีดโบ๊ท",
    category: "Paint Service",
    unit: "pkg",
    rateThb: 12000,
    description: "Package: economy paint included",
    notes: "Complete bottom paint package for small speedboats (includes basic paint)",
  },
  {
    code: "P13",
    serviceNameEn: "Bottom Paint Package – Yacht 35–45 ft",
    serviceNameTh: "แพ็กเกจเคลือบท้องเรือ ยอชต์กลาง",
    category: "Paint Service",
    unit: "pkg",
    rateThb: 28000,
    description: "Jotun Active or Interswift equivalent",
    notes: "Mid-size yacht bottom paint package (Jotun Active or equivalent)",
  },
  {
    code: "P14",
    serviceNameEn: "Bottom Paint Package – Catamaran 40–50 ft",
    serviceNameTh: "แพ็กเกจเคลือบท้องเรือ คาตามารัน",
    category: "Paint Service",
    unit: "pkg",
    rateThb: 48000,
    description: "Cat 1.5–2× hull area; Active Plus recommended",
    notes: "Large catamaran with dual hulls (Jotun Active Plus recommended)",
  },
];

async function main() {
  console.log("🎨 Seeding Paint Services pricing...");
  let count = 0;

  for (const pricing of paintServices) {
    try {
      const existing = await prisma.pricingMaster.findUnique({
        where: { code: pricing.code },
      });

      if (!existing) {
        await prisma.pricingMaster.create({
          data: {
            ...pricing,
            rateThb: parseFloat(String(pricing.rateThb)),
            isActive: true,
          },
        });
        console.log(`✅ Created: ${pricing.code} - ${pricing.serviceNameEn}`);
        count++;
      } else {
        console.log(`⏭️  Skipped: ${pricing.code} (already exists)`);
      }
    } catch (error) {
      console.error(`❌ Error creating ${pricing.code}:`, error.message);
    }
  }

  console.log(`\n✨ Seeded ${count} Paint Services pricing records!`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
