import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getVisibleProductIds } from "@/lib/scope"
import { can } from "@/lib/permissions"
import AppShell from "@/components/AppShell"
import ToastProvider from "@/components/toast/ToastProvider"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = (session.user as any).role
  const userName = session.user.name ?? "Utilisateur"
  const company = await prisma.company.findFirst()
  const companyName = company?.name ?? "StockFlow"

  // Alertes de stock bas, sur le périmètre visible par l'utilisateur connecté
  const visibleIds = await getVisibleProductIds()
  const candidateProducts = await prisma.product.findMany({
    where: { active: true, ...(visibleIds ? { id: { in: visibleIds } } : {}) },
    include: { stocks: { where: { condition: "GOOD" } } },
  })
  const stockAlerts = candidateProducts
    .map((p) => ({ id: p.id, name: p.name, qty: p.stocks.reduce((s, st) => s + st.quantity, 0), min: p.minQty }))
    .filter((p) => p.qty <= p.min)
    .sort((a, b) => a.qty - b.qty)

  // Inventaires en attente : uniquement pertinent pour ceux qui peuvent les valider
  const pendingInventoryCount = can(role, "stock.inventory.validate")
    ? await prisma.inventoryCount.count({ where: { validatedAt: null } })
    : 0

  return (
    <ToastProvider>
      <AppShell role={role} userName={userName} companyName={companyName} stockAlerts={stockAlerts} pendingInventoryCount={pendingInventoryCount}>
        {children}
      </AppShell>
    </ToastProvider>
  )
}
