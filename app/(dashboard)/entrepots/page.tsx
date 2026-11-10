import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { can } from "@/lib/permissions"
import WarehousesClient from "@/components/warehouses/WarehousesClient"

export default async function EntrepotsPage() {
  const session = await auth()
  const role = (session?.user as any).role
  const userId = (session?.user as any).id
  const userWarehouseId = (session?.user as any).warehouseId

  // Un magasinier ne voit que son propre entrepôt (lecture seule)
  let scopedWarehouseId: string | null = null
  if (role === "STOREKEEPER") {
    const me = await prisma.user.findUnique({ where: { id: userId } })
    scopedWarehouseId = me?.warehouseId ?? null
  }

  const warehouses = await prisma.warehouse.findMany({
    where: scopedWarehouseId ? { id: scopedWarehouseId } : undefined,
    include: {
      managers: { include: { user: true } },
      stocks: true,
      storekeepers: true,
      _count: { select: { stocks: true } },
    },
  })

  const data = warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    address: w.address,
    capacity: w.capacity,
    used: w.stocks.reduce((s, st) => s + st.quantity, 0),
    managerIds: w.managers.map((m) => m.userId),
    managerNames: w.managers.map((m) => m.user.name),
    productsCount: w._count.stocks,
    storekeepersCount: w.storekeepers.length,
    // Le responsable ne peut être choisi que parmi les magasiniers déjà rattachés à ce site
    possibleManagers: w.storekeepers.map((s) => ({ id: s.id, name: s.name })),
  }))

  return (
    <WarehousesClient
      warehouses={data}
      canEdit={can(role, "warehouses.write")}
    />
  )
}
