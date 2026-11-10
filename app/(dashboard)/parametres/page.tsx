import { prisma } from "@/lib/prisma"
import SettingsClient from "@/components/settings/SettingsClient"

export default async function ParametresPage() {
  const [company, units] = await Promise.all([
    prisma.company.findFirst(),
    prisma.unit.findMany({ orderBy: { name: "asc" } }),
  ])

  const companyData = {
    name: company?.name ?? "Mon entreprise",
    phone: company?.phone ?? null,
    email: company?.email ?? null,
    address: company?.address ?? null,
    currency: company?.currency ?? "EUR",
    dateFormat: company?.dateFormat ?? "DD/MM/YYYY",
    taxRate: Number(company?.taxRate ?? 0),
    notifyLowStockEmail: company?.notifyLowStockEmail ?? true,
    notifyLowStockInApp: company?.notifyLowStockInApp ?? true,
    updatedAt: company?.updatedAt?.toISOString() ?? "new",
  }

  return <SettingsClient key={companyData.updatedAt} company={companyData} units={units} />
}
