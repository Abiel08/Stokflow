import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { getVisibleProductIds } from "@/lib/scope"
import ProductsClient from "@/components/products/ProductsClient"

export default async function ProduitsPage() {
  const session = await auth()
  const role = (session?.user as any).role
  const visibleIds = await getVisibleProductIds()
  const canSeeBuyPrice = can(role, "products.buyPrice")

  const [products, categories, suppliers, company, storekeepers] = await Promise.all([
    prisma.product.findMany({
      where: visibleIds ? { id: { in: visibleIds } } : undefined,
      include: { category: true, supplier: true, managers: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ include: { _count: { select: { products: true } } } }),
    prisma.supplier.findMany(),
    prisma.company.findFirst(),
    prisma.user.findMany({ where: { role: "STOREKEEPER", active: true }, orderBy: { name: "asc" } }),
  ])

  return (
    <ProductsClient
      products={products.map((p) => ({
        ...p,
        // Le prix d'achat n'est jamais envoyé au navigateur si l'utilisateur n'est pas Admin
        buyPrice: canSeeBuyPrice ? Number(p.buyPrice) : null,
        sellPrice: Number(p.sellPrice),
        managerIds: p.managers.map((m) => m.userId),
        managerNames: p.managers.map((m) => m.user.name),
      }))}
      categories={categories}
      suppliers={suppliers}
      canEdit={can(role, "products.write")}
      canDelete={role === "ADMIN"}
      canSeeBuyPrice={canSeeBuyPrice}
      currency={company?.currency ?? "EUR"}
      storekeepers={storekeepers.map((s) => ({ id: s.id, name: s.name }))}
    />
  )
}
