"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { asFriendlyDeleteError } from "@/lib/deleteErrors"

const productSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  unit: z.string().default("unité"),
  buyPrice: z.coerce.number().min(0, "Le prix d'achat ne peut pas être négatif.").optional(), // volontairement sans .default() : absent du formulaire pour un non-Admin, ne doit pas écraser la valeur existante
  sellPrice: z.coerce.number().min(0, "Le prix de vente ne peut pas être négatif.").default(0),
  minQty: z.coerce.number().min(0, "Le seuil minimum ne peut pas être négatif.").default(0),
})

function parseProduct(formData: FormData) {
  const result = productSchema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Les informations saisies ne sont pas valides.")
  }
  return result.data
}

async function currentRole(): Promise<string | null> {
  const session = await auth()
  return (session?.user as any)?.role ?? null
}

async function currentUserIdAndRole(): Promise<{ id: string | null; role: string | null }> {
  const session = await auth()
  return { id: (session?.user as any)?.id ?? null, role: (session?.user as any)?.role ?? null }
}

async function logActivity(action: string, module: string, detail: string) {
  const session = await auth()
  const userId = (session?.user as any)?.id
  if (!userId) return
  await prisma.activityLog.create({ data: { userId, action, module, detail } })
}

async function generateReference(): Promise<string> {
  const count = await prisma.product.count()
  const candidate = `PRD-${String(count + 1).padStart(4, "0")}`
  // Filet de sécurité si jamais la référence existe déjà (produit supprimé entre-temps, etc.)
  const exists = await prisma.product.findUnique({ where: { reference: candidate } })
  return exists ? `PRD-${Date.now().toString(36).toUpperCase()}` : candidate
}

export async function createProduct(formData: FormData) {
  const data = parseProduct(formData)
  const managerIds = formData.getAll("managerIds").map(String).filter(Boolean)
  const reference = await generateReference()
  const { id: userId, role } = await currentUserIdAndRole()

  if (role !== "ADMIN") throw new Error("Seul un administrateur peut créer un produit.")

  const product = await prisma.product.create({
    data: {
      ...data,
      buyPrice: data.buyPrice ?? 0,
      reference,
      managers: { create: managerIds.map((userId) => ({ userId })) },
    },
  })
  await logActivity("Produit créé", "Produits", `${product.name} (${product.reference})`)
  revalidatePath("/produits")
}

export async function assignProductManagers(productId: string, userIds: string[]) {
  const { role } = await currentUserIdAndRole()
  if (role !== "ADMIN") throw new Error("Seul un administrateur peut modifier les magasiniers d'un produit.")

  await prisma.$transaction([
    prisma.productManager.deleteMany({ where: { productId } }),
    prisma.productManager.createMany({ data: userIds.map((userId) => ({ productId, userId })) }),
  ])
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (product) await logActivity("Magasiniers réaffectés", "Produits", `${product.name} (${product.reference})`)
  revalidatePath("/produits")
}

export async function updateProduct(id: string, formData: FormData) {
  const data = parseProduct(formData)
  const managerIds = formData.getAll("managerIds").map(String).filter(Boolean)
  const { role } = await currentUserIdAndRole()

  if (role !== "ADMIN") throw new Error("Seul un administrateur peut modifier un produit.")

  const product = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({ where: { id }, data })
    await tx.productManager.deleteMany({ where: { productId: id } })
    if (managerIds.length > 0) {
      await tx.productManager.createMany({ data: managerIds.map((userId) => ({ productId: id, userId })) })
    }
    return updated
  })
  await logActivity("Produit modifié", "Produits", `${product.name} (${product.reference})`)
  revalidatePath("/produits")
}

export async function toggleProductActive(id: string, active: boolean) {
  const { role } = await currentUserIdAndRole()
  if (role !== "ADMIN") throw new Error("Seul un administrateur peut activer ou désactiver un produit.")

  const product = await prisma.product.update({ where: { id }, data: { active } })
  await logActivity(active ? "Produit activé" : "Produit désactivé", "Produits", `${product.name} (${product.reference})`)
  revalidatePath("/produits")
}

export async function deleteProduct(id: string) {
  const { role } = await currentUserIdAndRole()
  if (role !== "ADMIN") {
    throw new Error("Seul un administrateur peut supprimer un produit.")
  }
  try {
    const product = await prisma.product.delete({ where: { id } })
    await logActivity("Produit supprimé", "Produits", `${product.name} (${product.reference})`)
  } catch (error: any) {
    throw asFriendlyDeleteError(error, "ce produit", "il a des mouvements de stock enregistrés (entrées, sorties, inventaires). Désactive-le plutôt (bouton toggle dans le tableau) pour le masquer sans perdre l'historique.")
  }
  revalidatePath("/produits")
}

export async function createCategory(name: string) {
  const { role } = await currentUserIdAndRole()
  if (role !== "ADMIN") throw new Error("Seul un administrateur peut créer une catégorie.")

  await prisma.category.create({ data: { name } })
  await logActivity("Catégorie créée", "Produits", name)
  revalidatePath("/produits")
}

export async function deleteCategory(id: string) {
  const { role } = await currentUserIdAndRole()
  if (role !== "ADMIN") throw new Error("Seul un administrateur peut supprimer une catégorie.")

  const category = await prisma.category.findUnique({ where: { id } })
  try {
    await prisma.category.delete({ where: { id } })
    if (category) await logActivity("Catégorie supprimée", "Produits", category.name)
  } catch (error: any) {
    throw asFriendlyDeleteError(error, "cette catégorie", "des produits y sont encore rattachés. Change la catégorie de ces produits avant de la supprimer.")
  }
  revalidatePath("/produits")
}
