"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { logActivity } from "@/lib/logActivity"

export async function changeOwnPassword(formData: FormData) {
  const session = await auth()
  const userId = (session?.user as any)?.id
  if (!userId) throw new Error("Non authentifié")

  const currentPassword = String(formData.get("currentPassword") || "")
  const newPassword = String(formData.get("newPassword") || "")
  const confirmPassword = String(formData.get("confirmPassword") || "")

  if (newPassword.length < 6) {
    throw new Error("Le nouveau mot de passe doit contenir au moins 6 caractères.")
  }
  if (newPassword !== confirmPassword) {
    throw new Error("La confirmation ne correspond pas au nouveau mot de passe.")
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("Utilisateur introuvable.")

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) throw new Error("Mot de passe actuel incorrect.")

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  await logActivity("Mot de passe modifié", "Compte", user.name)

  return { success: true }
}
