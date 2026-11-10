import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding...")

  // Nettoyage complet (dans l'ordre des dépendances) pour permettre de relancer le seed plusieurs fois
  await prisma.activityLog.deleteMany()
  await prisma.inventoryCount.deleteMany()
  await prisma.movement.deleteMany()
  await prisma.stock.deleteMany()
  await prisma.productManager.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.supplier.deleteMany()
  // Casse la dépendance circulaire User <-> Warehouse avant de supprimer les deux tables
  await prisma.user.updateMany({ data: { warehouseId: null } })
  await prisma.warehouse.updateMany({ data: { managerId: null } })
  await prisma.user.deleteMany()
  await prisma.warehouse.deleteMany()
  await prisma.company.deleteMany()
  await prisma.unit.deleteMany()

  await prisma.company.create({
    data: {
      name: "Quincaillerie StockFlow",
      address: "Zone industrielle, Cotonou, Bénin",
      phone: "+229 01 57 77 77 77",
      email: "contact@stockflow.bj",
      currency: "XOF",
    },
  })

  const passwordHash = await bcrypt.hash("password123", 10)

  const admin = await prisma.user.create({ data: { name: "Alex Lambert", username: "admin", passwordHash, role: "ADMIN" } })
  const manager = await prisma.user.create({ data: { name: "Sophie Martin", username: "gestionnaire", passwordHash, role: "MANAGER" } })
  const storekeeper = await prisma.user.create({ data: { name: "Marc Dupont", username: "magasinier", passwordHash, role: "STOREKEEPER" } })
  await prisma.user.create({ data: { name: "Julie Renaud", username: "auditeur", passwordHash, role: "AUDITOR" } })

  const cotonou = await prisma.warehouse.create({ data: { name: "Cotonou – Dépôt Central", address: "Zone industrielle, Cotonou", capacity: 3000 } })
  const parakou = await prisma.warehouse.create({ data: { name: "Parakou – Dépôt Nord", address: "Route de Kandi, Parakou", capacity: 1500 } })
  const porto = await prisma.warehouse.create({ data: { name: "Porto-Novo – Dépôt Est", address: "Quartier Houinmè, Porto-Novo", capacity: 900 } })

  // Catégories typiques d'une quincaillerie béninoise
  const [fer, pointes, filDeFer, cimentMateriaux, peintureDroguerie, plomberie, electricite, quincaillerieGenerale] = await Promise.all(
    ["Fer & Rebar", "Pointes & Clous", "Fil de fer", "Ciment & Matériaux", "Peinture & Droguerie", "Plomberie", "Électricité", "Quincaillerie générale"]
      .map((name) => prisma.category.create({ data: { name } }))
  )

  const cimBenin = await prisma.supplier.create({ data: { name: "CIM Bénin SA", contactName: "Kokou Assogba", phone: "+229 21 30 12 34", email: "commandes@cimbenin.bj" } })
  const quincaGros = await prisma.supplier.create({ data: { name: "Quinca-Gros Import", contactName: "Fatima Baldé", phone: "+229 97 45 67 89", email: "contact@quincagros.bj" } })

  const products = await Promise.all([
    prisma.product.create({ data: { name: "Fer à béton 8mm (barre 12m)", reference: "PRD-0001", categoryId: fer.id, supplierId: quincaGros.id, unit: "barre", buyPrice: 4200, sellPrice: 5500, minQty: 30 } }),
    prisma.product.create({ data: { name: "Fer à béton 10mm (barre 12m)", reference: "PRD-0002", categoryId: fer.id, supplierId: quincaGros.id, unit: "barre", buyPrice: 6500, sellPrice: 8200, minQty: 20 } }),
    prisma.product.create({ data: { name: "Fer à béton 12mm (barre 12m)", reference: "PRD-0003", categoryId: fer.id, supplierId: quincaGros.id, unit: "barre", buyPrice: 9200, sellPrice: 11500, minQty: 15 } }),
    prisma.product.create({ data: { name: "Pointes 4cm", reference: "PRD-0004", categoryId: pointes.id, supplierId: quincaGros.id, unit: "kg", buyPrice: 650, sellPrice: 900, minQty: 40 } }),
    prisma.product.create({ data: { name: "Pointes 8cm", reference: "PRD-0005", categoryId: pointes.id, supplierId: quincaGros.id, unit: "kg", buyPrice: 700, sellPrice: 950, minQty: 40 } }),
    prisma.product.create({ data: { name: "Fil de fer recuit", reference: "PRD-0006", categoryId: filDeFer.id, supplierId: quincaGros.id, unit: "kg", buyPrice: 800, sellPrice: 1100, minQty: 25 } }),
    prisma.product.create({ data: { name: "Fil de fer barbelé (rouleau)", reference: "PRD-0007", categoryId: filDeFer.id, supplierId: quincaGros.id, unit: "rouleau", buyPrice: 15000, sellPrice: 19500, minQty: 8 } }),
    prisma.product.create({ data: { name: "Ciment CIM Bénin 50kg", reference: "PRD-0008", categoryId: cimentMateriaux.id, supplierId: cimBenin.id, unit: "sac", buyPrice: 4300, sellPrice: 4800, minQty: 50 } }),
    prisma.product.create({ data: { name: "Tôle bac aluminium 2m", reference: "PRD-0009", categoryId: cimentMateriaux.id, supplierId: cimBenin.id, unit: "feuille", buyPrice: 5200, sellPrice: 6500, minQty: 20 } }),
    prisma.product.create({ data: { name: "Peinture à l'eau blanche 20L", reference: "PRD-0010", categoryId: peintureDroguerie.id, supplierId: quincaGros.id, unit: "pot", buyPrice: 18500, sellPrice: 23000, minQty: 6 } }),
    prisma.product.create({ data: { name: "Tuyau PVC évacuation Ø110 (4m)", reference: "PRD-0011", categoryId: plomberie.id, supplierId: cimBenin.id, unit: "unité", buyPrice: 6800, sellPrice: 8900, minQty: 10 } }),
    prisma.product.create({ data: { name: "Robinet mitigeur évier", reference: "PRD-0012", categoryId: plomberie.id, supplierId: quincaGros.id, unit: "unité", buyPrice: 9500, sellPrice: 14500, minQty: 6 } }),
    prisma.product.create({ data: { name: "Câble électrique 2.5mm² (rouleau 100m)", reference: "PRD-0013", categoryId: electricite.id, supplierId: quincaGros.id, unit: "rouleau", buyPrice: 32000, sellPrice: 39500, minQty: 5 } }),
    prisma.product.create({ data: { name: "Interrupteur simple", reference: "PRD-0014", categoryId: electricite.id, supplierId: quincaGros.id, unit: "unité", buyPrice: 900, sellPrice: 1500, minQty: 25 } }),
    prisma.product.create({ data: { name: "Cadenas laiton 50mm", reference: "PRD-0015", categoryId: quincaillerieGenerale.id, supplierId: quincaGros.id, unit: "unité", buyPrice: 2200, sellPrice: 3200, minQty: 20 } }),
  ])

  // Stocks initiaux répartis sur les entrepôts
  const stockSeed: { productIdx: number; warehouseId: string; qty: number }[] = [
    { productIdx: 0, warehouseId: cotonou.id, qty: 180 },
    { productIdx: 1, warehouseId: cotonou.id, qty: 95 },
    { productIdx: 2, warehouseId: cotonou.id, qty: 12 },   // alerte
    { productIdx: 3, warehouseId: cotonou.id, qty: 220 },
    { productIdx: 4, warehouseId: parakou.id, qty: 150 },
    { productIdx: 5, warehouseId: cotonou.id, qty: 8 },    // critique
    { productIdx: 6, warehouseId: cotonou.id, qty: 22 },
    { productIdx: 7, warehouseId: cotonou.id, qty: 340 },
    { productIdx: 8, warehouseId: parakou.id, qty: 65 },
    { productIdx: 9, warehouseId: cotonou.id, qty: 4 },    // critique
    { productIdx: 10, warehouseId: porto.id, qty: 28 },
    { productIdx: 11, warehouseId: porto.id, qty: 5 },     // alerte
    { productIdx: 12, warehouseId: cotonou.id, qty: 3 },   // critique
    { productIdx: 13, warehouseId: cotonou.id, qty: 60 },
    { productIdx: 14, warehouseId: porto.id, qty: 35 },
  ]
  for (const s of stockSeed) {
    await prisma.stock.create({ data: { productId: products[s.productIdx].id, warehouseId: s.warehouseId, quantity: s.qty, condition: "GOOD" } })
  }
  // Un peu de stock défectueux pour la démo
  await prisma.stock.create({ data: { productId: products[8].id, warehouseId: cotonou.id, quantity: 6, condition: "DEFECTIVE" } })

  // Le magasinier est rattaché au dépôt de Cotonou, et en devient le responsable
  await prisma.user.update({ where: { id: storekeeper.id }, data: { warehouseId: cotonou.id } })
  await prisma.warehouse.update({ where: { id: cotonou.id }, data: { managerId: storekeeper.id } })

  await prisma.movement.create({ data: { type: "IN", productId: products[0].id, warehouseId: cotonou.id, quantity: 50, userId: storekeeper.id, reason: "Bon de livraison BL-8821" } })
  await prisma.movement.create({ data: { type: "OUT", productId: products[3].id, warehouseId: cotonou.id, quantity: 30, userId: manager.id, reason: "Vente commande #4521" } })
  await prisma.movement.create({ data: { type: "DEFECTIVE", productId: products[8].id, warehouseId: cotonou.id, quantity: 6, userId: storekeeper.id, reason: "Tôles pliées pendant le transport" } })

  await prisma.activityLog.create({ data: { userId: admin.id, action: "Entreprise configurée", module: "Paramètres", detail: "Configuration initiale" } })

  console.log("Seed terminé.")
  console.log("Comptes de test (mot de passe: password123) :")
  console.log("  admin         (Admin)")
  console.log("  gestionnaire  (Gestionnaire)")
  console.log("  magasinier    (Magasinier)")
  console.log("  auditeur      (Auditeur)")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
