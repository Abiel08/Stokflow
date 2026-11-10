import { prisma } from "@/lib/prisma"
import UsersClient from "@/components/users/UsersClient"

export default async function UtilisateursPage() {
  const [users, warehouses, products] = await Promise.all([
    prisma.user.findMany({
      include: { warehouse: true, managedProducts: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.warehouse.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, name: true, reference: true, stocks: { select: { warehouseId: true } } },
      orderBy: { name: "asc" },
    }),
  ])

  const data = users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    active: u.active,
    lastLogin: u.lastLogin ? u.lastLogin.toLocaleString("fr-FR") : "—",
    warehouseId: u.warehouseId,
    warehouseName: u.warehouse?.name ?? null,
    managedProductsCount: u.managedProducts.length,
    managedProductIds: u.managedProducts.map((m) => m.productId),
  }))

  return (
    <UsersClient
      users={data}
      warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        reference: p.reference,
        warehouseIds: [...new Set(p.stocks.map((s) => s.warehouseId))],
      }))}
    />
  )
}
