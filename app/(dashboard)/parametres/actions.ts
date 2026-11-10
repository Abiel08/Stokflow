"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { convertAmount } from "@/lib/exchangeRates"
import { logActivity } from "@/lib/logActivity"

async function convertAllPricesIfCurrencyChanged(oldCurrency: string, newCurrency: string) {
  if (oldCurrency === newCurrency) return
  const products = await prisma.product.findMany()
  await prisma.$transaction(
    products.map((p) =>
      prisma.product.update({
        where: { id: p.id },
        data: {
          buyPrice: Math.round(convertAmount(Number(p.buyPrice), oldCurrency, newCurrency) * 100) / 100,
          sellPrice: Math.round(convertAmount(Number(p.sellPrice), oldCurrency, newCurrency) * 100) / 100,
        },
      })
    )
  )
}

export async function updateCompanySettings(formData: FormData) {
  const existing = await prisma.company.findFirst()
  const data = {
    name: String(formData.get("name")),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    address: String(formData.get("address") || ""),
    currency: String(formData.get("currency") || "EUR"),
    dateFormat: String(formData.get("dateFormat") || "DD/MM/YYYY"),
  }

  if (existing) {
    await prisma.company.update({ where: { id: existing.id }, data })
  } else {
    await prisma.company.create({ data })
  }
  await logActivity("Informations entreprise modifiées", "Paramètres", data.name)
  revalidatePath("/parametres")
}

export async function updateTaxSettings(formData: FormData) {
  const existing = await prisma.company.findFirst()
  const newCurrency = String(formData.get("currency") || "EUR")
  const data = {
    currency: newCurrency,
    taxRate: Number(formData.get("taxRate") || 0),
  }

  if (existing) {
    await convertAllPricesIfCurrencyChanged(existing.currency, newCurrency)
    await prisma.company.update({ where: { id: existing.id }, data })
  } else {
    await prisma.company.create({ data: { name: "Mon entreprise", ...data } })
  }
  await logActivity("Devise / TVA modifiées", "Paramètres", `Devise: ${newCurrency}, TVA: ${data.taxRate}%`)
  revalidatePath("/parametres")
  revalidatePath("/produits")
  revalidatePath("/dashboard")
}

export async function updateNotificationSettings(formData: FormData) {
  const existing = await prisma.company.findFirst()
  const data = {
    notifyLowStockEmail: formData.get("notifyLowStockEmail") === "on",
    notifyLowStockInApp: formData.get("notifyLowStockInApp") === "on",
  }
  if (existing) {
    await prisma.company.update({ where: { id: existing.id }, data })
  } else {
    await prisma.company.create({ data: { name: "Mon entreprise", ...data } })
  }
  await logActivity("Préférences de notification modifiées", "Paramètres", `Email: ${data.notifyLowStockEmail ? "oui" : "non"}, In-app: ${data.notifyLowStockInApp ? "oui" : "non"}`)
  revalidatePath("/parametres")
}

export async function createUnit(formData: FormData) {
  const name = String(formData.get("name") || "").trim()
  if (!name) return
  await prisma.unit.create({ data: { name } })
  await logActivity("Unité de mesure créée", "Paramètres", name)
  revalidatePath("/parametres")
}

export async function deleteUnit(id: string) {
  const unit = await prisma.unit.findUnique({ where: { id } })
  await prisma.unit.delete({ where: { id } })
  if (unit) await logActivity("Unité de mesure supprimée", "Paramètres", unit.name)
  revalidatePath("/parametres")
}
