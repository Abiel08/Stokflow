import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import RapportsClient from "@/components/reports/RapportsClient"

export default async function RapportsPage() {
  const session = await auth()
  const role = (session?.user as any).role

  const [categories, products, movements, bilanMovements, logs, company] = await Promise.all([
    prisma.category.findMany({
      include: { products: { include: { stocks: { where: { condition: "GOOD" } } } } },
    }),
    prisma.product.findMany({
      include: {
        category: true,
        stocks: true,
        _count: { select: { movements: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.movement.findMany({
      include: { product: true, warehouse: true, destWarehouse: true, user: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    // Jeu de données complet (léger) pour calculer le bilan par produit sur n'importe quelle période
    prisma.movement.findMany({
      select: { productId: true, type: true, quantity: true, createdAt: true, product: { select: { name: true, reference: true } } },
      orderBy: { createdAt: "asc" },
    }),
    role === "ADMIN" || role === "AUDITOR"
      ? prisma.activityLog.findMany({
          include: { user: true },
          orderBy: { createdAt: "desc" },
          take: 300,
        })
      : Promise.resolve([]),
    prisma.company.findFirst(),
  ])

  const categoryRows = categories.map((c) => {
    const qty = c.products.reduce((s, p) => s + p.stocks.reduce((ss, st) => ss + st.quantity, 0), 0)
    const buyValue = role === "ADMIN" ? c.products.reduce((s, p) => s + p.stocks.reduce((ss, st) => ss + st.quantity, 0) * Number(p.buyPrice), 0) : 0
    const sellValue = c.products.reduce((s, p) => s + p.stocks.reduce((ss, st) => ss + st.quantity, 0) * Number(p.sellPrice), 0)
    return { name: c.name, count: c.products.length, qty, buyValue, sellValue }
  })

  const productRows = products.map((p) => {
    const good = p.stocks.filter((s) => s.condition === "GOOD").reduce((s, st) => s + st.quantity, 0)
    const defective = p.stocks.filter((s) => s.condition === "DEFECTIVE").reduce((s, st) => s + st.quantity, 0)
    return {
      id: p.id,
      name: p.name,
      reference: p.reference,
      category: p.category?.name ?? "—",
      goodQty: good,
      defectiveQty: defective,
      minQty: p.minQty,
      buyPrice: role === "ADMIN" ? Number(p.buyPrice) : null,
      sellPrice: Number(p.sellPrice),
      stockValue: good * Number(p.buyPrice),
      movementsCount: p._count.movements,
    }
  })

  const movementRows = movements.map((m) => ({
    date: m.createdAt.toLocaleString("fr-FR"),
    type: m.type,
    product: m.product.name,
    quantity: m.quantity,
    warehouse: m.warehouse.name,
    destWarehouse: m.destWarehouse?.name ?? null,
    user: m.user.name,
    reason: m.reason ?? "",
  }))

  const logRows = logs.map((l) => ({
    date: l.createdAt.toLocaleString("fr-FR"),
    user: l.user.name,
    action: l.action,
    module: l.module,
    detail: l.detail ?? "",
  }))

  const bilanMovementRows = bilanMovements.map((m) => ({
    productId: m.productId,
    productName: m.product.name,
    reference: m.product.reference,
    type: m.type,
    quantity: m.quantity,
    date: m.createdAt.toISOString(),
  }))

  // Suivi des pertes réelles sur stock défectueux (Admin uniquement, nécessite le prix d'achat)
  let defectiveSummary = null
  let defectiveMovementRows: { date: string; type: string; product: string; quantity: number; unitCost: number; unitPrice: number | null; cost: number; revenue: number | null }[] = []

  if (role === "ADMIN") {
    const defectiveMovements = await prisma.movement.findMany({
      where: { type: { in: ["DEFECTIVE", "RESTORE", "SELL_DEFECTIVE", "SCRAP"] } },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    let declaredValue = 0, restoredValue = 0, soldQty = 0, soldRevenue = 0, soldCostValue = 0, scrappedValue = 0

    for (const m of defectiveMovements) {
      const unitCost = Number(m.product.buyPrice)
      const cost = unitCost * m.quantity
      if (m.type === "DEFECTIVE") declaredValue += cost
      else if (m.type === "RESTORE") restoredValue += cost
      else if (m.type === "SELL_DEFECTIVE") { soldQty += m.quantity; soldRevenue += Number(m.unitPrice ?? 0) * m.quantity; soldCostValue += cost }
      else if (m.type === "SCRAP") scrappedValue += cost
    }

    const realizedLoss = (soldCostValue - soldRevenue) + scrappedValue
    const currentDefectiveValue = Math.max(0, declaredValue - restoredValue - soldCostValue - scrappedValue)

    defectiveSummary = { declaredValue, restoredValue, soldQty, soldRevenue, soldCostValue, scrappedValue, realizedLoss, currentDefectiveValue }
    defectiveMovementRows = defectiveMovements.map((m) => ({
      date: m.createdAt.toLocaleString("fr-FR"),
      type: m.type,
      product: m.product.name,
      quantity: m.quantity,
      unitCost: Number(m.product.buyPrice),
      unitPrice: m.unitPrice !== null ? Number(m.unitPrice) : null,
      cost: Number(m.product.buyPrice) * m.quantity,
      revenue: m.unitPrice !== null ? Number(m.unitPrice) * m.quantity : null,
    }))
  }

  return (
    <RapportsClient
      categoryRows={categoryRows}
      productRows={productRows}
      movementRows={movementRows}
      bilanMovementRows={bilanMovementRows}
      logRows={logRows}
      defectiveSummary={defectiveSummary}
      defectiveMovementRows={defectiveMovementRows}
      currency={company?.currency ?? "EUR"}
      companyName={company?.name ?? "StockFlow"}
      companyAddress={company?.address ?? ""}
      canSeeAudit={role === "ADMIN" || role === "AUDITOR"}
      canSeeBuyPrice={role === "ADMIN"}
    />
  )
}
