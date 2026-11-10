"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import type { Role } from "@prisma/client"
import { logActivity } from "@/lib/logActivity"

export async function createUser(formData: FormData) {
  const password = String(formData.get("password"))
  const passwordHash = await bcrypt.hash(password, 10)
  const role = formData.get("role") as Role
  const name = String(formData.get("name"))
  const username = String(formData.get("username")).trim()
  // Seul un Magasinier peut être rattaché à un entrepôt
  const warehouseId = role === "STOREKEEPER" ? String(formData.get("warehouseId") || "") || null : null

  try {
    await prisma.user.create({
      data: { name, username, role, passwordHash, warehouseId },
    })
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new Error("Cet identifiant existe déjà. Choisis-en un autre.")
    }
    throw error
  }
  await logActivity("Utilisateur créé", "Utilisateurs", `${name} (${username})`)
  revalidatePath("/utilisateurs")
}

export async function updateUserWarehouse(id: string, warehouseId: string | null) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user || user.role !== "STOREKEEPER") return // règle : seul un magasinier a un entrepôt
  await prisma.user.update({ where: { id }, data: { warehouseId } })
  await logActivity("Entrepôt réaffecté", "Utilisateurs", user.name)
  revalidatePath("/utilisateurs")
}

export async function toggleUserActive(id: string, active: boolean) {
  const user = await prisma.user.update({ where: { id }, data: { active } })
  await logActivity(active ? "Utilisateur activé" : "Utilisateur désactivé", "Utilisateurs", user.name)
  revalidatePath("/utilisateurs")
}

export async function updateUserRole(id: string, role: Role) {
  // Si l'utilisateur n'est plus Magasinier, on retire son entrepôt (et il ne peut plus être responsable d'un site)
  const data: { role: Role; warehouseId?: null } = { role }
  if (role !== "STOREKEEPER") {
    data.warehouseId = null
    await prisma.warehouseManager.deleteMany({ where: { userId: id } })
  }
  const user = await prisma.user.update({ where: { id }, data })
  await logActivity("Rôle modifié", "Utilisateurs", `${user.name} → ${role}`)
  revalidatePath("/utilisateurs")
  revalidatePath("/entrepots")
}

export async function updateUserManagedProducts(userId: string, productIds: string[]) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== "STOREKEEPER") return // seuls les magasiniers gèrent des produits

  await prisma.$transaction([
    prisma.productManager.deleteMany({ where: { userId } }),
    prisma.productManager.createMany({ data: productIds.map((productId) => ({ userId, productId })) }),
  ])
  await logActivity("Produits gérés modifiés", "Utilisateurs", `${user.name} (${productIds.length} produit(s))`)
  revalidatePath("/utilisateurs")
  revalidatePath("/produits")
}

import { asFriendlyDeleteError } from "@/lib/deleteErrors"

export async function updateUserProfile(id: string, formData: FormData) {
  const name = String(formData.get("name") || "").trim()
  const username = String(formData.get("username") || "").trim()
  if (!name || !username) throw new Error("Le nom et l'identifiant sont obligatoires.")

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing && existing.id !== id) throw new Error("Cet identifiant est déjà utilisé par un autre utilisateur.")

  await prisma.user.update({ where: { id }, data: { name, username } })
  await logActivity("Profil utilisateur modifié", "Utilisateurs", `${name} (${username})`)
  revalidatePath("/utilisateurs")
}

export async function adminResetPassword(id: string, newPassword: string) {
  if (newPassword.length < 6) throw new Error("Le mot de passe doit contenir au moins 6 caractères.")
  const passwordHash = await bcrypt.hash(newPassword, 10)
  const user = await prisma.user.update({ where: { id }, data: { passwordHash } })
  await logActivity("Mot de passe réinitialisé (par un admin)", "Utilisateurs", user.name)
  revalidatePath("/utilisateurs")
}

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } })
  const label = user?.role === "STOREKEEPER" ? `Le magasinier ${user.name}` : user ? `L'utilisateur ${user.name}` : "Cet utilisateur"

  try {
    await prisma.user.delete({ where: { id } })
    if (user) await logActivity("Utilisateur supprimé", "Utilisateurs", user.name)
  } catch (error: any) {
    if (error?.code === "P2003") {
      throw new Error(`${label} a déjà effectué des mouvements de stock, des inventaires ou possède des logs enregistrés à son nom. Impossible de le supprimer — désactive-le plutôt (bouton statut Actif/Inactif) pour lui couper l'accès sans perdre l'historique.`)
    }
    throw error
  }
  revalidatePath("/utilisateurs")
}
