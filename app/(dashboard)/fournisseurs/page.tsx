import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { can } from "@/lib/permissions"
import SuppliersClient from "@/components/suppliers/SuppliersClient"

export default async function FournisseursPage() {
  const session = await auth()
  const role = (session?.user as any).role
  const suppliers = await prisma.supplier.findMany({ include: { _count: { select: { products: true } } } })

  return <SuppliersClient suppliers={suppliers} canEdit={can(role, "suppliers")} />
}
