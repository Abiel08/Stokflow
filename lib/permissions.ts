import type { Role } from "@prisma/client"

// Modules de l'application, utilisés pour le contrôle d'accès
export type ModulePermission =
  | "dashboard"
  | "stock.read"
  | "stock.write"            // entrée / sortie / transfert
  | "stock.defective"        // déclarer / restaurer / mettre au rebut du stock défectueux
  | "stock.inventory.submit" // faire un comptage d'inventaire (soumission, en attente)
  | "stock.inventory.validate" // valider/rejeter un comptage d'inventaire (applique le stock)
  | "products.write"
  | "products.buyPrice"       // voir/modifier le prix d'achat (coût), réservé Admin
  | "suppliers"
  | "warehouses.read"         // voir les entrepôts (lecture)
  | "warehouses.write"        // créer/modifier/supprimer des entrepôts
  | "reports"
  | "users"
  | "logs"
  | "settings"

// Matrice des permissions (reprend la matrice définie dans la maquette)
const MATRIX: Record<Role, ModulePermission[]> = {
  ADMIN: [
    "dashboard", "stock.read", "stock.write", "stock.defective",
    "stock.inventory.submit", "stock.inventory.validate",
    "products.write", "products.buyPrice", "suppliers", "warehouses.read", "warehouses.write", "reports",
    "users", "logs", "settings",
  ],
  MANAGER: [
    "dashboard", "stock.read", "stock.write", "stock.defective",
    "stock.inventory.submit",
    "warehouses.read", "reports",
    // produits / fournisseurs / entrepôts (écriture) : réservé ADMIN
  ],
  STOREKEEPER: [
    "dashboard", "stock.read", "stock.write", "stock.defective", "stock.inventory.submit",
    "warehouses.read",  // lecture seule de son propre entrepôt
    // produits (écriture) : réservé ADMIN
  ],
  AUDITOR: [
    "dashboard", "stock.read", "reports", "logs",
  ],
}

export function can(role: Role, permission: ModulePermission): boolean {
  return MATRIX[role]?.includes(permission) ?? false
}

// Routes protégées (préfixe) -> permission requise
export const ROUTE_PERMISSIONS: { prefix: string; permission: ModulePermission }[] = [
  { prefix: "/dashboard", permission: "dashboard" },
  { prefix: "/stock", permission: "stock.read" },
  { prefix: "/produits", permission: "stock.read" },
  { prefix: "/fournisseurs", permission: "suppliers" },
  { prefix: "/entrepots", permission: "warehouses.read" },
  { prefix: "/rapports", permission: "reports" },
  { prefix: "/utilisateurs", permission: "users" },
  { prefix: "/logs", permission: "logs" },
  { prefix: "/parametres", permission: "settings" },
]
