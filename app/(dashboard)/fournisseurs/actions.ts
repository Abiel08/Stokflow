"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { logActivity } from "@/lib/logActivity"

import { z } from "zod"

const supplierSchema = z.object({
  name: z.string().min(1, "Le nom de l'entreprise est obligatoire."),
  contactName: z.string().optional(),
  phone: z.string().min(1, "Le téléphone est obligatoire."),
  email: z.string().min(1, "L'email est obligatoire.").email("L'email n'est pas valide."),
  address: z.string().optional(),
})

function parseSupplier(formData: FormData) {
  const result = supplierSchema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Les informations saisies ne sont pas valides.")
  }
  return result.data
}

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (role !== "ADMIN") throw new Error("Seul un administrateur peut gérer les fournisseurs.")
}

export async function createSupplier(formData: FormData) {
  await requireAdmin()
  const data = parseSupplier(formData)
  const supplier = await prisma.supplier.create({
    data: {
      name: data.name,
      contactName: data.contactName || "",
      phone: data.phone,
      email: data.email,
      address: data.address || "",
    },
  })
  await logActivity("Fournisseur créé", "Fournisseurs", supplier.name)
  revalidatePath("/fournisseurs")
}

export async function updateSupplier(id: string, formData: FormData) {
  await requireAdmin()
  const data = parseSupplier(formData)
  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name: data.name,
      contactName: data.contactName || "",
      phone: data.phone,
      email: data.email,
      address: data.address || "",
    },
  })
  await logActivity("Fournisseur modifié", "Fournisseurs", supplier.name)
  revalidatePath("/fournisseurs")
}

import { asFriendlyDeleteError } from "@/lib/deleteErrors"

export async function deleteSupplier(id: string) {
  await requireAdmin()
  const supplier = await prisma.supplier.findUnique({ where: { id } })
  try {
    await prisma.supplier.delete({ where: { id } })
    if (supplier) await logActivity("Fournisseur supprimé", "Fournisseurs", supplier.name)
  } catch (error: any) {
    throw asFriendlyDeleteError(error, "ce fournisseur", "il fournit encore des produits enregistrés dans le catalogue. Retire-le comme fournisseur de ces produits (ou change leur fournisseur) avant de le supprimer.")
  }
  revalidatePath("/fournisseurs")
}
