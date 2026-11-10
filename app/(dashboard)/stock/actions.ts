"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { StockCondition } from "@prisma/client"

async function currentUser() {
  const session = await auth()
  const user = session?.user as any
  if (!user?.id) throw new Error("Non authentifié")
  return user as { id: string; role: string }
}

async function upsertStock(productId: string, warehouseId: string, delta: number, condition: StockCondition = "GOOD") {
  const existing = await prisma.stock.findUnique({
    where: { productId_warehouseId_condition: { productId, warehouseId, condition } },
  })
  if (existing) {
    await prisma.stock.update({ where: { id: existing.id }, data: { quantity: Math.max(0, existing.quantity + delta) } })
  } else {
    await prisma.stock.create({ data: { productId, warehouseId, condition, quantity: Math.max(delta, 0) } })
  }
}

const movementSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.coerce.number().min(1),
  reason: z.string().optional(),
  reference: z.string().optional(),
})

export async function createInMovement(formData: FormData) {
  const data = movementSchema.parse(Object.fromEntries(formData))
  const user = await currentUser()

  await prisma.movement.create({ data: { ...data, type: "IN", userId: user.id } })
  await upsertStock(data.productId, data.warehouseId, data.quantity)
  await prisma.activityLog.create({ data: { userId: user.id, action: "Entrée de stock", module: "Stock", detail: `Quantité ${data.quantity}` } })
  revalidatePath("/stock")
  revalidatePath("/dashboard")
}

export async function createOutMovement(formData: FormData) {
  const data = movementSchema.parse(Object.fromEntries(formData))
  const user = await currentUser()

  const stock = await prisma.stock.findUnique({
    where: { productId_warehouseId_condition: { productId: data.productId, warehouseId: data.warehouseId, condition: "GOOD" } },
  })
  const available = stock?.quantity ?? 0
  if (data.quantity > available) {
    throw new Error(`Quantité insuffisante : seulement ${available} en stock à cet entrepôt.`)
  }

  await prisma.movement.create({ data: { ...data, type: "OUT", userId: user.id } })
  await upsertStock(data.productId, data.warehouseId, -data.quantity)
  await prisma.activityLog.create({ data: { userId: user.id, action: "Sortie de stock", module: "Stock", detail: `Quantité ${data.quantity}` } })
  revalidatePath("/stock")
  revalidatePath("/dashboard")
}

const transferSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  destWarehouseId: z.string().min(1),
  quantity: z.coerce.number().min(1),
  reason: z.string().optional(),
})

export async function createTransfer(formData: FormData) {
  const data = transferSchema.parse(Object.fromEntries(formData))
  const user = await currentUser()

  const stock = await prisma.stock.findUnique({
    where: { productId_warehouseId_condition: { productId: data.productId, warehouseId: data.warehouseId, condition: "GOOD" } },
  })
  const available = stock?.quantity ?? 0
  if (data.quantity > available) {
    throw new Error(`Quantité insuffisante : seulement ${available} en stock dans l'entrepôt source.`)
  }

  await prisma.movement.create({ data: { ...data, type: "TRANSFER", userId: user.id } })
  await upsertStock(data.productId, data.warehouseId, -data.quantity)
  await upsertStock(data.productId, data.destWarehouseId, data.quantity)
  await prisma.activityLog.create({ data: { userId: user.id, action: "Transfert", module: "Stock", detail: `Quantité ${data.quantity}` } })
  revalidatePath("/stock")
  revalidatePath("/dashboard")
}

const defectiveSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.coerce.number().min(1),
  reason: z.string().optional(),
})

export async function declareDefective(formData: FormData) {
  const data = defectiveSchema.parse(Object.fromEntries(formData))
  const user = await currentUser()

  const goodStock = await prisma.stock.findUnique({
    where: { productId_warehouseId_condition: { productId: data.productId, warehouseId: data.warehouseId, condition: "GOOD" } },
  })
  if (!goodStock || goodStock.quantity < data.quantity) {
    throw new Error("Quantité en bon état insuffisante pour déclarer ce stock défectueux.")
  }

  await prisma.movement.create({ data: { ...data, type: "DEFECTIVE", userId: user.id } })
  await upsertStock(data.productId, data.warehouseId, -data.quantity, "GOOD")
  await upsertStock(data.productId, data.warehouseId, data.quantity, "DEFECTIVE")
  await prisma.activityLog.create({ data: { userId: user.id, action: "Stock déclaré défectueux", module: "Stock", detail: `Quantité ${data.quantity}${data.reason ? " — " + data.reason : ""}` } })
  revalidatePath("/stock")
  revalidatePath("/dashboard")
}

export async function restoreDefective(formData: FormData) {
  const data = defectiveSchema.parse(Object.fromEntries(formData))
  const user = await currentUser()

  const defectiveStock = await prisma.stock.findUnique({
    where: { productId_warehouseId_condition: { productId: data.productId, warehouseId: data.warehouseId, condition: "DEFECTIVE" } },
  })
  if (!defectiveStock || defectiveStock.quantity < data.quantity) {
    throw new Error("Quantité défectueuse insuffisante pour cette restauration.")
  }

  await prisma.movement.create({ data: { ...data, type: "RESTORE", userId: user.id } })
  await upsertStock(data.productId, data.warehouseId, -data.quantity, "DEFECTIVE")
  await upsertStock(data.productId, data.warehouseId, data.quantity, "GOOD")
  await prisma.activityLog.create({ data: { userId: user.id, action: "Stock restauré en bon état", module: "Stock", detail: `Quantité ${data.quantity}` } })
  revalidatePath("/stock")
  revalidatePath("/dashboard")
}

export async function scrapDefective(formData: FormData) {
  const data = defectiveSchema.parse(Object.fromEntries(formData))
  const user = await currentUser()

  const defectiveStock = await prisma.stock.findUnique({
    where: { productId_warehouseId_condition: { productId: data.productId, warehouseId: data.warehouseId, condition: "DEFECTIVE" } },
  })
  if (!defectiveStock || defectiveStock.quantity < data.quantity) {
    throw new Error("Quantité défectueuse insuffisante pour cette mise au rebut.")
  }

  await prisma.movement.create({ data: { ...data, type: "SCRAP", userId: user.id } })
  await upsertStock(data.productId, data.warehouseId, -data.quantity, "DEFECTIVE")
  await prisma.activityLog.create({ data: { userId: user.id, action: "Stock défectueux mis au rebut", module: "Stock", detail: `Quantité ${data.quantity}${data.reason ? " — " + data.reason : ""}` } })
  revalidatePath("/stock")
  revalidatePath("/dashboard")
}

const sellDefectiveSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
  reason: z.string().optional(),
})

// Vend directement le stock défectueux à un prix réduit (récupération partielle, pas un retour au stock bon état)
export async function sellDefective(formData: FormData) {
  const data = sellDefectiveSchema.parse(Object.fromEntries(formData))
  const user = await currentUser()

  const defectiveStock = await prisma.stock.findUnique({
    where: { productId_warehouseId_condition: { productId: data.productId, warehouseId: data.warehouseId, condition: "DEFECTIVE" } },
  })
  if (!defectiveStock || defectiveStock.quantity < data.quantity) {
    throw new Error("Quantité défectueuse insuffisante pour cette vente.")
  }

  await prisma.movement.create({ data: { ...data, type: "SELL_DEFECTIVE", userId: user.id } })
  await upsertStock(data.productId, data.warehouseId, -data.quantity, "DEFECTIVE")
  await prisma.activityLog.create({
    data: { userId: user.id, action: "Stock défectueux vendu à prix réduit", module: "Stock", detail: `Quantité ${data.quantity} à ${data.unitPrice}/unité${data.reason ? " — " + data.reason : ""}` },
  })
  revalidatePath("/stock")
  revalidatePath("/dashboard")
  revalidatePath("/rapports")
}

export async function submitInventoryCount(productId: string, warehouseId: string, countedQty: number) {
  const user = await currentUser()
  const stock = await prisma.stock.findUnique({
    where: { productId_warehouseId_condition: { productId, warehouseId, condition: "GOOD" } },
  })
  const theoreticalQty = stock?.quantity ?? 0
  const difference = countedQty - theoreticalQty

  await prisma.inventoryCount.create({
    data: { productId, warehouseId, theoreticalQty, countedQty, difference, submittedById: user.id },
  })
  await prisma.activityLog.create({ data: { userId: user.id, action: "Inventaire soumis (en attente de validation)", module: "Stock", detail: `Écart déclaré : ${difference > 0 ? "+" : ""}${difference}` } })
  revalidatePath("/stock")
}

export async function validateInventoryCount(inventoryCountId: string) {
  const user = await currentUser()
  if (user.role !== "ADMIN") throw new Error("Seul un administrateur peut valider un inventaire.")

  const count = await prisma.inventoryCount.findUnique({ where: { id: inventoryCountId } })
  if (!count) throw new Error("Inventaire introuvable.")
  if (count.validatedAt) throw new Error("Cet inventaire a déjà été traité.")

  await upsertStock(count.productId, count.warehouseId, count.difference, "GOOD")
  await prisma.inventoryCount.update({
    where: { id: inventoryCountId },
    data: { validatedById: user.id, validatedAt: new Date() },
  })
  await prisma.activityLog.create({ data: { userId: user.id, action: "Inventaire validé", module: "Stock", detail: `Écart appliqué : ${count.difference > 0 ? "+" : ""}${count.difference}` } })
  revalidatePath("/stock")
  revalidatePath("/dashboard")
}

export async function rejectInventoryCount(inventoryCountId: string) {
  const user = await currentUser()
  if (user.role !== "ADMIN") throw new Error("Seul un administrateur peut rejeter un inventaire.")

  await prisma.inventoryCount.delete({ where: { id: inventoryCountId } })
  await prisma.activityLog.create({ data: { userId: user.id, action: "Inventaire rejeté", module: "Stock", detail: "Comptage écarté, stock inchangé" } })
  revalidatePath("/stock")
}
