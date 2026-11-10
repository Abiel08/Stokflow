import { auth } from "./auth"
import { prisma } from "./prisma"

/**
 * Renvoie la liste des IDs produits visibles pour l'utilisateur connecté.
 * - null = aucune restriction (voit tout : Admin, Gestionnaire, Auditeur)
 * - string[] = uniquement ces produits (Magasinier : seulement ceux qu'il gère)
 */
export async function getVisibleProductIds(): Promise<string[] | null> {
  const session = await auth()
  const user = session?.user as any
  if (!user) return []

  if (user.role !== "STOREKEEPER") return null

  const rows = await prisma.productManager.findMany({
    where: { userId: user.id },
    select: { productId: true },
  })
  return rows.map((r) => r.productId)
}
