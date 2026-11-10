"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { logActivity } from "@/lib/logActivity"

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (role !== "ADMIN") throw new Error("Seul un administrateur peut gérer les entrepôts.")
}

export async function createWarehouse(formData: FormData) {
  await requireAdmin()
  const warehouse = await prisma.warehouse.create({
    data: {
      name: String(formData.get("name")),
      address: String(formData.get("address") || ""),
      capacity: Number(formData.get("capacity") || 0),
    },
  })
  await logActivity("Entrepôt créé", "Entrepôts", warehouse.name)
  revalidatePath("/entrepots")
}

export async function updateWarehouse(id: string, formData: FormData) {
  await requireAdmin()
  const name = String(formData.get("name") || "").trim()
  if (!name) throw new Error("Le nom de l'entrepôt est obligatoire.")

  await prisma.warehouse.update({
    where: { id },
    data: {
      name,
      address: String(formData.get("address") || ""),
      capacity: Number(formData.get("capacity") || 0),
    },
  })
  await logActivity("Entrepôt modifié", "Entrepôts", name)
  revalidatePath("/entrepots")
}

export async function updateWarehouseManagers(warehouseId: string, userIds: string[]) {
  await requireAdmin()
  // Chaque responsable choisi doit être un magasinier déjà rattaché à cet entrepôt
  if (userIds.length > 0) {
    const validUsers = await prisma.user.findMany({
      where: { id: { in: userIds }, role: "STOREKEEPER", warehouseId },
    })
    if (validUsers.length !== userIds.length) {
      throw new Error("Le responsable d'un entrepôt doit être un magasinier déjà rattaché à cet entrepôt.")
    }
  }

  await prisma.$transaction([
    prisma.warehouseManager.deleteMany({ where: { warehouseId } }),
    prisma.warehouseManager.createMany({ data: userIds.map((userId) => ({ warehouseId, userId })) }),
  ])
  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
  await logActivity("Responsables d'entrepôt modifiés", "Entrepôts", `${warehouse?.name} (${userIds.length} responsable(s))`)
  revalidatePath("/entrepots")
}

import { asFriendlyDeleteError } from "@/lib/deleteErrors"

export async function deleteWarehouse(id: string) {
  await requireAdmin()
  const warehouse = await prisma.warehouse.findUnique({ where: { id } })
  try {
    await prisma.warehouse.delete({ where: { id } })
    if (warehouse) await logActivity("Entrepôt supprimé", "Entrepôts", warehouse.name)
  } catch (error: any) {
    throw asFriendlyDeleteError(error, "cet entrepôt", "il a encore du stock, des mouvements ou des magasiniers qui y sont rattachés. Vide-le, réaffecte ses magasiniers à un autre site, puis réessaie — ou désactive-le au lieu de le supprimer.")
  }
  revalidatePath("/entrepots")
}
