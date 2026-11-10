import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { getVisibleProductIds } from "@/lib/scope"
import StockClient from "@/components/stock/StockClient"

export default async function StockPage() {
  const session = await auth()
  const role = (session?.user as any).role
  const visibleIds = await getVisibleProductIds()
  const productFilter = visibleIds ? { productId: { in: visibleIds } } : {}

  const [stocks, products, warehouses, movements, inventoryCounts] = await Promise.all([
    prisma.stock.findMany({ where: productFilter, include: { product: true, warehouse: true } }),
    prisma.product.findMany({ where: { active: true, ...(visibleIds ? { id: { in: visibleIds } } : {}) } }),
    prisma.warehouse.findMany(),
    prisma.movement.findMany({
      where: productFilter,
      include: { product: true, warehouse: true, destWarehouse: true, user: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.inventoryCount.findMany({
      where: productFilter,
      include: { product: true, warehouse: true, submittedBy: true, validatedBy: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ])

  const goodStocks = stocks.filter((s) => s.condition === "GOOD")
  const defectiveStocks = stocks.filter((s) => s.condition === "DEFECTIVE" && s.quantity > 0)

  return (
    <StockClient
      stocks={goodStocks.map((s) => ({
        id: s.id,
        product: { id: s.product.id, name: s.product.name, reference: s.product.reference, minQty: s.product.minQty },
        warehouse: { id: s.warehouse.id, name: s.warehouse.name },
        quantity: s.quantity,
      }))}
      defectiveStocks={defectiveStocks.map((s) => ({
        id: s.id,
        product: { id: s.product.id, name: s.product.name, reference: s.product.reference },
        warehouse: { id: s.warehouse.id, name: s.warehouse.name },
        quantity: s.quantity,
      }))}
      products={products.map((p) => ({ id: p.id, name: p.name, reference: p.reference }))}
      warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
      movements={movements.map((m) => ({
        id: m.id,
        type: m.type,
        productName: m.product.name,
        warehouseName: m.warehouse.name,
        destWarehouseName: m.destWarehouse?.name ?? null,
        quantity: m.quantity,
        userName: m.user.name,
        reason: m.reason,
        createdAt: m.createdAt.toLocaleString("fr-FR"),
      }))}
      inventoryCounts={inventoryCounts.map((c) => ({
        id: c.id,
        productName: c.product.name,
        warehouseName: c.warehouse.name,
        theoreticalQty: c.theoreticalQty,
        countedQty: c.countedQty,
        difference: c.difference,
        submittedByName: c.submittedBy.name,
        validatedByName: c.validatedBy?.name ?? null,
        validatedAt: c.validatedAt ? c.validatedAt.toLocaleString("fr-FR") : null,
        createdAt: c.createdAt.toLocaleString("fr-FR"),
      }))}
      canWrite={can(role, "stock.write")}
      canDefective={can(role, "stock.defective")}
      canSubmitInventory={can(role, "stock.inventory.submit")}
      canValidateInventory={can(role, "stock.inventory.validate")}
    />
  )
}
