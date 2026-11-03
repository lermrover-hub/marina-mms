import { auth } from "@/auth"
import { catalogAdmin } from "@/lib/catalog-validation"
import CatalogEditor from "./CatalogEditor"

export default async function ServiceCatalogPage() {
  const session = await auth()
  if (!catalogAdmin((session?.user as { role?: string } | undefined)?.role)) {
    return <p role="alert">เฉพาะ Super Admin เท่านั้น / Super Admin access required.</p>
  }
  return <CatalogEditor />
}
