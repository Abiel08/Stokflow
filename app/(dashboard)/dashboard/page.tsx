import { prisma } from "@/lib/prisma"
import { getVisibleProductIds } from "@/lib/scope"
import DashboardClient from "@/components/dashboard/DashboardClient"

export default async function DashboardPage() {
  const visibleIds = await getVisibleProductIds()
  const productFilter = visibleIds ? { id: { in: visibleIds } } : {}
  const movementProductFilter = visibleIds ? { productId: { in: visibleIds } } : {}

  const [products, stocks, defectiveStocks, movementsToday, alertProducts, recentLogs, company] = await Promise.all([
    prisma.product.count({ where: productFilter }),
    prisma.stock.findMany({
      where: { condition: "GOOD", product: productFilter },
      include: { product: true },
    }),
    prisma.stock.aggregate({
      where: { condition: "DEFECTIVE", product: productFilter },
      _sum: { quantity: true },
    }),
    prisma.movement.findMany({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, ...movementProductFilter },
    }),
    prisma.product.findMany({
      where: { active: true, ...productFilter },
      include: { stocks: { where: { condition: "GOOD" } } },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: true },
    }),
    prisma.company.findFirst(),
  ])

  const stockValue = stocks.reduce((sum, s) => sum + s.quantity * Number(s.product.buyPrice), 0)

  const alerts = alertProducts
    .map((p) => {
      const totalQty = p.stocks.reduce((s, st) => s + st.quantity, 0)
      return { name: p.name, ref: p.reference, qty: totalQty, min: p.minQty }
    })
    .filter((p) => p.qty <= p.min)
    .slice(0, 6)

  const defectiveProductStocks = await prisma.stock.findMany({
    where: { condition: "DEFECTIVE", quantity: { gt: 0 }, product: productFilter },
    include: { product: true },
  })
  const defectiveAlerts = defectiveProductStocks
    .map((s) => ({ name: s.product.name, ref: s.product.reference, qty: s.quantity }))
    .slice(0, 6)

  const inCount = movementsToday.filter((m) => m.type === "IN").length
  const outCount = movementsToday.filter((m) => m.type === "OUT").length

  const kpis = {
    stockValue,
    productsCount: products,
    alertsCount: alerts.length,
    movementsToday: movementsToday.length,
    inToday: inCount,
    outToday: outCount,
    defectiveCount: defectiveStocks._sum.quantity ?? 0,
  }

  const recentActivity = recentLogs.map((l) => ({
    time: l.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    user: l.user.name,
    action: l.action,
    detail: l.detail ?? "",
    module: l.module,
  }))

  // Série des mouvements sur les 30 derniers jours (pour le graphique)
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const recentMovements = await prisma.movement.findMany({
    where: { createdAt: { gte: since }, ...movementProductFilter },
    select: { type: true, createdAt: true },
  })
  const seriesMap = new Map<string, { entrées: number; sorties: number }>()
  for (const m of recentMovements) {
    const key = m.createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
    const entry = seriesMap.get(key) ?? { entrées: 0, sorties: 0 }
    if (m.type === "IN") entry.entrées++
    if (m.type === "OUT") entry.sorties++
    seriesMap.set(key, entry)
  }
  const movementSeries = Array.from(seriesMap.entries()).map(([date, v]) => ({ date, ...v }))

  return <DashboardClient kpis={kpis} alerts={alerts} defectiveAlerts={defectiveAlerts} recentActivity={recentActivity} movementSeries={movementSeries} currency={company?.currency ?? "EUR"} />
}
